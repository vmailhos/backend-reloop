const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const { z } = require("zod");
const validate = require("../middlewares/validate");
const { normalizeListing } = require("../utils/photoUrls");
const { createNotification } = require("../utils/notificationHelper");

const createOrderSchema = {
  body: z.object({
    listingIds: z.array(z.string().min(1)).min(1),
  }),
};

// POST /orders → crear compra desde carrito o compra directa
router.post("/", requireAuth, validate(createOrderSchema), async (req, res, next) => {
  try {
    const { listingIds } = req.body;
    const uniqueListingIds = [...new Set(listingIds)];

    if (uniqueListingIds.length !== listingIds.length) {
      return res.status(400).json({ error: "duplicate_listing_ids" });
    }

    const listings = await prisma.listing.findMany({
      where: { id: { in: uniqueListingIds } },
    });

    if (listings.length !== uniqueListingIds.length)
      return res.status(400).json({ error: "invalid_listing_ids" });

    const ownListing = listings.find((l) => l.sellerId === req.user.id);
    if (ownListing) return res.status(400).json({ error: "cannot_buy_own_listing" });

    const unavailable = listings.find((l) => l.status !== "available");
    if (unavailable) return res.status(409).json({ error: "listing_unavailable" });

    const total = listings.reduce((acc, l) => acc + Number(l.price), 0);

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
          totalAmount: total,
          items: {
            create: listings.map((l) => ({
              listingId: l.id,
              price: l.price,
            })),
          },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({
        where: { listingId: { in: uniqueListingIds } },
      });

      // Create notification for buyer
      await createNotification(
        tx,
        req.user.id,
        "purchase",
        "Gracias por tu compra",
        "Tu compra fue realizada con éxito",
        { orderId: createdOrder.id }
      );

      // Create notifications for each seller
      const sellerIds = [...new Set(listings.map((l) => l.sellerId))];
      for (const sellerId of sellerIds) {
        const sellerListings = listings.filter((l) => l.sellerId === sellerId);
        for (const listing of sellerListings) {
          await createNotification(
            tx,
            sellerId,
            "sale",
            "¡Felicitaciones por tu venta!",
            "Vendiste un producto",
            { orderId: createdOrder.id, listingId: listing.id }
          );
        }
      }

      return createdOrder;
    });

    res.status(201).json({
      order: {
        id: order.id,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
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
router.get("/sales", requireAuth, async (req, res, next) => {
  try {
    const sales = await prisma.order.findMany({
      where: {
        items: {
          some: {
            listing: {
              sellerId: req.user.id,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        buyer: {
          select: { username: true },
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

    // Normalize photos in listings
    const normalized = sales.map((order) => ({
      ...order,
      items: order.items.map((item) =>
        item.listing ? { ...item, listing: normalizeListing(req, item.listing) } : item
      ),
    }));

    res.json(normalized);
  } catch (e) {
    next(e);
  }
});

// GET /orders → compras del usuario
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { buyerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            listing: {
              include: { photos: { take: 1 }, seller: { select: { username: true } } },
            },
          },
        },
      },
    });

    const normalized = orders.map((order) => ({
      ...order,
      items: order.items.map((item) =>
        item.listing ? { ...item, listing: normalizeListing(req, item.listing) } : item
      ),
    }));

    res.json(normalized);
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


module.exports = router;
