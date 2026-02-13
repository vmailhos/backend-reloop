// tests/unit/schemas/ratingSchemas.test.js
// Unit tests for rating validation schemas

const { createRatingSchema } = require("../../../src/schemas/ratingSchemas");

describe("ratingSchemas", () => {
  describe("createRatingSchema", () => {
    const validRating = {
      targetId: "clm123456789abcdefghijk",
      value: 5,
    };

    it("should accept valid rating data", () => {
      const result = createRatingSchema.safeParse(validRating);
      expect(result.success).toBe(true);
    });

    it("should accept rating with comment", () => {
      const data = {
        ...validRating,
        comment: "Great seller!",
      };
      const result = createRatingSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept rating with listingId", () => {
      const data = {
        ...validRating,
        listingId: "clm987654321abcdefghijk",
      };
      const result = createRatingSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept rating value of 1", () => {
      const data = { ...validRating, value: 1 };
      const result = createRatingSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept rating value of 5", () => {
      const data = { ...validRating, value: 5 };
      const result = createRatingSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject rating value of 0", () => {
      const data = { ...validRating, value: 0 };
      const result = createRatingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject rating value of 6", () => {
      const data = { ...validRating, value: 6 };
      const result = createRatingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject decimal rating value", () => {
      const data = { ...validRating, value: 4.5 };
      const result = createRatingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject missing targetId", () => {
      const { targetId, ...data } = validRating;
      const result = createRatingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject missing value", () => {
      const { value, ...data } = validRating;
      const result = createRatingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid targetId format", () => {
      const data = { ...validRating, targetId: "invalid-id" };
      const result = createRatingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject comment longer than 500 characters", () => {
      const data = {
        ...validRating,
        comment: "a".repeat(501),
      };
      const result = createRatingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should accept comment exactly 500 characters", () => {
      const data = {
        ...validRating,
        comment: "a".repeat(500),
      };
      const result = createRatingSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject invalid listingId format", () => {
      const data = {
        ...validRating,
        listingId: "not-a-cuid",
      };
      const result = createRatingSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
