// tests/unit/utils/notificationHelper.test.js
// Unit tests for notification helpers

const { createNotification } = require("../../../src/utils/notificationHelper");

describe("notificationHelper", () => {
  describe("createNotification", () => {
    let mockTx;

    beforeEach(() => {
      mockTx = {
        notification: {
          create: jest.fn().mockResolvedValue({ id: "notif-123" }),
        },
      };
    });

    it("should create notification with basic data", async () => {
      const userId = "user-1";
      const type = "test";
      const title = "Test Title";
      const message = "Test Message";

      await createNotification(mockTx, userId, type, title, message);

      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type,
          title,
          message,
          metadata: null,
          sendEmail: false,
          sendPush: true,
        },
      });
    });

    it("should include metadata when provided", async () => {
      const metadata = { orderId: "order-123" };

      await createNotification(
        mockTx,
        "user-1",
        "test",
        "Title",
        "Message",
        metadata
      );

      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata,
        }),
      });
    });

    it("should set sendEmail true for sale type", async () => {
      await createNotification(mockTx, "user-1", "sale", "Sale!", "You sold an item");

      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "sale",
          sendEmail: true,
        }),
      });
    });

    it("should set sendEmail true for purchase type", async () => {
      await createNotification(
        mockTx,
        "user-1",
        "purchase",
        "Purchase!",
        "You bought an item"
      );

      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "purchase",
          sendEmail: true,
        }),
      });
    });

    it("should set sendEmail false for other types", async () => {
      await createNotification(
        mockTx,
        "user-1",
        "favorite",
        "Favorited",
        "Someone favorited your item"
      );

      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: "favorite",
          sendEmail: false,
        }),
      });
    });

    it("should always set sendPush to true", async () => {
      await createNotification(mockTx, "user-1", "offer", "Offer", "New offer");

      expect(mockTx.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sendPush: true,
        }),
      });
    });

    it("should return created notification", async () => {
      const result = await createNotification(
        mockTx,
        "user-1",
        "test",
        "Title",
        "Message"
      );

      expect(result).toEqual({ id: "notif-123" });
    });
  });
});
