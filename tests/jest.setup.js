const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(process.cwd(), ".env.test") });

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "test_openrouter_key";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for tests. Set it in .env.test");
}

jest.mock("../src/email/sendWelcomeEmail", () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../src/email/sendPasswordResetEmail", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../src/email/sendNewListingEmail", () => ({
  sendNewListingEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../src/email/sendSaleEmailToSeller", () => ({
  sendSaleEmailToSeller: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../src/email/sendPurchaseEmailToBuyer", () => ({
  sendPurchaseEmailToBuyer: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../src/email/sendOfferEmailToSeller", () => ({
  sendOfferEmailToSeller: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../src/email/sendCommentEmailToSeller", () => ({
  sendCommentEmailToSeller: jest.fn().mockResolvedValue(undefined),
}));
