jest.mock("../src/email/sendCommentEmailToSeller", () => ({
  sendCommentEmailToSeller: jest.fn().mockResolvedValue(undefined),
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

describe("Comments integration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("Should create thread if not exists", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    const res = await request(app)
      .post(`/comments/${listing.id}`)
      .set("Authorization", makeAuthHeader(buyer))
      .send({ content: "Hola" });

    expect(res.status).toBe(201);

    const thread = await prisma.commentThread.findUnique({
      where: { listingId_buyerId: { listingId: listing.id, buyerId: buyer.id } },
    });

    expect(thread).toBeTruthy();
  });

  test("Should add comment to existing thread", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    await request(app)
      .post(`/comments/${listing.id}`)
      .set("Authorization", makeAuthHeader(buyer))
      .send({ content: "Primer comentario" });

    await request(app)
      .post(`/comments/${listing.id}`)
      .set("Authorization", makeAuthHeader(buyer))
      .send({ content: "Segundo comentario" });

    const thread = await prisma.commentThread.findUnique({
      where: { listingId_buyerId: { listingId: listing.id, buyerId: buyer.id } },
      include: { comments: true },
    });

    expect(thread).toBeTruthy();
    expect(thread.comments.length).toBe(2);
  });

  test("Should notify seller when buyer comments", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    await request(app)
      .post(`/comments/${listing.id}`)
      .set("Authorization", makeAuthHeader(buyer))
      .send({ content: "Consulta" });

    const notifications = await prisma.notification.findMany({
      where: { userId: seller.id, type: "NEW_COMMENT" },
    });

    expect(notifications.length).toBe(1);
  });

  test("Should notify buyer when seller replies", async () => {
    const seller = await createUser();
    const buyer = await createUser();
    const listing = await createListing({ sellerId: seller.id });

    await request(app)
      .post(`/comments/${listing.id}`)
      .set("Authorization", makeAuthHeader(buyer))
      .send({ content: "Consulta" });

    await request(app)
      .post(`/comments/${listing.id}`)
      .set("Authorization", makeAuthHeader(seller))
      .send({ content: "Respuesta" });

    const notifications = await prisma.notification.findMany({
      where: { userId: buyer.id, type: "SELLER_REPLIED" },
    });

    expect(notifications.length).toBe(1);
  });
});
