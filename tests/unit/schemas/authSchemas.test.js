// tests/unit/schemas/authSchemas.test.js
// Unit tests for auth validation schemas

const { z } = require("zod");

// Recreate schemas for testing (normally would import, but schemas are inline in routes)
const emailSchema = z.string().trim().toLowerCase().email("Email inválido");

const usernameSchema = z
  .string()
  .trim()
  .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
  .max(20, "El nombre de usuario no puede tener más de 20 caracteres")
  .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guiones bajos");

const signupSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  name: z.string().trim().optional(),
  country: z.string().trim().optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(3, "Email o nombre de usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
});

describe("Auth Schemas", () => {
  describe("emailSchema", () => {
    it("should accept valid email", () => {
      const result = emailSchema.safeParse("test@example.com");
      expect(result.success).toBe(true);
      expect(result.data).toBe("test@example.com");
    });

    it("should lowercase email", () => {
      const result = emailSchema.safeParse("TEST@EXAMPLE.COM");
      expect(result.success).toBe(true);
      expect(result.data).toBe("test@example.com");
    });

    it("should trim whitespace", () => {
      const result = emailSchema.safeParse("  test@example.com  ");
      expect(result.success).toBe(true);
      expect(result.data).toBe("test@example.com");
    });

    it("should reject invalid email format", () => {
      const result = emailSchema.safeParse("notanemail");
      expect(result.success).toBe(false);
    });

    it("should reject empty string", () => {
      const result = emailSchema.safeParse("");
      expect(result.success).toBe(false);
    });
  });

  describe("usernameSchema", () => {
    it("should accept valid username", () => {
      const result = usernameSchema.safeParse("testuser123");
      expect(result.success).toBe(true);
    });

    it("should accept username with underscores", () => {
      const result = usernameSchema.safeParse("test_user_123");
      expect(result.success).toBe(true);
    });

    it("should trim whitespace", () => {
      const result = usernameSchema.safeParse("  testuser  ");
      expect(result.success).toBe(true);
      expect(result.data).toBe("testuser");
    });

    it("should reject username shorter than 3 characters", () => {
      const result = usernameSchema.safeParse("ab");
      expect(result.success).toBe(false);
    });

    it("should reject username longer than 20 characters", () => {
      const result = usernameSchema.safeParse("a".repeat(21));
      expect(result.success).toBe(false);
    });

    it("should reject username with special characters", () => {
      const result = usernameSchema.safeParse("user@name");
      expect(result.success).toBe(false);
    });

    it("should reject username with spaces", () => {
      const result = usernameSchema.safeParse("user name");
      expect(result.success).toBe(false);
    });

    it("should accept mixed case alphanumeric", () => {
      const result = usernameSchema.safeParse("TestUser123");
      expect(result.success).toBe(true);
    });
  });

  describe("signupSchema", () => {
    const validSignup = {
      email: "test@example.com",
      username: "testuser",
      password: "password123",
    };

    it("should accept valid signup data", () => {
      const result = signupSchema.safeParse(validSignup);
      expect(result.success).toBe(true);
    });

    it("should accept optional name and country", () => {
      const data = {
        ...validSignup,
        name: "Test User",
        country: "UY",
      };
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject missing email", () => {
      const { email, ...data } = validSignup;
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject missing username", () => {
      const { username, ...data } = validSignup;
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject short password", () => {
      const data = { ...validSignup, password: "12345" };
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const data = { ...validSignup, email: "notanemail" };
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject invalid username", () => {
      const data = { ...validSignup, username: "ab" }; // too short
      const result = signupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    const validLogin = {
      identifier: "testuser",
      password: "password123",
    };

    it("should accept valid login data", () => {
      const result = loginSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
    });

    it("should accept email as identifier", () => {
      const data = {
        identifier: "test@example.com",
        password: "password123",
      };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject missing identifier", () => {
      const { identifier, ...data } = validLogin;
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject missing password", () => {
      const { password, ...data } = validLogin;
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject short identifier", () => {
      const data = { ...validLogin, identifier: "ab" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject empty password", () => {
      const data = { ...validLogin, password: "" };
      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
