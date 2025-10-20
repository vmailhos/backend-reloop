// src/routes/listings.js
const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const validate = require("../middlewares/validate");
const { z } = require("zod");

// ---------- Helpers ----------
const toNumberPrice = (l) => (
  l && typeof l.price === "string" ? { ...l, price: Number(l.price) } : l
);

// ---------- Schemas ----------
const createListingSchema = {
  body: z.object({
    title: z.string().min(2, "Título muy corto"),
    // acepta number o string numérico, y lo transforma a Number
    price: z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/)]).transform(Number),
    category: z.string().min(1).default("otros"),
    condition: z.enum(["nuevo", "como_nuevo", "usado"]).default("usado"),
    photos: z.array(z.object({ url: z.string().min(1) })).default([])
  })
};

const listQuerySchema = {
  query: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest").optional()
  })
};

const updateListingSchema = {
  body: z.object({
    title: z.string().min(2).optional(),
    price: z.coerce.number().nonnegative().optional(),
    category: z.string().optional(),
    condition: z.enum(["nuevo","como_nuevo","usado"]).optional(),
    photos: z.array(z.object({ url: z.string().min(1) })).optional()
  })
};

// ---------- Rutas ----------

// GET /listings  (listado con filtros + paginación + sort)
router.get("/", validate(listQuerySchema), async (req, res, next) => {
  try {
    const { search, category, minPrice, maxPrice, page, pageSize, sort } = req.query;

    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      return res.status(400).json({
        error: "validation_error",
        details: [{ path: ["minPrice","maxPrice"], message: "minPrice no puede ser mayor que maxPrice" }]
      });
    }

    const where = {};
    if (category) where.category = String(category);
    if (minPrice != null || maxPrice != null) {
      where.price = {};
      if (minPrice != null) where.price.gte = Number(minPrice);
      if (maxPrice != null) where.price.lte = Number(maxPrice);
    }
    if (search) where.title = { contains: String(search), mode: "insensitive" };

    let orderBy = { createdAt: "desc" };
    if (sort === "price_asc")  orderBy = { price: "asc" };
    if (sort === "price_desc") orderBy = { price: "desc" };

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip, take,
        include: { photos: true, seller: { select: { id: true, email: true } } }
      }),
      prisma.listing.count({ where })
    ]);

    res.json({
      items: items.map(toNumberPrice),
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (e) { next(e); }
});

// GET /listings/mine  (MIS PUBLICACIONES)  <-- antes de "/:id"
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.listing.findMany({
      where: { sellerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { photos: true }
    });
    res.json({ items: items.map(toNumberPrice), total: items.length });
  } catch (e) { next(e); }
});

// POST /listings  (crear, protegido + validado)
router.post("/", requireAuth, validate(createListingSchema), async (req, res, next) => {
  try {
    const { title, price, category, condition, photos } = req.body;

    const created = await prisma.listing.create({
      data: {
        title,
        price,
        category,
        condition,
        sellerId: req.user.id,
        photos: { create: photos.map(p => ({ url: p.url })) }
      },
      include: { photos: true }
    });

    res.status(201).json(toNumberPrice(created));
  } catch (e) { next(e); }
});

// PATCH /listings/:id  (editar propio)
router.patch("/:id", requireAuth, validate(updateListingSchema), async (req, res, next) => {
  try {
    const { id } = req.params;

    const owned = await prisma.listing.findFirst({ where: { id, sellerId: req.user.id }});
    if (!owned) return res.status(403).json({ error: "forbidden" });

    const { photos, ...data } = req.body;

    const updated = await prisma.listing.update({
      where: { id },
      data: {
        ...data,
        ...(photos
          ? { photos: {
                deleteMany: { listingId: id }, // simple: reemplazar todas
                create: photos.map(p => ({ url: p.url }))
              }
            }
          : {})
      },
      include: { photos: true }
    });

    res.json(toNumberPrice(updated));
  } catch (e) { next(e); }
});

// DELETE /listings/:id  (borrar propio)
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const owned = await prisma.listing.findFirst({ where: { id, sellerId: req.user.id }});
    if (!owned) return res.status(403).json({ error: "forbidden" });

    // limpiar dependencias
    await prisma.photo.deleteMany({ where: { listingId: id } });
    await prisma.favorite.deleteMany({ where: { listingId: id } }).catch(() => null);
    await prisma.listing.delete({ where: { id } });

    res.json({ ok: true });
  } catch (e) { next(e); }
});

// GET /listings/:id  (detalle)
router.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: { photos: true, seller: { select: { id: true, email: true } } }
    });
    if (!item) return res.status(404).json({ error: "not_found" });
    res.json(toNumberPrice(item));
  } catch (e) { next(e); }
});

module.exports = router;
