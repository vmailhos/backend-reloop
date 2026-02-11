module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  setupFiles: ["<rootDir>/tests/jest.setup.js"],
  testTimeout: 30000,
};
