// tests/helpers/dbHelper.js
// Database helpers for tests

const { prisma } = require("../testUtils");

/**
 * Reset database by truncating all tables
 * Preserves table structure but removes all data
 */
async function resetDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "NotificationPreference",
      "Notification",
      "OrderItem",
      "Order",
      "CartItem",
      "Comment",
      "CommentThread",
      "Offer",
      "Rating",
      "Favorite",
      "Photo",
      "Listing",
      "User"
    RESTART IDENTITY CASCADE;
  `);
}

/**
 * Disconnect from database
 * Call this in afterAll hooks
 */
async function disconnectDatabase() {
  await prisma.$disconnect();
}

/**
 * Check if database is connected
 * @returns {Promise<boolean>} True if connected
 */
async function isDatabaseConnected() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  resetDatabase,
  disconnectDatabase,
  isDatabaseConnected,
};
