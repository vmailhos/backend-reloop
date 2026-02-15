jest.mock("../../src/config/s3", () => ({
  upload: () => ({
    promise: () => Promise.resolve(),
  }),
}));

const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../../src/app");
const {
  prisma,
  resetDatabase,
  createUser,
  createListing,
  makeAuthHeader,
} = require("../testUtils");

describe("Security tests", () => {
  beforeAll(() => {
    process.env.AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || "test-bucket";
    process.env.AWS_REGION = process.env.AWS_REGION || "us-east-1";
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("SEC-01: protected endpoint without token returns 401", async () => {
    const res = await request(app).get("/users/get");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "missing_token" });
  });

  test("SEC-02: invalid token is rejected with 401", async () => {
    const res = await request(app)
      .get("/users/get")
      .set("Authorization", "Bearer invalid.token.here");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_token");
  });

  test("SEC-03: user A cannot update listing owned by user B", async () => {
    const seller = await createUser({ index: 1 });
    const attacker = await createUser({ index: 2 });
    const listing = await createListing({ sellerId: seller.id });

    const res = await request(app)
      .patch(`/listings/update/${listing.id}`)
      .set("Authorization", makeAuthHeader(attacker))
      .send({ title: "Hacked" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "forbidden" });
  });

  test("SEC-03: user A cannot delete listing owned by user B", async () => {
    const seller = await createUser({ index: 3 });
    const attacker = await createUser({ index: 4 });
    const listing = await createListing({ sellerId: seller.id });

    const res = await request(app)
      .delete(`/listings/delete/${listing.id}`)
      .set("Authorization", makeAuthHeader(attacker));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "forbidden" });
  });

  test("SEC-05: basic XSS payload is rejected by input validation", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({
        email: "xssuser@example.com",
        username: "<script>alert(1)</script>",
        password: "Password123!",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  test("SEC-06: SQL injection attempt in query params does not leak data", async () => {
    const seller = await createUser({ index: 5 });
    await createListing({ sellerId: seller.id, overrides: { title: "Safe Item" } });

    const res = await request(app)
      .get("/listings/all")
      .query({ search: "' OR 1=1 --" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBe(0);
  });

  test("SEC-07: authentication responses do not include password hash", async () => {
    const hashedPassword = await bcrypt.hash("Password123!", 10);
    await prisma.user.create({
      data: {
        email: "safeuser@example.com",
        username: "safeuser",
        password: hashedPassword,
      },
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ identifier: "safeuser", password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty("password");
  });

  test("SEC-08: CORS allows configured origins", async () => {
    const origin = "http://localhost:3000";
    const res = await request(app).get("/health").set("Origin", origin);

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  test("SEC-10: upload size limit rejects oversized payloads", async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, "a");

    const res = await request(app)
      .post("/uploads")
      .attach("image", bigBuffer, {
        filename: "big.jpg",
        contentType: "image/jpeg",
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(200);
  });

  test.todo("SEC-04: rate limiting is enforced on burst requests");
  test.todo("SEC-09: role escalation is ignored in payloads");
});
