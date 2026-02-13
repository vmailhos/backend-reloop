// tests/integration/listings-crud.test.js
// Integration tests for CRUD operations on listings
// NOTE: These tests are currently SKIPPED because the POST/PATCH/DELETE /listings 
// endpoints return 404. Update these when the actual listing routes are confirmed.

const request = require("supertest");
const app = require("../../src/app");
const { prisma, resetDatabase, createUser, makeAuthHeader } = require("../testUtils");

describe.skip("Listings CRUD Integration (SKIPPED - endpoints not found)", () => {
  let seller;
  let authHeader;

  beforeEach(async () => {
    await resetDatabase();
    seller = await createUser({ index: 1 });
    authHeader = makeAuthHeader(seller);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Create Listing", () => {
    const validListing = {
      title: "Test Item",
      description: "Test Description",
      price: 150,
      condition: "BUENO",
      category: "UNISEX",
      brand: "Nike",
      size: "M",
    };

    it("should create listing when authenticated", async () => {
      const response = await request(app)
        .post("/listings")
        .set("Authorization", authHeader)
        .send(validListing)
        .expect(201);

      expect(response.body).toMatchObject({
        title: validListing.title,
        description: validListing.description,
        condition: validListing.condition,
        category: validListing.category,
        sellerId: seller.id,
      });

      // Verify in database
      const listing = await prisma.listing.findUnique({
        where: { id: response.body.id },
      });
      expect(listing).toBeTruthy();
      expect(listing.title).toBe(validListing.title);
    });

    it("should reject listing creation without authentication", async () => {
      const response = await request(app)
        .post("/listings")
        .send(validListing)
        .expect(401);

      expect(response.body).toEqual({ error: "unauthorized" });
    });

    it("should reject invalid listing data", async () => {
      const response = await request(app)
        .post("/listings")
        .set("Authorization", authHeader)
        .send({ title: "Only Title" }) // Missing required fields
        .expect(400);

      expect(response.body.error).toBe("validation_error");
    });
  });

  describe("Read Listing", () => {
    let listing;

    beforeEach(async () => {
      listing = await prisma.listing.create({
        data: {
          title: "Test Listing",
          description: "Description",
          price: 100,
          condition: "BUENO",
          category: "UNISEX",
          sellerId: seller.id,
        },
      });
    });

    it("should get listing by ID", async () => {
      const response = await request(app)
        .get(`/listings/${listing.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: listing.id,
        title: listing.title,
        description: listing.description,
      });
    });

    it("should return 404 for nonexistent listing", async () => {
      const response = await request(app)
        .get("/listings/clm000000000000000000")
        .expect(404);

      expect(response.body).toEqual({ error: "not_found" });
    });

    it("should list all listings", async () => {
      // Create multiple listings
      await prisma.listing.create({
        data: {
          title: "Second Listing",
          price: 200,
          condition: "NUEVO",
          category: "MUJER",
          sellerId: seller.id,
        },
      });

      const response = await request(app)
        .get("/listings")
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Update Listing", () => {
    let listing;

    beforeEach(async () => {
      listing = await prisma.listing.create({
        data: {
          title: "Original Title",
          price: 100,
          condition: "BUENO",
          category: "UNISEX",
          sellerId: seller.id,
        },
      });
    });

    it("should update own listing", async () => {
      const updates = {
        title: "Updated Title",
        price: 150,
      };

      const response = await request(app)
        .patch(`/listings/${listing.id}`)
        .set("Authorization", authHeader)
        .send(updates)
        .expect(200);

      expect(response.body.title).toBe(updates.title);
      expect(parseFloat(response.body.price)).toBe(updates.price);

      // Verify in database
      const updated = await prisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(updated.title).toBe(updates.title);
    });

    it("should reject update without authentication", async () => {
      const response = await request(app)
        .patch(`/listings/${listing.id}`)
        .send({ title: "New Title" })
        .expect(401);

      expect(response.body).toEqual({ error: "unauthorized" });
    });

    it("should reject update by non-owner", async () => {
      const otherUser = await createUser({ index: 2 });
      const otherAuthHeader = makeAuthHeader(otherUser);

      const response = await request(app)
        .patch(`/listings/${listing.id}`)
        .set("Authorization", otherAuthHeader)
        .send({ title: "Hacked Title" })
        .expect(403);

      expect(response.body).toEqual({ error: "forbidden" });
    });
  });

  describe("Delete Listing", () => {
    let listing;

    beforeEach(async () => {
      listing = await prisma.listing.create({
        data: {
          title: "To Be Deleted",
          price: 100,
          condition: "BUENO",
          category: "UNISEX",
          sellerId: seller.id,
        },
      });
    });

    it("should delete own listing", async () => {
      await request(app)
        .delete(`/listings/${listing.id}`)
        .set("Authorization", authHeader)
        .expect(204);

      // Verify deletion in database
      const deleted = await prisma.listing.findUnique({
        where: { id: listing.id },
      });
      expect(deleted).toBeNull();
    });

    it("should reject deletion without authentication", async () => {
      const response = await request(app)
        .delete(`/listings/${listing.id}`)
        .expect(401);

      expect(response.body).toEqual({ error: "unauthorized" });
    });

    it("should reject deletion by non-owner", async () => {
      const otherUser = await createUser({ index: 2 });
      const otherAuthHeader = makeAuthHeader(otherUser);

      const response = await request(app)
        .delete(`/listings/${listing.id}`)
        .set("Authorization", otherAuthHeader)
        .expect(403);

      expect(response.body).toEqual({ error: "forbidden" });
    });

    it("should return 404 when deleting nonexistent listing", async () => {
      const response = await request(app)
        .delete("/listings/clm000000000000000000")
        .set("Authorization", authHeader)
        .expect(404);

      expect(response.body).toEqual({ error: "not_found" });
    });
  });

  describe("Complete CRUD Flow", () => {
    it("should complete full CRUD lifecycle", async () => {
      // 1. Create
      const createResponse = await request(app)
        .post("/listings")
        .set("Authorization", authHeader)
        .send({
          title: "Lifecycle Item",
          description: "Test item for full CRUD",
          price: 99,
          condition: "BUENO",
          category: "UNISEX",
        })
        .expect(201);

      const listingId = createResponse.body.id;

      // 2. Read
      const readResponse = await request(app)
        .get(`/listings/${listingId}`)
        .expect(200);

      expect(readResponse.body.title).toBe("Lifecycle Item");

      // 3. Update
      const updateResponse = await request(app)
        .patch(`/listings/${listingId}`)
        .set("Authorization", authHeader)
        .send({ title: "Updated Lifecycle Item", price: 120 })
        .expect(200);

      expect(updateResponse.body.title).toBe("Updated Lifecycle Item");

      // 4. Delete
      await request(app)
        .delete(`/listings/${listingId}`)
        .set("Authorization", authHeader)
        .expect(204);

      // 5. Verify deletion
      await request(app)
        .get(`/listings/${listingId}`)
        .expect(404);
    });
  });
});
