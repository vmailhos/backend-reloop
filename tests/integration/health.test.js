// tests/integration/health.test.js
// Integration test for health check endpoint

const request = require("supertest");
const app = require("../../src/app");

describe("Health Check Integration", () => {
  describe("GET /health", () => {
    it("should return 200 and status ok", async () => {
      const response = await request(app)
        .get("/health")
        .expect(200);

      expect(response.body).toEqual({ status: "ok" });
    });

    it("should respond quickly", async () => {
      const start = Date.now();
      await request(app).get("/health");
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe("GET /", () => {
    it("should return welcome message", async () => {
      const response = await request(app)
        .get("/")
        .expect(200);

      expect(response.text).toContain("Backend de Reloop");
    });
  });

  describe("GET /nonexistent", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await request(app)
        .get("/nonexistent-route")
        .expect(404);

      expect(response.body).toEqual({ error: "not_found" });
    });
  });
});
