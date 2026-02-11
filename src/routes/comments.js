const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const validate = require("../middlewares/validate");
const { z } = require("zod");
const { createNotification } = require("../services/notificationService");
const { sendCommentEmailToSeller } = require("../email/sendCommentEmailToSeller");

const createCommentSchema = {
  body: z.object({
    content: z.string().min(1),
  }),
  params: z.object({
    listingId: z.string().min(1),
  }),
};

// 🔹 GET THREADS POR PRODUCTO
router.get("/:listingId", async (req, res, next) => {
  try {
    const { listingId } = req.params;

    const threads = await prisma.commentThread.findMany({
      where: { listingId },
      include: {
        buyer: {
          select: { id: true, username: true, avatar: true },
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(threads);
  } catch (e) {
    next(e);
  }
});

// 🔹 POST COMMENT (CREA THREAD SI NO EXISTE)
router.post(
  "/:listingId",
  requireAuth,
  validate(createCommentSchema),
  async (req, res, next) => {
    try {
      const { listingId } = req.params;
      const { content } = req.body;

      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          sellerId: true,
          title: true,
          seller: {
            select: { id: true, email: true, name: true, username: true },
          },
        },
      });

      if (!listing)
        return res.status(404).json({ error: "listing_not_found" });

      // Buscar thread existente del buyer
      let thread = await prisma.commentThread.findUnique({
        where: {
          listingId_buyerId: {
            listingId,
            buyerId: req.user.id,
          },
        },
      });

      // Si quien comenta es el seller, buscar el thread más reciente del listing
      if (!thread && req.user.id === listing.sellerId) {
        thread = await prisma.commentThread.findFirst({
          where: {
            listingId,
            sellerId: req.user.id,
          },
          orderBy: { createdAt: "desc" },
        });

        if (!thread) {
          return res.status(404).json({ error: "thread_not_found" });
        }
      }

      // Si no existe y el user es buyer, crearlo
      if (!thread) {
        thread = await prisma.commentThread.create({
          data: {
            listingId,
            buyerId: req.user.id,
            sellerId: listing.sellerId,
          },
        });
      }

      // 🔒 Seguridad: solo buyer o seller pueden comentar
      if (
        req.user.id !== thread.buyerId &&
        req.user.id !== thread.sellerId
      ) {
        return res.status(403).json({ error: "forbidden" });
      }

      const comment = await prisma.comment.create({
        data: {
          content,
          authorId: req.user.id,
          threadId: thread.id,
        },
        include: {
          author: {
            select: { id: true, username: true, avatar: true },
          },
        },
      });

      if (req.user.id === thread.buyerId) {
        await createNotification({
          userId: thread.sellerId,
          type: "NEW_COMMENT",
          title: "Nueva consulta en tu producto",
          message: "Tienes una nueva consulta en tu publicación.",
          metadata: { listingId, commentId: comment.id, threadId: thread.id },
          preferenceKey: "emailSales",
          emailHandler: listing.seller?.email
            ? async () => {
                await sendCommentEmailToSeller({
                  email: listing.seller.email,
                  name: listing.seller.name || listing.seller.username,
                  title: listing.title,
                  commentPreview: content,
                });
              }
            : null,
        });
      } else if (req.user.id === thread.sellerId) {
        await createNotification({
          userId: thread.buyerId,
          type: "SELLER_REPLIED",
          title: "El vendedor respondió tu consulta",
          message: "El vendedor respondió tu consulta.",
          metadata: { listingId, commentId: comment.id, threadId: thread.id },
          preferenceKey: "emailPurchases",
        });
      }

      res.status(201).json(comment);
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
