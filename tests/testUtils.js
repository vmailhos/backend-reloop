const jwt = require("jsonwebtoken");
const { Prisma } = require("@prisma/client");
const { prisma } = require("../src/db");

function makeAuthHeader(user) {
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar || null,
      name: user.name || null,
      country: user.country || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
  return `Bearer ${token}`;
}

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

async function createUser(overrides = {}) {
  const index = overrides.index ?? Math.floor(Math.random() * 1000000);
  return prisma.user.create({
    data: {
      email: overrides.email || `user${index}@test.com`,
      username: overrides.username || `user${index}`,
      password: overrides.password || "hashed_password",
      name: overrides.name || `User ${index}`,
      country: overrides.country || "UY",
      avatar: overrides.avatar || null,
    },
  });
}

async function createListing({ sellerId, overrides = {} }) {
  return prisma.listing.create({
    data: {
      title: overrides.title || "Test Listing",
      price: new Prisma.Decimal(overrides.price || 100),
      condition: overrides.condition || "BUENO",
      category: overrides.category || "UNISEX",
      sellerId,
      description: overrides.description || "Listing for tests",
      brand: overrides.brand || null,
    },
  });
}

module.exports = {
  prisma,
  makeAuthHeader,
  resetDatabase,
  createUser,
  createListing,
};
