// src/utils/discountUtils.js
// Discount calculation and validation utilities

/**
 * Calculate the final price after applying a discount percentage
 * @param {number|string} originalPrice - The original price (Decimal or number)
 * @param {number|string|null} discountPercent - The discount percentage (0-90) or null
 * @returns {number} The final price after discount
 */
function calculateFinalPrice(originalPrice, discountPercent) {
  const price = parseFloat(originalPrice);
  
  // If no discount, return original price
  if (!discountPercent || parseFloat(discountPercent) === 0) {
    return price;
  }
  
  const discount = parseFloat(discountPercent);
  
  // Calculate discounted price: price * (1 - discount/100)
  const finalPrice = price * (1 - discount / 100);
  
  // Round to 2 decimal places
  return Math.round(finalPrice * 100) / 100;
}

/**
 * Validate discount percentage
 * @param {number|string} discountPercent - The discount percentage to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidDiscount(discountPercent) {
  if (discountPercent === null || discountPercent === undefined) {
    return true; // No discount is valid
  }
  
  const discount = parseFloat(discountPercent);
  
  // Must be a number
  if (isNaN(discount)) {
    return false;
  }
  
  // Must be between 0 and 90 (inclusive)
  return discount >= 0 && discount <= 90;
}

/**
 * Add discount information to a listing object
 * Adds: originalPrice, discountPercent, finalPrice, hasDiscount
 * @param {object} listing - The listing object from database
 * @returns {object} Listing with added discount fields
 */
function enrichListingWithDiscount(listing) {
  if (!listing) return listing;
  
  const originalPrice = parseFloat(listing.price);
  const discountPercent = listing.discountPercent ? parseFloat(listing.discountPercent) : null;
  const finalPrice = calculateFinalPrice(originalPrice, discountPercent);
  const hasDiscount = discountPercent && discountPercent > 0;
  
  return {
    ...listing,
    originalPrice,
    discountPercent,
    finalPrice,
    hasDiscount,
    // Keep the price field for backward compatibility
    price: listing.price
  };
}

/**
 * Build Prisma where clause for discount filters
 * @param {object} filters - Filter options
 * @param {boolean} filters.onSaleOnly - Only show discounted items
 * @param {number} filters.minDiscount - Minimum discount percentage
 * @returns {object} Prisma where clause
 */
function buildDiscountFilters(filters = {}) {
  const where = {};
  
  if (filters.onSaleOnly) {
    // Has a discount greater than 0
    where.discountPercent = {
      not: null,
      gt: 0
    };
  }
  
  if (filters.minDiscount && parseFloat(filters.minDiscount) > 0) {
    // Discount is at least minDiscount%
    where.discountPercent = {
      ...(where.discountPercent || {}),
      gte: parseFloat(filters.minDiscount)
    };
  }
  
  return where;
}

/**
 * Calculate discount amount in currency
 * @param {number|string} originalPrice - The original price
 * @param {number|string|null} discountPercent - The discount percentage
 * @returns {number} The discount amount (saved money)
 */
function calculateDiscountAmount(originalPrice, discountPercent) {
  const price = parseFloat(originalPrice);
  
  if (!discountPercent || parseFloat(discountPercent) === 0) {
    return 0;
  }
  
  const discount = parseFloat(discountPercent);
  const discountAmount = price * (discount / 100);
  
  // Round to 2 decimal places
  return Math.round(discountAmount * 100) / 100;
}

module.exports = {
  calculateFinalPrice,
  isValidDiscount,
  enrichListingWithDiscount,
  buildDiscountFilters,
  calculateDiscountAmount
};
