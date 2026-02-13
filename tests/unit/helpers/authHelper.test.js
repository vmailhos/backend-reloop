// tests/unit/helpers/authHelper.test.js
// Unit tests for auth helpers

const {
  generateTestToken,
  makeAuthHeader,
  verifyTestToken,
} = require("../../helpers/authHelper");
const jwt = require("jsonwebtoken");

describe("authHelper", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    username: "testuser",
    avatar: "avatar.jpg",
    name: "Test User",
    country: "UY",
  };

  describe("generateTestToken", () => {
    it("should generate a valid JWT token", () => {
      const token = generateTestToken(mockUser);
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
    });

    it("should include user data in token payload", () => {
      const token = generateTestToken(mockUser);
      const decoded = jwt.decode(token);

      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.username).toBe(mockUser.username);
      expect(decoded.avatar).toBe(mockUser.avatar);
      expect(decoded.name).toBe(mockUser.name);
      expect(decoded.country).toBe(mockUser.country);
    });

    it("should handle user without optional fields", () => {
      const minimalUser = {
        id: "user-456",
        email: "minimal@example.com",
        username: "minimal",
      };

      const token = generateTestToken(minimalUser);
      const decoded = jwt.decode(token);

      expect(decoded.sub).toBe(minimalUser.id);
      expect(decoded.avatar).toBeNull();
      expect(decoded.name).toBeNull();
      expect(decoded.country).toBeNull();
    });

    it("should set expiration time", () => {
      const token = generateTestToken(mockUser);
      const decoded = jwt.decode(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe("makeAuthHeader", () => {
    it("should create Bearer token header", () => {
      const header = makeAuthHeader(mockUser);
      expect(header).toMatch(/^Bearer .+/);
    });

    it("should create a valid authorization header", () => {
      const header = makeAuthHeader(mockUser);
      const token = header.replace("Bearer ", "");
      const decoded = jwt.decode(token);

      expect(decoded.sub).toBe(mockUser.id);
    });
  });

  describe("verifyTestToken", () => {
    it("should verify and decode valid token", () => {
      const token = generateTestToken(mockUser);
      const decoded = verifyTestToken(token);

      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });

    it("should throw error for invalid token", () => {
      expect(() => verifyTestToken("invalid-token")).toThrow();
    });

    it("should throw error for token with wrong secret", () => {
      const wrongToken = jwt.sign({ sub: "123" }, "wrong-secret");
      expect(() => verifyTestToken(wrongToken)).toThrow();
    });

    it("should verify token signature", () => {
      const token = generateTestToken(mockUser);
      // Should not throw
      expect(() => verifyTestToken(token)).not.toThrow();
    });
  });
});
