// tests/integration/teardown.js
// Global teardown for integration tests

const { prisma } = require("../testUtils");

module.exports = async () => {
  // Ensure all connections are closed
  await prisma.$disconnect();
};
