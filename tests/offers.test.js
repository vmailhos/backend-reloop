jest.mock("../src/email/sendOfferEmailToSeller", () => ({
  sendOfferEmailToSeller: jest.fn().mockResolvedValue(undefined),
}));

const request = require("supertest");
const app = require("../src/app");
const {
  prisma,
  makeAuthHeader,
  resetDatabase,
  createUser,
  createListing,
} = require("./testUtils");

describe("Offers integration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("Should create offer", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    const res = await request(app)
      .post(`/offers/${listing.id}`)
      .set("Authorization", makeAuthHeader(buyer))
      .send({ amount: 50 });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  test("Should notify seller", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    await request(app)
      .post(`/offers/${listing.id}`)
      .set("Authorization", makeAuthHeader(buyer))
      .send({ amount: 50 });

    const notifications = await prisma.notification.findMany({
      where: { userId: seller.id, type: "NEW_OFFER" },
    });

    expect(notifications.length).toBe(1);
  });

  test("Should accept offer and notify buyer", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    const createRes = await request(app)
      .post(`/offers/${listing.id}`)
      .set("Authorization", makeAuthHeader(buyer))
      .send({ amount: 50 });

    const offerId = createRes.body.id;

    const res = await request(app)
      .patch(`/offers/respond/${offerId}`)
      .set("Authorization", makeAuthHeader(seller))
      .send({ status: "ACCEPTED" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ACCEPTED");

    const notifications = await prisma.notification.findMany({
      where: { userId: buyer.id, type: "OFFER_ACCEPTED" },
    });

    expect(notifications.length).toBe(1);
  });

  test("Should reject offer and notify buyer", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    const createRes = await request(app)
      .post(`/offers/${listing.id}`)
      .set("Authorization", makeAuthHeader(buyer))
      .send({ amount: 50 });

    const offerId = createRes.body.id;

    const res = await request(app)
      .patch(`/offers/respond/${offerId}`)
      .set("Authorization", makeAuthHeader(seller))
      .send({ status: "REJECTED" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("REJECTED");

    const notifications = await prisma.notification.findMany({
      where: { userId: buyer.id, type: "OFFER_REJECTED" },
    });

    expect(notifications.length).toBe(1);
  });

  test("Should return 403 for unauthorized user", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const otherUser = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    const createRes = await request(app)
      .post(`/offers/${listing.id}`)
      .set("Authorization", makeAuthHeader(buyer))
      .send({ amount: 50 });

    const offerId = createRes.body.id;

    const res = await request(app)
      .patch(`/offers/respond/${offerId}`)
      .set("Authorization", makeAuthHeader(otherUser))
      .send({ status: "ACCEPTED" });

    expect(res.status).toBe(403);
  });
});
