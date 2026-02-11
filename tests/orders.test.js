jest.mock("../src/email/sendSaleEmailToSeller", () => ({
  sendSaleEmailToSeller: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../src/email/sendPurchaseEmailToBuyer", () => ({
  sendPurchaseEmailToBuyer: jest.fn().mockResolvedValue(undefined),
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

describe("Orders integration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("Should create order successfully", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    const res = await request(app)
      .post("/orders")
      .set("Authorization", makeAuthHeader(buyer))
      .send({
        listingIds: [listing.id],
        shipping: {
          provider: "DAC",
          type: "HOME",
          data: {
            name: "Test",
            lastName: "Buyer",
            phone: "099123123",
            address: {
              street: "Test 123",
              department: "Montevideo",
              locality: "Centro",
            },
          },
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.order).toBeDefined();
    expect(res.body.order.items).toHaveLength(1);
  });

  test("Should create notification for buyer", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    await request(app)
      .post("/orders")
      .set("Authorization", makeAuthHeader(buyer))
      .send({
        listingIds: [listing.id],
        shipping: {
          provider: "DAC",
          type: "HOME",
          data: {
            name: "Test",
            lastName: "Buyer",
            phone: "099123123",
            address: {
              street: "Test 123",
              department: "Montevideo",
              locality: "Centro",
            },
          },
        },
      });

    const notifications = await prisma.notification.findMany({
      where: { userId: buyer.id, type: "PURCHASE_CONFIRMED" },
    });

    expect(notifications.length).toBe(1);
  });

  test("Should create notification for seller", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    await request(app)
      .post("/orders")
      .set("Authorization", makeAuthHeader(buyer))
      .send({
        listingIds: [listing.id],
        shipping: {
          provider: "DAC",
          type: "HOME",
          data: {
            name: "Test",
            lastName: "Buyer",
            phone: "099123123",
            address: {
              street: "Test 123",
              department: "Montevideo",
              locality: "Centro",
            },
          },
        },
      });

    const notifications = await prisma.notification.findMany({
      where: { userId: seller.id, type: "NEW_SALE" },
    });

    expect(notifications.length).toBe(1);
  });

  test("Should return 401 if not authenticated", async () => {
    const seller = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    const res = await request(app)
      .post("/orders")
      .send({
        listingIds: [listing.id],
        shipping: {
          provider: "DAC",
          type: "HOME",
          data: {
            name: "Test",
            lastName: "Buyer",
            phone: "099123123",
            address: {
              street: "Test 123",
              department: "Montevideo",
              locality: "Centro",
            },
          },
        },
      });

    expect(res.status).toBe(401);
  });
});
