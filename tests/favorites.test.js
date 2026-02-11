const request = require("supertest");
const app = require("../src/app");
const {
  prisma,
  makeAuthHeader,
  resetDatabase,
  createUser,
  createListing,
} = require("./testUtils");

describe("Favorites integration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("Should add favorite", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    const res = await request(app)
      .post(`/favorites/${listing.id}`)
      .set("Authorization", makeAuthHeader(buyer));

    expect(res.status).toBe(201);
    expect(res.body.favoriteId).toBeDefined();
  });
});
