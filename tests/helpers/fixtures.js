// tests/helpers/fixtures.js
// Test fixtures and data builders

const { Prisma } = require("@prisma/client");

/**
 * Create a test user data object
 * @param {object} overrides - Override default values
 * @returns {object} User data object
 */
function buildUserData(overrides = {}) {
  const index = overrides.index ?? Math.floor(Math.random() * 1000000);
  return {
    email: overrides.email || `user${index}@test.com`,
    username: overrides.username || `user${index}`,
    password: overrides.password || "Password123!",
    name: overrides.name || `Test User ${index}`,
    lastName: overrides.lastName || `LastName${index}`,
    country: overrides.country || "UY",
    avatar: overrides.avatar || null,
    phone: overrides.phone || null,
    gender: overrides.gender || null,
    birthDate: overrides.birthDate || null,
  };
}

/**
 * Create a test listing data object
 * @param {string} sellerId - ID of the seller
 * @param {object} overrides - Override default values
 * @returns {object} Listing data object
 */
function buildListingData(sellerId, overrides = {}) {
  return {
    title: overrides.title || "Test Listing Item",
    description: overrides.description || "This is a test listing description",
    price: new Prisma.Decimal(overrides.price || 100),
    condition: overrides.condition || "BUENO",
    category: overrides.category || "UNISEX",
    brand: overrides.brand || "Test Brand",
    size: overrides.size || "M",
    sellerId,
    discountPercent: overrides.discountPercent || null,
  };
}

/**
 * Create a test offer data object
 * @param {string} listingId - ID of the listing
 * @param {string} buyerId - ID of the buyer
 * @param {object} overrides - Override default values
 * @returns {object} Offer data object
 */
function buildOfferData(listingId, buyerId, overrides = {}) {
  return {
    amount: new Prisma.Decimal(overrides.amount || 80),
    message: overrides.message || "Test offer message",
    listingId,
    buyerId,
    status: overrides.status || "PENDING",
  };
}

/**
 * Create a test comment data object
 * @param {string} authorId - ID of the comment author
 * @param {object} overrides - Override default values
 * @returns {object} Comment data object
 */
function buildCommentData(authorId, overrides = {}) {
  return {
    content: overrides.content || "This is a test comment",
    authorId,
  };
}

/**
 * Create a test rating data object
 * @param {string} fromUserId - ID of the rater
 * @param {string} toUserId - ID of the rated user
 * @param {object} overrides - Override default values
 * @returns {object} Rating data object
 */
function buildRatingData(fromUserId, toUserId, overrides = {}) {
  return {
    stars: overrides.stars || 5,
    comment: overrides.comment || "Great transaction!",
    fromUserId,
    toUserId,
    orderId: overrides.orderId || null,
  };
}

module.exports = {
  buildUserData,
  buildListingData,
  buildOfferData,
  buildCommentData,
  buildRatingData,
};
