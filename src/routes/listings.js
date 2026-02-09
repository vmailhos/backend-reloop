const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const validate = require("../middlewares/validate");
const { z } = require("zod");
const { normalizeListing } = require("../utils/photoUrls");
const optionalAuth = require("../middlewares/optionalAuth");
const { enrichListingWithDiscount, buildDiscountFilters } = require("../utils/discountUtils");
const { sendNewListingEmail } = require("../email/sendNewListingEmail");

// Helper: Build seller filter to exclude current user's listings
const getSellerFilter = (req) => {
  if (!req.user?.id) return {};

  return {
    NOT: {
      seller: {
        id: req.user.id,
      },
    },
  };
};


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

// Helper to normalize a single listing with photos + discount info
const enrichListing = (req, listing) => {
  const normalized = normalizeListing(req, toNumberPrice(listing));
  return enrichListingWithDiscount(normalized);
};

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
    
    // Discount: 0-90% or null/undefined for no discount
    discountPercent: z.coerce.number().min(0, "Descuento mínimo es 0%").max(90, "Descuento máximo es 90%").optional().nullable(),
    photos: z.array(z.union([
      z.string().url(),
      z.object({ url: z.string().url() })
    ])).optional(),
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
    
    // Discount filters
    onSaleOnly: z.coerce.boolean().optional(),
    minDiscount: z.coerce.number().min(0).max(90).optional(),
    
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
    sort: z.enum(["newest", "price_asc", "price_desc", "discount_desc"]).default("newest").optional(),
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
    
    // Discount: 0-90% or null to remove discount
    discountPercent: z.coerce.number().min(0, "Descuento mínimo es 0%").max(90, "Descuento máximo es 90%").optional().nullable(),

    brand: z.string().optional(),
    color: z.string().optional(),

    sizeTop: TopSizeEnum.optional(),
    sizeBottom: BottomSizeEnum.optional(),
    sizeShoe: ShoeSizeEnum.optional(),
    sizeAccessory: AccessorySizeEnum.optional(),
    sizeKids: KidsSizeEnum.optional(),
    sizeKidsShoe: KidsShoeSizeEnum.optional(),
  }),
};

// ---------- Rutas ----------

// GET /listings/all
router.get("/all", optionalAuth, validate(listQuerySchema), async (req, res, next) => {
  try {
    // Debug logging
    const sellerFilter = getSellerFilter(req);
    if (req.user) {
      console.log(`[/listings/all] Authenticated user: ${req.user.id} (${req.user.username}) - will exclude their listings`);
    } else {
      console.log("[/listings/all] Unauthenticated request - showing all listings");
    }

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
      onSaleOnly,
      minDiscount,
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
      status: "available",
      ...getSellerFilter(req),
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
      
      // Apply discount filters
      ...buildDiscountFilters({ onSaleOnly, minDiscount }),
    };


    let orderBy = { createdAt: "desc" };
    if (sort === "price_asc") orderBy = { price: "asc" };
    if (sort === "price_desc") orderBy = { price: "desc" };
    if (sort === "discount_desc") orderBy = { discountPercent: "desc" };

    const rawPage = Number(page);
    const rawPageSize = Number(pageSize);

    const safePage = Number.isFinite(rawPage) && rawPage > 0 ? Math.trunc(rawPage) : 1;
    const safePageSize =
      Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.trunc(rawPageSize) : 20;

    const skip = Number.isFinite((safePage - 1) * safePageSize)
      ? (safePage - 1) * safePageSize
      : 0;
    const take = Number.isFinite(safePageSize) ? safePageSize : 20;

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
      items: items.map((item) => enrichListing(req, item)),
      total,
      page: safePage,
      pageSize: safePageSize,
    });
  } catch (e) {
    next(e);
  }
});

// GET /listings/mine
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const safePage = page > 0 ? page : 1;
    const safePageSize = pageSize > 0 && pageSize <= 100 ? pageSize : 20;

    const skip = (safePage - 1) * safePageSize;
    const take = safePageSize;

    const where = { sellerId: req.user.id };

    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          photos: true,
          seller: {
            select: { id: true, username: true, country: true, avatar: true },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      items: items.map((item) => enrichListing(req, item)),
      total,
      page: safePage,
      pageSize: safePageSize,
    });
  } catch (e) {
    next(e);
  }
});


// POST /listings/create
router.post("/create", requireAuth, validate(createListingSchema), async (req, res, next) => {
  try {
    // Normalize photos: accept array of strings (paths) or objects with url field
    const photosList = req.body.photos || [];
    const validPhotos = photosList
      .map((p, index) => {
        if (typeof p === "string") return { url: p, order: index };
        if (p && typeof p === "object" && p.url) {
          return { url: p.url, order: index };
        }
        return null;
      })
      .filter(Boolean);


    const created = await prisma.listing.create({
      data: {
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        condition: req.body.condition,
        category: req.body.category,
        subCategory: req.body.subCategory,
        subSubCategory: req.body.subSubCategory,
        brand: req.body.brand,
        color: req.body.color,
        sizeTop: req.body.sizeTop,
        sizeBottom: req.body.sizeBottom,
        sizeShoe: req.body.sizeShoe,
        sizeAccessory: req.body.sizeAccessory,
        sizeKids: req.body.sizeKids,
        sizeKidsShoe: req.body.sizeKidsShoe,
        discountPercent: req.body.discountPercent || null,
        sellerId: req.user.id,
        ...(validPhotos.length > 0
          ? {
              photos: {
                create: validPhotos,
              },
            }
          : {}),
      },
      include: { photos: true },
    });

    (async () => {
      try {
        console.log("[MAIL] Intentando enviar mail de nueva publicación");
        console.log("[MAIL] Destinatario:", req.user.email);
        await sendNewListingEmail({
          email: req.user.email,
          name: req.user.name || req.user.username,
          title: created.title,
        });
        console.log("[MAIL] Mail de nueva publicación enviado correctamente");
      } catch (err) {
        console.error("[MAIL] Error enviando mail de nueva publicación");
        console.error(err);
      }
    })();

    res.status(201).json(enrichListing(req, created));
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

    // Normalize photos: accept array of strings (paths) or objects with url field
    const photosList = photos || [];
    const validPhotos = Array.isArray(photosList)
      ? photosList
          .map((p) => {
            if (typeof p === "string") return { url: p };
            if (p && typeof p === "object" && p.url) return { url: p.url };
            return null;
          })
          .filter((p) => p !== null && p.url && p.url.length > 0)
      : [];

    const updated = await prisma.listing.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        condition: data.condition,
        category: data.category,
        subCategory: data.subCategory,
        subSubCategory: data.subSubCategory,
        brand: data.brand,
        color: data.color,
        sizeTop: data.sizeTop,
        sizeBottom: data.sizeBottom,
        sizeShoe: data.sizeShoe,
        sizeAccessory: data.sizeAccessory,
        sizeKids: data.sizeKids,
        sizeKidsShoe: data.sizeKidsShoe,
        discountPercent: data.discountPercent !== undefined ? data.discountPercent : undefined,
        ...(validPhotos.length > 0
          ? {
              photos: {
                deleteMany: { listingId: id },
                create: validPhotos,
              },
            }
          : {}),
      },
      include: { photos: true },
    });

    res.json(enrichListing(req, updated));
  } catch (e) {
    next(e);
  }
});

router.delete("/delete/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const owned = await prisma.listing.findFirst({
      where: { id, sellerId: req.user.id },
    });
    if (!owned) return res.status(403).json({ error: "forbidden" });

    // 🔥 BORRAR TODO LO RELACIONADO
    await prisma.comment.deleteMany({ where: { listingId: id } });
    await prisma.favorite.deleteMany({ where: { listingId: id } });
    await prisma.offer.deleteMany({ where: { listingId: id } });
    await prisma.cartItem.deleteMany({ where: { listingId: id } });
    await prisma.orderItem.deleteMany({ where: { listingId: id } });
    await prisma.photo.deleteMany({ where: { listingId: id } });

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
                discountPercent: true,
                photos: { take: 1 },
              },
            },
          },
        },
      },
    });

    if (!item) return res.status(404).json({ error: "not_found" });

    // Enrich the main listing and nested seller listings with discount info
    const enrichedItem = enrichListing(req, item);
    if (enrichedItem.seller?.listings) {
      enrichedItem.seller.listings = enrichedItem.seller.listings.map(listing => 
        enrichListingWithDiscount(normalizeListing(req, toNumberPrice(listing)))
      );
    }

    res.json(enrichedItem);
  } catch (e) {
    next(e);
  }
});
// GET /listings/recommended 
router.get("/recommended", optionalAuth, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 25;

    // 1) Obtener los top 100 por favoritos
    const top = await prisma.listing.findMany({
      take: 100,
      orderBy: {
        favorites: { _count: "desc" },
      },
      where: {
        status: "available",
        ...getSellerFilter(req),
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

    // 3) Enrich with discount info and return limit
    res.json(
      shuffled.slice(0, limit).map((item) => enrichListing(req, item))
    );

  } catch (e) {
    next(e);
  }
});

// GET /listings/newest
router.get("/newest", optionalAuth, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 25;

    const latest = await prisma.listing.findMany({
      take: 100,
      orderBy: {
        createdAt: "desc",
      },
      where: {
        status: "available",
        ...getSellerFilter(req),
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

    // 3) Enrich with discount info and return limit
    res.json(
      shuffled.slice(0, limit).map((item) => enrichListing(req, item))
    );

  } catch (e) {
    next(e);
  }
});
// GET /listings/by-user/:sellerId
router.get("/by-user/:sellerId", async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;

    const safePage = page > 0 ? page : 1;
    const safePageSize = pageSize > 0 && pageSize <= 100 ? pageSize : 20;

    const skip = (safePage - 1) * safePageSize;
    const take = safePageSize;

    const where = {
      sellerId,
      status: "available",
    };

    // Note: by-user endpoint shows a specific seller's profile listings
    // Do NOT filter out own listings here - sellers should see their own on their profile

    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
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
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      items: items.map((item) => enrichListing(req, item)),
      total,
      page: safePage,
      pageSize: safePageSize,
    });
  } catch (e) {
    next(e);
  }
});


module.exports = router;
