const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const validate = require("../middlewares/validate");
const { z } = require("zod");

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

      const comment = await prisma.comment.create({
        data: {
          content,
          listingId,
          authorId: req.user.id,
        },
      });

      res.status(201).json(comment);
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
