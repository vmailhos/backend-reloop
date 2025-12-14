const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const validate = require("../middlewares/validate");
const { z } = require("zod");

//
// ENUMS DE TALLE (CORRECTOS)
//

const TopSizeEnum = z.enum([
  "TS_XXS","TS_XS","TS_S","TS_M","TS_L","TS_XL","TS_XXL","TS_XXXL","TS_U"
]);

const BottomSizeEnum = z.enum([
  "TB_XXS","TB_XS","TB_S","TB_M","TB_L","TB_XL","TB_XXL","TB_U",
  "TB_30","TB_32","TB_34","TB_36","TB_38","TB_40","TB_42","TB_44","TB_46","TB_48"
]);

const ShoeSizeEnum = z.enum([
  "SH_33","SH_34","SH_35","SH_36","SH_37","SH_38","SH_39",
  "SH_40","SH_41","SH_42","SH_43","SH_44","SH_45","SH_46"
]);

const AccessorySizeEnum = z.enum([
  "A_U","A_S","A_M","A_L","A_XL"
]);

const KidsSizeEnum = z.enum([
  "K_0_3M","K_3_6M","K_6_9M","K_9_12M","K_12_18M","K_18_24M",
  "K_2","K_3","K_4","K_5","K_6","K_7","K_8","K_10","K_12","K_14","K_16"
]);

const KidsShoeSizeEnum = z.enum([
  "KS_16","KS_17","KS_18","KS_19","KS_20","KS_21","KS_22","KS_23",
  "KS_24","KS_25","KS_26","KS_27","KS_28","KS_29","KS_30","KS_31",
  "KS_32","KS_33"
]);


// ---------- Helpers ----------
const toNumberPrice = (l) =>
  l && typeof l.price === "string" ? { ...l, price: Number(l.price) } : l;

// ---------- Schemas ----------
const createListingSchema = {
  body: z.object({
    title: z.string().min(2, "Título muy corto"),
    description: z.string().optional(),
    price: z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/)]).transform(Number),
    condition: z.enum([
      "NUEVO_CON_ETIQUETA",
      "NUEVO_SIN_ETIQUETA",
      "MUY_BUENO",
      "BUENO",
      "SATISFACTORIO",
    ]),
    category: z.enum(["HOMBRE", "MUJER", "NINOS"]),
    subCategory: z.enum(["ROPA", "ACCESORIOS", "CALZADOS"]).optional(),
    subSubCategory: z.string().optional(),

    brand: z.string().optional(),
    color: z.string().optional(),

    sizeTop: TopSizeEnum.optional(),
    sizeBottom: BottomSizeEnum.optional(),
    sizeShoe: ShoeSizeEnum.optional(),
    sizeAccessory: AccessorySizeEnum.optional(),
    sizeKids: KidsSizeEnum.optional(),
    sizeKidsShoe: KidsShoeSizeEnum.optional(),

    photos: z.array(z.object({ url: z.string().min(1) })).default([]),
  }),
};

const listQuerySchema = {
  query: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    subSubCategory: z.string().optional(),
    condition: z.string().optional(),
    brand: z.string().optional(),
    color: z.string().optional(),

    sizeTop: z.string().optional(),
    sizeBottom: z.string().optional(),
    sizeShoe: z.string().optional(),
    sizeAccessory: z.string().optional(),
    sizeKids: z.string().optional(),
    sizeKidsShoe: z.string().optional(),

    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    sort: z.enum(["newest", "price_asc", "price_desc"]).default("newest").optional(),
  }),
};

const updateListingSchema = {
  body: z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    price: z.coerce.number().nonnegative().optional(),
    condition: z.enum([
      "NUEVO_CON_ETIQUETA",
      "NUEVO_SIN_ETIQUETA",
      "MUY_BUENO",
      "BUENO",
      "SATISFACTORIO",
    ]).optional(),
    category: z.enum(["HOMBRE", "MUJER", "NINOS"]).optional(),
    subCategory: z.enum(["ROPA", "ACCESORIOS", "CALZADOS"]).optional(),
    subSubCategory: z.string().optional(),

    brand: z.string().optional(),
    color: z.string().optional(),

    sizeTop: TopSizeEnum.optional(),
    sizeBottom: BottomSizeEnum.optional(),
    sizeShoe: ShoeSizeEnum.optional(),
    sizeAccessory: AccessorySizeEnum.optional(),
    sizeKids: KidsSizeEnum.optional(),
    sizeKidsShoe: KidsShoeSizeEnum.optional(),

    photos: z.array(z.object({ url: z.string().min(1) })).optional(),
  }),
};

// ---------- Rutas ----------

// GET /listings/all
router.get("/all", validate(listQuerySchema), async (req, res, next) => {
  try {
    const {
      search,
      category,
      subCategory,
      subSubCategory,
      condition,
      brand,
      color,
      sizeTop,
      sizeBottom,
      sizeShoe,
      sizeAccessory,
      sizeKids,
      sizeKidsShoe,
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

      ...(subCategory && subCategory !== "Todos" && { subCategory }),
      ...(subSubCategory && subSubCategory !== "Todos" && { subSubCategory }),

      ...(brand && { brand }),
      ...(condition && {
        condition: { in: condition.split(",") }
      }),
      ...(color && {
        color: { in: color.split(",") }
      }),


      ...(sizeTop && { sizeTop: { in: sizeTop.split(",") } }),
      ...(sizeBottom && { sizeBottom: { in: sizeBottom.split(",") } }),
      ...(sizeShoe && { sizeShoe: { in: sizeShoe.split(",") } }),
      ...(sizeAccessory && { sizeAccessory: { in: sizeAccessory.split(",") } }),
      ...(sizeKids && { sizeKids: { in: sizeKids.split(",") } }),
      ...(sizeKidsShoe && { sizeKidsShoe: { in: sizeKidsShoe.split(",") } }),

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

// GET /listings/mine
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

// POST /listings/create
router.post("/create", requireAuth, validate(createListingSchema), async (req, res, next) => {
  try {
    const created = await prisma.listing.create({
      data: {
        ...req.body,
        sellerId: req.user.id,
        photos: { create: req.body.photos.map((p) => ({ url: p.url })) },
      },
      include: { photos: true },
    });

    res.status(201).json(toNumberPrice(created));
  } catch (e) {
    next(e);
  }
});

// PATCH /listings/update/:id
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

// DELETE /listings/delete/:id
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

// GET /listings/detail/:id
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
// GET /listings/recommended 
router.get("/recommended", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 25;

    // 1) Obtener los top 100 por favoritos
    const top = await prisma.listing.findMany({
      take: 100,
      orderBy: {
        favorites: { _count: "desc" },
      },
      include: {
        photos: true,
        seller: {
          select: {
            id: true,
            username: true,
            avatar: true,
            country: true,
          },
        },
        _count: { select: { favorites: true } }
      }
    });

    // 2) Random shuffle
    const shuffled = top.sort(() => Math.random() - 0.5);

    // 3) Convertir precio a número y devolver limit
    res.json(shuffled.slice(0, limit).map(toNumberPrice));

  } catch (e) {
    next(e);
  }
});

// GET /listings/newest
router.get("/newest", async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 25;

    const latest = await prisma.listing.findMany({
      take: 100,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        photos: true,
        seller: {
          select: {
            id: true,
            username: true,
            avatar: true,
            country: true,
          },
        },
      },
    });

    // 2) Random shuffle
    const shuffled = latest.sort(() => Math.random() - 0.5);

    // 3) Convertir precios y devolver limit
    res.json(shuffled.slice(0, limit).map(toNumberPrice));

  } catch (e) {
    next(e);
  }
});


module.exports = router;
