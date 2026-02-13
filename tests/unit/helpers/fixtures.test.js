// tests/unit/helpers/fixtures.test.js
// Unit tests for test fixtures

const {
  buildUserData,
  buildListingData,
  buildOfferData,
  buildCommentData,
  buildRatingData,
} = require("../../helpers/fixtures");
const { Prisma } = require("@prisma/client");

describe("fixtures", () => {
  describe("buildUserData", () => {
    it("should create valid user data with defaults", () => {
      const userData = buildUserData();

      expect(userData).toMatchObject({
        email: expect.stringContaining("@test.com"),
        username: expect.stringContaining("user"),
        password: "Password123!",
        country: "UY",
      });
    });

    it("should allow overriding default values", () => {
      const userData = buildUserData({
        email: "custom@example.com",
        username: "customuser",
        country: "AR",
      });

      expect(userData.email).toBe("custom@example.com");
      expect(userData.username).toBe("customuser");
      expect(userData.country).toBe("AR");
    });

    it("should include optional fields when provided", () => {
      const userData = buildUserData({
        phone: "+59899123456",
        gender: "M",
        birthDate: new Date("1990-01-01"),
      });

      expect(userData.phone).toBe("+59899123456");
      expect(userData.gender).toBe("M");
      expect(userData.birthDate).toBeInstanceOf(Date);
    });

    it("should use index for unique values", () => {
      const userData1 = buildUserData({ index: 1 });
      const userData2 = buildUserData({ index: 2 });

      expect(userData1.email).toBe("user1@test.com");
      expect(userData2.email).toBe("user2@test.com");
    });
  });

  describe("buildListingData", () => {
    const sellerId = "seller-123";

    it("should create valid listing data with defaults", () => {
      const listingData = buildListingData(sellerId);

      expect(listingData).toMatchObject({
        title: expect.any(String),
        description: expect.any(String),
        price: expect.any(Prisma.Decimal),
        condition: "BUENO",
        category: "UNISEX",
        sellerId,
      });
    });

    it("should allow overriding default values", () => {
      const listingData = buildListingData(sellerId, {
        title: "Custom Title",
        price: 250,
        condition: "NUEVO",
        category: "HOMBRE",
      });

      expect(listingData.title).toBe("Custom Title");
      expect(listingData.price).toEqual(new Prisma.Decimal(250));
      expect(listingData.condition).toBe("NUEVO");
      expect(listingData.category).toBe("HOMBRE");
    });

    it("should handle discount percent", () => {
      const listingData = buildListingData(sellerId, {
        discountPercent: 20,
      });

      expect(listingData.discountPercent).toBe(20);
    });

    it("should include brand and size", () => {
      const listingData = buildListingData(sellerId, {
        brand: "Nike",
        size: "XL",
      });

      expect(listingData.brand).toBe("Nike");
      expect(listingData.size).toBe("XL");
    });
  });

  describe("buildOfferData", () => {
    const listingId = "listing-123";
    const buyerId = "buyer-456";

    it("should create valid offer data with defaults", () => {
      const offerData = buildOfferData(listingId, buyerId);

      expect(offerData).toMatchObject({
        amount: expect.any(Prisma.Decimal),
        message: expect.any(String),
        listingId,
        buyerId,
        status: "PENDING",
      });
    });

    it("should allow overriding amount", () => {
      const offerData = buildOfferData(listingId, buyerId, {
        amount: 150,
      });

      expect(offerData.amount).toEqual(new Prisma.Decimal(150));
    });

    it("should allow custom message and status", () => {
      const offerData = buildOfferData(listingId, buyerId, {
        message: "Is this still available?",
        status: "ACCEPTED",
      });

      expect(offerData.message).toBe("Is this still available?");
      expect(offerData.status).toBe("ACCEPTED");
    });
  });

  describe("buildCommentData", () => {
    const authorId = "author-123";

    it("should create valid comment data with defaults", () => {
      const commentData = buildCommentData(authorId);

      expect(commentData).toMatchObject({
        content: expect.any(String),
        authorId,
      });
    });

    it("should allow custom content", () => {
      const commentData = buildCommentData(authorId, {
        content: "Custom comment text",
      });

      expect(commentData.content).toBe("Custom comment text");
    });
  });

  describe("buildRatingData", () => {
    const fromUserId = "rater-123";
    const toUserId = "rated-456";

    it("should create valid rating data with defaults", () => {
      const ratingData = buildRatingData(fromUserId, toUserId);

      expect(ratingData).toMatchObject({
        stars: 5,
        comment: expect.any(String),
        fromUserId,
        toUserId,
        orderId: null,
      });
    });

    it("should allow custom stars and comment", () => {
      const ratingData = buildRatingData(fromUserId, toUserId, {
        stars: 3,
        comment: "Average experience",
      });

      expect(ratingData.stars).toBe(3);
      expect(ratingData.comment).toBe("Average experience");
    });

    it("should allow linking to order", () => {
      const ratingData = buildRatingData(fromUserId, toUserId, {
        orderId: "order-789",
      });

      expect(ratingData.orderId).toBe("order-789");
    });
  });
});
