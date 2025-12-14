const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const { z } = require("zod");
const validate = require("../middlewares/validate");

const createOrderSchema = {
  body: z.object({
    listingIds: z.array(z.string().min(1)),
  }),
};

// POST /orders → crear compra desde carrito o compra directa
router.post("/", requireAuth, validate(createOrderSchema), async (req, res, next) => {
  try {
    const { listingIds } = req.body;

    const listings = await prisma.listing.findMany({
      where: { id: { in: listingIds } },
    });

    if (listings.length !== listingIds.length)
      return res.status(400).json({ error: "invalid_listing_ids" });

    const total = listings.reduce((acc, l) => acc + Number(l.price), 0);

    const order = await prisma.order.create({
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

    res.status(201).json(order);
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

    res.json(orders);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
