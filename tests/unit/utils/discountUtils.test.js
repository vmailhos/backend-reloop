// tests/unit/utils/discountUtils.test.js
// Unit tests for discount utilities

const {
  calculateFinalPrice,
  isValidDiscount,
  enrichListingWithDiscount,
  buildDiscountFilters,
} = require("../../../src/utils/discountUtils");

describe("discountUtils", () => {
  describe("calculateFinalPrice", () => {
    it("should return original price when no discount", () => {
      const result = calculateFinalPrice(100, null);
      expect(result).toBe(100);
    });

    it("should return original price when discount is 0", () => {
      const result = calculateFinalPrice(100, 0);
      expect(result).toBe(100);
    });

    it("should calculate 10% discount correctly", () => {
      const result = calculateFinalPrice(100, 10);
      expect(result).toBe(90);
    });

    it("should calculate 50% discount correctly", () => {
      const result = calculateFinalPrice(200, 50);
      expect(result).toBe(100);
    });

    it("should calculate 25% discount on decimal price", () => {
      const result = calculateFinalPrice(99.99, 25);
      expect(result).toBe(74.99);
    });

    it("should handle string inputs", () => {
      const result = calculateFinalPrice("150", "20");
      expect(result).toBe(120);
    });

    it("should round to 2 decimal places", () => {
      const result = calculateFinalPrice(33.33, 10);
      expect(result).toBe(30);
    });

    it("should handle maximum discount of 90%", () => {
      const result = calculateFinalPrice(1000, 90);
      expect(result).toBe(100);
    });
  });

  describe("isValidDiscount", () => {
    it("should accept null discount", () => {
      expect(isValidDiscount(null)).toBe(true);
    });

    it("should accept undefined discount", () => {
      expect(isValidDiscount(undefined)).toBe(true);
    });

    it("should accept 0% discount", () => {
      expect(isValidDiscount(0)).toBe(true);
    });

    it("should accept valid discount in range", () => {
      expect(isValidDiscount(25)).toBe(true);
      expect(isValidDiscount(50)).toBe(true);
      expect(isValidDiscount(90)).toBe(true);
    });

    it("should reject negative discount", () => {
      expect(isValidDiscount(-10)).toBe(false);
    });

    it("should reject discount above 90", () => {
      expect(isValidDiscount(91)).toBe(false);
      expect(isValidDiscount(100)).toBe(false);
    });

    it("should reject non-numeric discount", () => {
      expect(isValidDiscount("abc")).toBe(false);
    });

    it("should accept string numbers", () => {
      expect(isValidDiscount("50")).toBe(true);
    });
  });

  describe("enrichListingWithDiscount", () => {
    it("should handle null listing", () => {
      const result = enrichListingWithDiscount(null);
      expect(result).toBeNull();
    });

    it("should enrich listing without discount", () => {
      const listing = { id: "1", price: 100, discountPercent: null };
      const result = enrichListingWithDiscount(listing);
      
      expect(result).toMatchObject({
        id: "1",
        originalPrice: 100,
        discountPercent: null,
        finalPrice: 100,
      });
      // hasDiscount will be falsy (null or false) when no discount
      expect(result.hasDiscount).toBeFalsy();
    });

    it("should enrich listing with discount", () => {
      const listing = { id: "2", price: 200, discountPercent: 20 };
      const result = enrichListingWithDiscount(listing);
      
      expect(result).toMatchObject({
        id: "2",
        originalPrice: 200,
        discountPercent: 20,
        finalPrice: 160,
        hasDiscount: true,
      });
    });

    it("should preserve all original fields", () => {
      const listing = { 
        id: "3", 
        title: "Test", 
        price: 150, 
        discountPercent: 10,
        category: "UNISEX"
      };
      const result = enrichListingWithDiscount(listing);
      
      expect(result.title).toBe("Test");
      expect(result.category).toBe("UNISEX");
    });
  });

  describe("buildDiscountFilters", () => {
    it("should return empty where clause for no filters", () => {
      const result = buildDiscountFilters({});
      expect(result).toEqual({});
    });

    it("should filter for onSaleOnly", () => {
      const result = buildDiscountFilters({ onSaleOnly: true });
      expect(result).toEqual({
        discountPercent: {
          not: null,
          gt: 0,
        },
      });
    });

    it("should filter for minDiscount", () => {
      const result = buildDiscountFilters({ minDiscount: 20 });
      expect(result).toEqual({
        discountPercent: {
          gte: 20,
        },
      });
    });

    it("should combine onSaleOnly and minDiscount", () => {
      const result = buildDiscountFilters({ onSaleOnly: true, minDiscount: 30 });
      expect(result).toEqual({
        discountPercent: {
          not: null,
          gt: 0,
          gte: 30,
        },
      });
    });

    it("should ignore minDiscount of 0", () => {
      const result = buildDiscountFilters({ minDiscount: 0 });
      expect(result).toEqual({});
    });
  });
});
