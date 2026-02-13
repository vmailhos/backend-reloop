// tests/integration/setup.js
// Global setup for integration tests

const { prisma } = require("../testUtils");

beforeAll(async () => {
  // Ensure database is connected
  await prisma.$connect();
});

// NOTE: resetDatabase is called in each test file's beforeEach
// Not here to avoid conflicts with test-specific setup

afterAll(async () => {
  // Close database connection
  await prisma.$disconnect();
});
