// tests/integration/protected-routes.test.js
// Integration tests for protected routes and authorization

const request = require("supertest");
const app = require("../../src/app");
const { prisma, resetDatabase, createUser, makeAuthHeader } = require("../testUtils");

describe("Protected Routes Integration", () => {
  let user;
  let authHeader;

  beforeEach(async () => {
    await resetDatabase();
    user = await createUser({ index: 1 });
    authHeader = makeAuthHeader(user);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Routes without authentication", () => {
    const protectedEndpoints = [
      { method: "post", path: "/favorites/test-id", data: {}, errorMsg: "missing_token" },
      { method: "post", path: "/orders", data: {}, errorMsg: "missing_token" },
      { method: "get", path: "/notifications", data: null, errorMsg: "missing_token" },
    ];

    protectedEndpoints.forEach(({ method, path, data, errorMsg }) => {
      it(`should return 401 for ${method.toUpperCase()} ${path} without token`, async () => {
        const req = request(app)[method](path);
        if (data) {
          req.send(data);
        }
        const response = await req.expect(401);
        expect(response.body.error).toBe(errorMsg);
      });
    });

    it("should return 401 with invalid token", async () => {
      const response = await request(app)
        .get("/notifications")
        .set("Authorization", "Bearer invalid.token.here")
        .expect(401);

      expect(response.body.error).toBe("invalid_token");
    });

    it("should return 401 with malformed authorization header", async () => {
      const response = await request(app)
        .get("/notifications")
        .set("Authorization", "InvalidFormat")
        .expect(401);

      expect(response.body.error).toBe("missing_token");
    });
  });

  describe("Routes with valid authentication", () => {
    it("should access notifications with valid token", async () => {
      const response = await request(app)
        .get("/notifications")
        .set("Authorization", authHeader)
        .expect(200);

      // API returns {items, page, pageSize, total}
      expect(response.body).toHaveProperty("items");
      expect(response.body.items).toBeInstanceOf(Array);
    });
  });

  describe("Authorization (not just authentication)", () => {
    let seller;
    let buyer;
    let listing;

    beforeEach(async () => {
      seller = await createUser({ index: 10 });
      buyer = await createUser({ index: 20 });

      listing = await prisma.listing.create({
        data: {
          title: "Seller's Listing",
          price: 100,
          condition: "BUENO",
          category: "UNISEX",
          sellerId: seller.id,
        },
      });
    });

    it("should allow seller to edit their own listing", async () => {
      const sellerAuth = makeAuthHeader(seller);

      const response = await request(app)
        .patch(`/listings/update/${listing.id}`)
        .set("Authorization", sellerAuth)
        .send({ title: "Updated by Seller" })
        .expect(200);

      expect(response.body.title).toBe("Updated by Seller");
    });

    // NOTE: Listing CRUD endpoints (POST/PATCH/DELETE /listings) are tested
    // in other test files. These tests verify general auth patterns.
  });
});
