const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const { z } = require("zod");
const validate = require("../middlewares/validate");
const { normalizeListing } = require("../utils/photoUrls");
const { createNotification } = require("../services/notificationService");
const { sendSaleEmailToSeller } = require("../email/sendSaleEmailToSeller");
const { sendPurchaseEmailToBuyer } = require("../email/sendPurchaseEmailToBuyer");
const { getDacAgencyById } = require("../utils/dacAgencies"); 
// Ajustá path a tu estructura real

const shippingSchema = z.object({
  provider: z.literal("DAC"),
  type: z.enum(["HOME", "AGENCY"]),
  data: z.any(), // validamos abajo con superRefine
});

const createOrderSchema = {
  body: z.object({
    listingIds: z.array(z.string().min(1)).min(1),
    shipping: shippingSchema,
  }).superRefine((val, ctx) => {
    const { type, data } = val.shipping;

    if (type === "HOME") {
      const homeSchema = z.object({
        name: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().min(6),
        address: z.object({
          street: z.string().min(1),
          apartment: z.string().optional(),
          department: z.string().min(1),
          locality: z.string().min(1),
        }),
        observations: z.string().optional(),
      });

      const parsed = homeSchema.safeParse(data);
      if (!parsed.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_shipping_home_data" });
      }
    }

    if (type === "AGENCY") {
      const agencySchema = z.object({
        agencyId: z.string().min(1),
        pickupPerson: z.object({
          name: z.string().min(1),
          lastName: z.string().min(1),
          phone: z.string().min(6),
        }),
      });

      const parsed = agencySchema.safeParse(data);
      if (!parsed.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid_shipping_agency_data" });
      }
    }
  }),
};


// POST /orders → crear compra desde carrito o compra directa
router.post("/", requireAuth, validate(createOrderSchema), async (req, res, next) => {
  try {
    const { listingIds, shipping } = req.body;

    const uniqueListingIds = [...new Set(listingIds)];

    if (uniqueListingIds.length !== listingIds.length) {
      return res.status(400).json({ error: "duplicate_listing_ids" });
    }

    const listings = await prisma.listing.findMany({
      where: { id: { in: uniqueListingIds } },
      include: {
        seller: { select: { id: true, email: true, username: true, name: true } },
      },
    });

    if (listings.length !== uniqueListingIds.length)
      return res.status(400).json({ error: "invalid_listing_ids" });

    const ownListing = listings.find((l) => l.sellerId === req.user.id);
    if (ownListing) return res.status(400).json({ error: "cannot_buy_own_listing" });

    const unavailable = listings.find((l) => l.status !== "available");
    if (unavailable) return res.status(409).json({ error: "listing_unavailable" });

   const subtotal = listings.reduce(
      (acc, l) => acc + Number(l.price),
      0
    );

    const COMMISSION_PCT = 0.03;
    const commission = Number((subtotal * COMMISSION_PCT).toFixed(2));
    const totalAmount = Number((subtotal + commission).toFixed(2));


    const firstSellerId = listings[0]?.sellerId;
    const notSameSeller = listings.some(l => l.sellerId !== firstSellerId);
    if (notSameSeller) return res.status(400).json({ error: "listings_not_same_seller" });

    let shippingData = null;

if (shipping.type === "HOME") {
  const { name, lastName, phone, address, observations } = shipping.data;
  shippingData = {
    type: "HOME",
    name,
    lastName,
    phone,
    address,
    observations: observations ?? null,
  };
}


if (shipping.type === "AGENCY") {
  const { agencyId, pickupPerson } = shipping.data;

  const agency = getDacAgencyById(agencyId);
  if (!agency) return res.status(400).json({ error: "invalid_agency" });

  shippingData = {
    type: "AGENCY",
    agency,       // viene del backend hardcodeado
    pickupPerson, // viene del frontend
  };
}


    const order = await prisma.$transaction(async (tx) => {
      const updated = await tx.listing.updateMany({
        where: { id: { in: uniqueListingIds }, status: "available" },
        data: { status: "sold" },
      });

      if (updated.count !== uniqueListingIds.length) {
        const err = new Error("listing_unavailable");
        err.status = 409;
        throw err;
      }

      const createdOrder = await tx.order.create({
  data: {
    buyerId: req.user.id,

    subtotal,
    commission,
    commissionPct: 3,
    totalAmount,

    status: "PAID",

    shippingProvider: "DAC",
    shippingType: shipping.type,
    shippingData,

    items: {
      create: listings.map((l) => ({
        listingId: l.id,
        price: l.price, // precio real del producto
      })),
    },
  },
  include: { items: true },
});

      await tx.cartItem.deleteMany({
        where: { listingId: { in: uniqueListingIds } },
      });

    await tx.offer.updateMany({
      where: {
        listingId: { in: uniqueListingIds },
        status: { in: ["PENDING", "COUNTERED", "ACCEPTED"] },
      },
      data: {
        status: "EXPIRED",
        acceptedPrice: null,
      },
    });

      return createdOrder;
    });

    await createNotification({
      userId: req.user.id,
      type: "PURCHASE_CONFIRMED",
      title: "Compra realizada con éxito",
      message: "Tu pedido fue confirmado correctamente.",
      metadata: { orderId: order.id },
      preferenceKey: "emailPurchases",
      emailHandler: async () => {
        const buyerName = req.user.name || req.user.username;
        for (const listing of listings) {
          await sendPurchaseEmailToBuyer({
            email: req.user.email,
            name: buyerName,
            title: listing.title,
          });
        }
      },
    });

    const sellerIds = [...new Set(listings.map((l) => l.sellerId))];
    for (const sellerId of sellerIds) {
      const sellerListings = listings.filter((l) => l.sellerId === sellerId);
      for (const listing of sellerListings) {
        const seller = listing.seller;
        await createNotification({
          userId: sellerId,
          type: "NEW_SALE",
          title: "Tienes una nueva venta",
          message: "Tu producto fue vendido.",
          metadata: { orderId: order.id, listingId: listing.id },
          preferenceKey: "emailSales",
          emailHandler: seller?.email
            ? async () => {
                await sendSaleEmailToSeller({
                  email: seller.email,
                  name: seller.name || seller.username,
                  title: listing.title,
                });
              }
            : null,
        });
      }
    }

res.status(201).json({
  order: {
    id: order.id,

    subtotal: order.subtotal,
    commission: order.commission,
    commissionPct: order.commissionPct,
    totalAmount: order.totalAmount,

    createdAt: order.createdAt,
    status: order.status,

    shipping: {
      provider: order.shippingProvider,
      type: order.shippingType,
      data: order.shippingData,
    },

    items: order.items.map((item) => ({
      listingId: item.listingId,
      price: item.price,
    })),
  },
});


  } catch (e) {
    if (e?.status) {
      return res.status(e.status).json({ error: e.message });
    }
    next(e);
  }
});

// GET /orders/sales → ventas del usuario (orders donde es vendedor)
// GET /orders/sales → ventas del usuario (paginado)
router.get("/sales", requireAuth, async (req, res, next) => {
  try {
    // 1️⃣ Leer query params
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 16;

    const safePage = page > 0 ? page : 1;
    const safePageSize =
      pageSize > 0 && pageSize <= 100 ? pageSize : 16;

    const skip = (safePage - 1) * safePageSize;
    const take = safePageSize;

    // 2️⃣ Where base (ventas donde el usuario es vendedor)
    const where = {
      items: {
        some: {
          listing: {
            sellerId: req.user.id,
          },
        },
      },
    };

    // 3️⃣ Query paginada + count total
    const [sales, total] = await Promise.all([
  prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      createdAt: true,
      status: true,
      totalAmount: true,

      // ✅ SHIPPING
      shippingProvider: true,
      shippingType: true,
      shippingData: true,

      buyer: { select: { username: true } },

      items: {
        where: {
          listing: { sellerId: req.user.id },
        },
        select: {
          id: true,
          price: true,
          listing: {
            select: {
              id: true,
              title: true,
              photos: { take: 1 },
            },
          },
        },
      },
    },
  }),
  prisma.order.count({ where }),
]);


    const normalized = sales.map((order) => ({
  ...order,
  shipping: order.shippingType
    ? {
        provider: order.shippingProvider,
        type: order.shippingType,
        data: order.shippingData,
      }
    : null,
}));


    // 5️⃣ Respuesta estándar
    res.json({
      items: normalized,
      total,
      page: safePage,
      pageSize: safePageSize,
    });
  } catch (e) {
    next(e);
  }
});


// GET /orders → compras del usuario
// GET /orders → compras del usuario (paginado)
router.get("/", requireAuth, async (req, res, next) => {
  try {
    // 1️⃣ Leer query params
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 16;

    const safePage = page > 0 ? page : 1;
    const safePageSize =
      pageSize > 0 && pageSize <= 100 ? pageSize : 16;

    const skip = (safePage - 1) * safePageSize;
    const take = safePageSize;

    // 2️⃣ Where base (compras del usuario)
    const where = {
      buyerId: req.user.id,
    };

    // 3️⃣ Query paginada + count total
    const [orders, total] = await Promise.all([
  prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      createdAt: true,
      status: true,
      subtotal: true,
      commission: true,
      commissionPct: true,
      totalAmount: true,

      // ✅ SHIPPING (CLAVE)
      shippingProvider: true,
      shippingType: true,
      shippingData: true,

      items: {
        select: {
          id: true,
          price: true,
          listing: {
            select: {
              id: true,
              title: true,
              photos: { take: 1 },
              seller: { select: { username: true } },
            },
          },
        },
      },
    },
  }),
  prisma.order.count({ where }),
]);

const normalized = orders.map((order) => ({
  ...order,
  shipping: order.shippingType
    ? {
        provider: order.shippingProvider,
        type: order.shippingType,
        data: order.shippingData,
      }
    : null,
}));

    // 5️⃣ Respuesta estándar (igual a listings)
res.json({
  items: normalized,
  total,
  page: safePage,
  pageSize: safePageSize,
});

  } catch (e) {
    next(e);
  }
});


// GET /orders/:id → detalle completo de una compra
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        buyerId: req.user.id, // seguridad
      },
      include: {
        items: {
          include: {
            listing: {
              include: {
                photos: { take: 1 },
                seller: { select: { username: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "order_not_found" });
    }

const normalizedOrder = {
  ...order,
  shipping: order.shippingType
    ? {
        provider: order.shippingProvider,
        type: order.shippingType,
        data: order.shippingData,
      }
    : null,
  items: order.items.map((item) =>
    item.listing
      ? { ...item, listing: normalizeListing(req, item.listing) }
      : item
  ),
};


    res.json(normalizedOrder);
  } catch (e) {
    next(e);
  }
});

// GET /orders/sales/:id → detalle de venta (vista vendedor)
router.get("/sales/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        items: {
          some: {
            listing: {
              sellerId: req.user.id,
            },
          },
        },
      },
      include: {
        buyer: {
          select: { username: true, email: true },
        },
        items: {
          where: {
            listing: {
              sellerId: req.user.id,
            },
          },
          include: {
            listing: {
              include: {
                photos: { take: 1 },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "sale_not_found" });
    }

    const normalized = {
      ...order,
      shipping: order.shippingType
        ? {
            provider: order.shippingProvider,
            type: order.shippingType,
            data: order.shippingData,
          }
        : null,
      items: order.items.map((item) =>
        item.listing
          ? { ...item, listing: normalizeListing(req, item.listing) }
          : item
      ),
    };

    res.json(normalized);
  } catch (e) {
    next(e);
  }
});
// POST /orders/:id/mark-received
router.post("/:id/mark-received", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        buyerId: req.user.id,
        status: "SHIPPED",
      },
    });

    if (!order) {
      return res.status(404).json({ error: "order_not_found_or_not_allowed" });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "COMPLETED",
        receivedAt: new Date(),
      },
    });

    // 🔔 Notificación al vendedor
    const sellerId = await prisma.orderItem.findFirst({
      where: { orderId: id },
      select: { listing: { select: { sellerId: true } } },
    });

    if (sellerId?.listing?.sellerId) {
      await createNotification({
        userId: sellerId.listing.sellerId,
        type: "ORDER_RECEIVED",
        title: "El comprador confirmó la recepción",
        message: "El comprador confirmó la recepción de tu venta.",
        metadata: { orderId: id },
        preferenceKey: "emailSales",
      });
    }

    res.json({ success: true, order: updated });
  } catch (e) {
    next(e);
  }
});

// POST /orders/:id/mark-shipped
router.post("/:id/mark-shipped", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ticketUrl } = req.body;

    if (!ticketUrl) {
      return res.status(400).json({ error: "ticket_required" });
    }

    // Buscar orden donde el user sea vendedor
    const order = await prisma.order.findFirst({
      where: {
        id,
        status: "PAID",
        items: {
          some: {
            listing: {
              sellerId: req.user.id,
            },
          },
        },
      },
      include: {
        buyer: { select: { id: true, email: true, name: true, username: true } },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "order_not_found_or_not_allowed" });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: "SHIPPED",
        shippingTicketUrl: ticketUrl,
        shippedAt: new Date(),
      },
    });

    // 🔔 Notificación al comprador
    await createNotification({
      userId: order.buyer.id,
      type: "ORDER_SHIPPED",
      title: "Tu pedido fue enviado",
      message: "El vendedor ya despachó tu compra.",
      metadata: { orderId: order.id },
      preferenceKey: "emailPurchases",
      emailHandler: async () => {
        await sendPurchaseEmailToBuyer({
          email: order.buyer.email,
          name: order.buyer.name || order.buyer.username,
          title: "Tu pedido fue enviado",
          ticketUrl,
        });
      },
    });

    res.json({ success: true, order: updated });
  } catch (e) {
    next(e);
  }
});


module.exports = router;
