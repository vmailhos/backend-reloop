const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const validate = require("../middlewares/validate");
const { z } = require("zod");

// ---------- Helpers ----------
const toNumberPrice = (l) =>
  l && typeof l.price === "string" ? { ...l, price: Number(l.price) } : l;

// ---------- Schemas ----------
const createListingSchema = {
  body: z.object({
    title: z.string().min(2, "Título muy corto"),
    description: z.string().optional(),
    price: z
      .union([z.number(), z.string().regex(/^\d+(\.\d+)?$/)])
      .transform(Number),
    condition: z.enum([
      "NUEVO_CON_ETIQUETA",
      "NUEVO_SIN_ETIQUETA",
      "MUY_BUENO",
      "BUENO",
      "SATISFACTORIO",
    ]),
    category: z.enum(["HOMBRE", "MUJER", "NINOS", "ACCESORIOS", "CALZADOS", "ROPA"]),
    subCategory: z.enum(["ROPA", "ACCESORIOS", "CALZADOS"]).optional(),
    subSubCategory: z.string().optional(),
    brand: z.string().optional(),
    size: z.string().optional(),
    color: z.string().optional(),
    photos: z.array(z.object({ url: z.string().min(1) })).default([]),
  }),
};

const listQuerySchema = {
  query: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    condition: z.string().optional(),
    brand: z.string().optional(),
    color: z.string().optional(),
    size: z.string().optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    sort: z
      .enum(["newest", "price_asc", "price_desc"])
      .default("newest")
      .optional(),
  }),
};

const updateListingSchema = {
  body: z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    price: z.coerce.number().nonnegative().optional(),
    condition: z
      .enum([
        "NUEVO_CON_ETIQUETA",
        "NUEVO_SIN_ETIQUETA",
        "MUY_BUENO",
        "BUENO",
        "SATISFACTORIO",
      ])
      .optional(),
    category: z.enum(["HOMBRE", "MUJER", "NINOS", "ACCESORIOS", "CALZADOS", "ROPA"]).optional(),
    subCategory: z.enum(["ROPA", "ACCESORIOS", "CALZADOS"]).optional(),
    subSubCategory: z.string().optional(),
    brand: z.string().optional(),
    size: z.string().optional(),
    color: z.string().optional(),
    photos: z.array(z.object({ url: z.string().min(1) })).optional(),
  }),
};

// ---------- Rutas ----------

// GET /listings (listado con filtros + paginación + sort)
router.get("/all", validate(listQuerySchema), async (req, res, next) => {
  try {
    const {
      search,
      category,
      subCategory,
      condition,
      brand,
      color,
      size,
      minPrice,
      maxPrice,
      page,
      pageSize,
      sort,
    } = req.query;

    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
      return res.status(400).json({
        error: "validation_error",
        details: [
          {
            path: ["minPrice", "maxPrice"],
            message: "minPrice no puede ser mayor que maxPrice",
          },
        ],
      });
    }

    const where = {
      ...(category && { category }),
      ...(subCategory && { subCategory }),
      ...(condition && { condition }),
      ...(brand && { brand }),
      ...(color && { color }),
      ...(size && { size }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { brand: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(minPrice != null || maxPrice != null
        ? {
            price: {
              ...(minPrice != null && { gte: Number(minPrice) }),
              ...(maxPrice != null && { lte: Number(maxPrice) }),
            },
          }
        : {}),
    };

    let orderBy = { createdAt: "desc" };
    if (sort === "price_asc") orderBy = { price: "asc" };
    if (sort === "price_desc") orderBy = { price: "desc" };

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          photos: true,
          seller: { select: { id: true, username: true, country: true, avatar: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      items: items.map(toNumberPrice),
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (e) {
    next(e);
  }
});

// GET /listings/mine (mis publicaciones)
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.listing.findMany({
      where: { sellerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { photos: true },
    });
    res.json({ items: items.map(toNumberPrice), total: items.length });
  } catch (e) {
    next(e);
  }
});

// POST /listings (crear)
router.post("/create", requireAuth, validate(createListingSchema), async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      condition,
      category,
      subCategory,
      subSubCategory,
      brand,
      size,
      color,
      photos,
    } = req.body;

    const created = await prisma.listing.create({
      data: {
        title,
        description,
        price,
        condition,
        category,
        subCategory,
        subSubCategory,
        brand,
        size,
        color,
        sellerId: req.user.id,
        photos: { create: photos.map((p) => ({ url: p.url })) },
      },
      include: { photos: true },
    });

    res.status(201).json(toNumberPrice(created));
  } catch (e) {
    next(e);
  }
});

// PATCH /listings/:id (editar propio)
router.patch("/update/:id", requireAuth, validate(updateListingSchema), async (req, res, next) => {
  try {
    const { id } = req.params;

    const owned = await prisma.listing.findFirst({
      where: { id, sellerId: req.user.id },
    });
    if (!owned) return res.status(403).json({ error: "forbidden" });

    const { photos, ...data } = req.body;

    const updated = await prisma.listing.update({
      where: { id },
      data: {
        ...data,
        ...(photos
          ? {
              photos: {
                deleteMany: { listingId: id },
                create: photos.map((p) => ({ url: p.url })),
              },
            }
          : {}),
      },
      include: { photos: true },
    });

    res.json(toNumberPrice(updated));
  } catch (e) {
    next(e);
  }
});

// DELETE /listings/:id (borrar propio)
router.delete("/delete/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const owned = await prisma.listing.findFirst({
      where: { id, sellerId: req.user.id },
    });
    if (!owned) return res.status(403).json({ error: "forbidden" });

    await prisma.photo.deleteMany({ where: { listingId: id } });
    await prisma.favorite.deleteMany({ where: { listingId: id } }).catch(() => null);
    await prisma.listing.delete({ where: { id } });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// GET /listings/:id (detalle)
router.get("/detail/:id", async (req, res, next) => {
  try {
    const item = await prisma.listing.findUnique({
      where: { id: req.params.id },
      include: {
        photos: true,
        seller: {
          select: {
            id: true,
            username: true,
            email: true,
            country: true,
            avatar: true,
            listings: {
              take: 3,
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                title: true,
                price: true,
                photos: { take: 1 },
              },
            },
          },
        },
      },
    });
    if (!item) return res.status(404).json({ error: "not_found" });
    res.json(toNumberPrice(item));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
