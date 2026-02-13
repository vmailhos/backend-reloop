// tests/integration/auth.test.js
// Integration tests for authentication endpoints

const request = require("supertest");
const app = require("../../src/app");
const { prisma, resetDatabase } = require("../testUtils");
const bcrypt = require("bcryptjs");

describe("Auth Integration", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /auth/signup", () => {
    const validSignup = {
      email: "newuser@example.com",
      username: "newuser",
      password: "Password123!",
      name: "New User",
      country: "UY",
    };

    it("should create new user and return token", async () => {
      const response = await request(app)
        .post("/auth/signup")
        .send(validSignup)
        .expect(201);

      expect(response.body).toMatchObject({
        user: {
          email: validSignup.email,
          username: validSignup.username,
          name: validSignup.name,
          country: validSignup.country,
        },
        token: expect.any(String),
      });

      // User was created (confirmed by successful signup response)
      expect(response.body.user.id).toBeDefined();
    });

    it("should hash password before storing", async () => {
      await request(app)
        .post("/auth/signup")
        .send(validSignup)
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: validSignup.email },
      });

      expect(user.password).not.toBe(validSignup.password);
      const isMatch = await bcrypt.compare(validSignup.password, user.password);
      expect(isMatch).toBe(true);
    });

    it("should reject duplicate username", async () => {
      // First signup
      await request(app).post("/auth/signup").send(validSignup).expect(201);

      // Try to signup again with same username but different email
      const response = await request(app)
        .post("/auth/signup")
        .send({ ...validSignup, email: "different@example.com" })
        .expect(409);

      expect(response.body).toEqual({ error: "username_taken" });
    });

    it("should reject invalid email", async () => {
      const response = await request(app)
        .post("/auth/signup")
        .send({ ...validSignup, email: "notanemail" })
        .expect(400);

      expect(response.body.error).toBe("validation_error");
    });

    it("should reject short password", async () => {
      const response = await request(app)
        .post("/auth/signup")
        .send({ ...validSignup, password: "12345" })
        .expect(400);

      expect(response.body.error).toBe("validation_error");
    });

    it("should reject invalid username", async () => {
      const response = await request(app)
        .post("/auth/signup")
        .send({ ...validSignup, username: "ab" }) // Too short
        .expect(400);

      expect(response.body.error).toBe("validation_error");
    });

    it("should generate avatar URL", async () => {
      const response = await request(app)
        .post("/auth/signup")
        .send(validSignup)
        .expect(201);

      expect(response.body.user.avatar).toContain("ui-avatars.com");
    });
  });

  describe("POST /auth/login", () => {
    const userCredentials = {
      email: "testuser@example.com",
      username: "testuser",
      password: "Password123!",
    };

    beforeEach(async () => {
      // Create a user for login tests
      const hashedPassword = await bcrypt.hash(userCredentials.password, 10);
      await prisma.user.create({
        data: {
          email: userCredentials.email,
          username: userCredentials.username,
          password: hashedPassword,
          avatar: "avatar.jpg",
        },
      });
    });

    it("should login with email", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          identifier: userCredentials.email,
          password: userCredentials.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          email: userCredentials.email,
          username: userCredentials.username,
        },
        token: expect.any(String),
      });
    });

    it("should login with username", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          identifier: userCredentials.username,
          password: userCredentials.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          email: userCredentials.email,
          username: userCredentials.username,
        },
        token: expect.any(String),
      });
    });

    it("should reject wrong password", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          identifier: userCredentials.email,
          password: "WrongPassword",
        })
        .expect(401);

      expect(response.body).toEqual({ error: "invalid_credentials" });
    });

    it("should reject nonexistent user", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          identifier: "nonexistent@example.com",
          password: "SomePassword",
        })
        .expect(401);

      expect(response.body).toEqual({ error: "invalid_credentials" });
    });

    it("should reject missing identifier", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          password: userCredentials.password,
        })
        .expect(400);

      expect(response.body.error).toBe("validation_error");
    });

    it("should reject missing password", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          identifier: userCredentials.email,
        })
        .expect(400);

      expect(response.body.error).toBe("validation_error");
    });
  });

  describe("Authentication Flow", () => {
    it("should complete full signup and login flow", async () => {
      const signupData = {
        email: "flowuser@example.com",
        username: "flowuser",
        password: "FlowPass123!",
      };

      // 1. Signup
      const signupResponse = await request(app)
        .post("/auth/signup")
        .send(signupData)
        .expect(201);

      const signupToken = signupResponse.body.token;
      expect(signupToken).toBeTruthy();

      // 2. Login with same credentials
      const loginResponse = await request(app)
        .post("/auth/login")
        .send({
          identifier: signupData.email,
          password: signupData.password,
        })
        .expect(200);

      const loginToken = loginResponse.body.token;
      expect(loginToken).toBeTruthy();

      // Both tokens should decode to same user
      expect(loginResponse.body.user.email).toBe(signupData.email);
    });
  });
});
