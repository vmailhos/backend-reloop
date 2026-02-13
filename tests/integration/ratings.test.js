const request = require("supertest");
const app = require("../../src/app");
const {
  prisma,
  makeAuthHeader,
  resetDatabase,
  createUser,
} = require("../testUtils");

describe("Ratings integration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("Should create rating", async () => {
    const seller = await createUser();
    const buyer = await createUser();

    const res = await request(app)
      .post("/ratings")
      .set("Authorization", makeAuthHeader(buyer))
      .send({ targetId: seller.id, value: 5, comment: "Excelente" });

    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
  });

  test("Should notify seller", async () => {
    const seller = await createUser();
    const buyer = await createUser();

    await request(app)
      .post("/ratings")
      .set("Authorization", makeAuthHeader(buyer))
      .send({ targetId: seller.id, value: 5, comment: "Excelente" });

    const notifications = await prisma.notification.findMany({
      where: { userId: seller.id, type: "NEW_RATING" },
    });

    expect(notifications.length).toBe(1);
  });
});
