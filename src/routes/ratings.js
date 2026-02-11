const express = require("express");
const router = express.Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const validate = require("../middlewares/validate");
const { createRatingSchema } = require("../schemas/ratingSchemas");
const { createNotification } = require("../services/notificationService");

// --------------------------------------------------
// POST /ratings → Crear una calificación
// --------------------------------------------------
router.post(
  "/",
  requireAuth,
  validate({ body: createRatingSchema }), // 👈 Zod valida antes
  async (req, res) => {
    try {
      const authorId = req.user.id; 
      const { targetId, value, comment, listingId } = req.body; // 👈 YA VALIDADO

      // Evitar auto-calificación
      if (authorId === targetId) {
        return res.status(400).json({ error: "No puedes calificarte a ti mismo." });
      }

      // Verificar que el usuario target exista
      const targetUser = await prisma.user.findUnique({
        where: { id: targetId },
      });

      if (!targetUser) {
        return res.status(404).json({ error: "El usuario que intentas calificar no existe." });
      }
      const existing = await prisma.rating.findFirst({
          where: {
            authorId: req.user.id,
            targetId,
            listingId: listingId ?? undefined,
          },
        });

        if (existing) {
          return res.status(409).json({ error: "rating_already_exists" });
        }
        if (listingId) {
          const hasOrder = await prisma.order.findFirst({
            where: {
              buyerId: req.user.id,
              status: "COMPLETED",
              items: {
                some: { listingId },
              },
            },
          });

          if (!hasOrder) {
            return res.status(403).json({ error: "rating_not_allowed" });
          }
        }


      const rating = await prisma.rating.create({
        data: {
          value,
          comment,
          authorId,
          targetId,
          listingId,
        },
      });

      await createNotification({
        userId: targetId,
        type: "NEW_RATING",
        title: "Has recibido una nueva valoración",
        message: "Recibiste una nueva valoración.",
        metadata: { ratingId: rating.id, listingId },
        preferenceKey: "emailSales",
      });

      return res.json(rating);
    } catch (err) {
      console.error(err);
      return res.status(400).json({ error: err.message || "Error al crear rating" });
    }
  }
);


// --------------------------------------------------
// GET /users/:id/ratings → Listar ratings recibidos por un usuario
// --------------------------------------------------
router.get("/users/:id/ratings", async (req, res) => {
  const { id } = req.params;

  try {
    const ratings = await prisma.rating.findMany({
      where: { targetId: id },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        listing: {
          select: { id: true, title: true },
        },
      },
    });

    return res.json(ratings);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: "Error al obtener ratings" });
  }
});

// --------------------------------------------------
// GET /users/:id/reputation → Obtener promedio + total
// --------------------------------------------------
router.get("/users/:id/reputation", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await prisma.rating.aggregate({
      where: { targetId: id },
      _avg: { value: true },
      _count: { value: true },
    });

    return res.json({
      averageScore: result._avg.value || 0,
      totalRatings: result._count.value,
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: "Error obteniendo reputación" });
  }
});

module.exports = router;
