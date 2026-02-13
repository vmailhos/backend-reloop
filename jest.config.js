module.exports = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      testMatch: ["**/tests/unit/**/*.test.js"],
      setupFiles: ["<rootDir>/tests/jest.setup.js"],
      testTimeout: 10000,
      collectCoverageFrom: [
        "src/**/*.js",
        "!src/server.js",
        "!src/docs/**",
        "!src/email/**",
      ],
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["**/tests/integration/**/*.test.js"],
      setupFiles: ["<rootDir>/tests/jest.setup.js"],
      setupFilesAfterEnv: ["<rootDir>/tests/integration/setup.js"],
      testTimeout: 30000,
      globalTeardown: "<rootDir>/tests/integration/teardown.js",
      maxWorkers: 1, // Run tests sequentially to avoid DB conflicts
    },
  ],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",
    "!src/docs/**",
    "!src/email/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
};
