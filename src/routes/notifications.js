const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const validate = require("../middlewares/validate");
const { z } = require("zod");

// Schemas
const readNotificationSchema = {
  params: z.object({ id: z.string().min(1) }),
};

const listQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
  }),
};

// GET /notifications → get user notifications with pagination
router.get("/", requireAuth, validate(listQuerySchema), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          metadata: true,
          read: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where: { userId: req.user.id } }),
    ]);

    res.json({
      items: notifications,
      total,
      page,
      pageSize,
    });
  } catch (e) {
    next(e);
  }
});

// PATCH /notifications/:id/read → mark single notification as read
router.patch(
  "/:id/read",
  requireAuth,
  validate(readNotificationSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id },
      });

      if (!notification) {
        return res.status(404).json({ error: "notification_not_found" });
      }

      if (notification.userId !== req.user.id) {
        return res.status(403).json({ error: "forbidden" });
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { read: true },
      });

      res.json({
        id: updated.id,
        read: updated.read,
      });
    } catch (e) {
      next(e);
    }
  }
);

// PATCH /notifications/read-all → mark all notifications as read
router.patch("/read-all", requireAuth, async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });

    res.json({
      updated: result.count,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
