const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const validate = require("../middlewares/validate");
const { z } = require("zod");
const { sendCommentEmailToSeller } = require("../email/sendCommentEmailToSeller");

const createCommentSchema = {
  body: z.object({
    content: z.string().min(1),
  }),
  params: z.object({
    listingId: z.string().min(1),
  }),
};

// GET /comments/:listingId → obtener comentarios de la prenda
router.get("/:listingId", async (req, res, next) => {
  try {
    const { listingId } = req.params;

  const comments = await prisma.comment.findMany({
    where: { listingId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, username: true, avatar: true } },
    },
  });

    res.json(comments);
  } catch (e) {
    next(e);
  }
});

// POST /comments/:listingId → agregar comentario
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
          title: true,
          sellerId: true,
          seller: { select: { email: true, username: true, name: true } },
        },
      });

      if (!listing) return res.status(404).json({ error: "listing_not_found" });

      const comment = await prisma.comment.create({
        data: {
          content,
          listingId,
          authorId: req.user.id,
        },
      });

      (async () => {
        try {
          if (listing.sellerId === req.user.id) return;
          if (!listing.seller?.email) return;
          console.log("[MAIL] Intentando enviar mail de nuevo comentario");
          console.log("[MAIL] Destinatario:", listing.seller.email);
          await sendCommentEmailToSeller({
            email: listing.seller.email,
            name: listing.seller.name || listing.seller.username,
            title: listing.title,
            commentPreview: content,
          });
          console.log("[MAIL] Mail de nuevo comentario enviado correctamente");
        } catch (err) {
          console.error("[MAIL] Error enviando mail de nuevo comentario");
          console.error(err);
        }
      })();

      res.status(201).json(comment);
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
