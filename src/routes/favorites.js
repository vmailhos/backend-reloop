// src/routes/favorites.js
const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const validate = require("../middlewares/validate");
const { z } = require("zod");

// helpers
const toNumberPrice = (l) =>
  l && typeof l.price === "string" ? { ...l, price: Number(l.price) } : l;

// Schemas
const listQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    sort: z.enum(["newest"]).default("newest").optional(),
  }),
};

const idParamSchema = { params: z.object({ listingId: z.string().min(1) }) };

// GET /favorites -> lista favoritos del usuario
router.get("/", requireAuth, validate(listQuerySchema), async (req, res, next) => {
  try {
    // Aseguramos número aunque el front mande string
    const page = Number(req.query.page);
    const pageSize = Number(req.query.pageSize);
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [favs, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: req.user.id },
        orderBy: { id: "desc" },
        skip,
        take,
        include: {
          listing: {
            include: {
              photos: { take: 1, orderBy: { id: "asc" } },
              seller: { select: { id: true, email: true } },
            },
          },
        },
      }),
      prisma.favorite.count({ where: { userId: req.user.id } }),
    ]);

    const items = favs
      .filter((f) => f.listing) // por si el listing fue borrado
      .map((f) => {
        const L = toNumberPrice(f.listing);
        return {
          id: L.id,
          title: L.title,
          price: L.price,
          category: L.category,
          condition: L.condition,
          photo: L.photos[0]?.url || null,
          seller: L.seller,
          favoriteId: f.id,
        };
      });

    res.json({ items, total, page, pageSize });
  } catch (e) {
    console.error("GET /favorites error:", e);
    next(e);
  }
});

// GET /favorites/:listingId -> saber si está en favoritos
router.get("/:listingId", requireAuth, validate(idParamSchema), async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const fav = await prisma.favorite.findUnique({
      where: { userId_listingId: { userId: req.user.id, listingId } },
    });
    res.json({ isFavorite: Boolean(fav), favoriteId: fav?.id || null });
  } catch (e) {
    console.error("GET /favorites/:listingId error:", e);
    next(e);
  }
});

// POST /favorites/:listingId -> agrega favorito (idempotente)
router.post("/:listingId", requireAuth, validate(idParamSchema), async (req, res, next) => {
  try {
    const { listingId } = req.params;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: "listing_not_found" });
    if (listing.sellerId === req.user.id) {
      return res.status(400).json({ error: "cannot_favorite_own_listing" });
    }

    const fav = await prisma.favorite.upsert({
      where: { userId_listingId: { userId: req.user.id, listingId } },
      create: { userId: req.user.id, listingId },
      update: {},
    });

    res.status(201).json({ ok: true, favoriteId: fav.id });
  } catch (e) {
    console.error("POST /favorites/:listingId error:", e);
    next(e);
  }
});

// DELETE /favorites/:listingId -> quita favorito
router.delete("/:listingId", requireAuth, validate(idParamSchema), async (req, res, next) => {
  try {
    const { listingId } = req.params;
    await prisma.favorite
      .delete({ where: { userId_listingId: { userId: req.user.id, listingId } } })
      .catch(() => null);
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /favorites/:listingId error:", e);
    next(e);
  }
});

module.exports = router;
