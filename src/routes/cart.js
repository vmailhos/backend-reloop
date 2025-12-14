const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");

// GET /cart → obtener carrito del usuario
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: {
        listing: {
          include: { photos: { take: 1 } },
        },
      },
    });

    res.json(items);
  } catch (e) {
    next(e);
  }
});

// POST /cart/:listingId → agregar al carrito
router.post("/:listingId", requireAuth, async (req, res, next) => {
  try {
    const { listingId } = req.params;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: "listing_not_found" });

    if (listing.sellerId === req.user.id)
      return res.status(400).json({ error: "cannot_add_own_listing_to_cart" });

    const item = await prisma.cartItem.upsert({
      where: { userId_listingId: { userId: req.user.id, listingId } },
      create: { userId: req.user.id, listingId },
      update: {},
    });

    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
});

// DELETE /cart/:listingId → eliminar del carrito
router.delete("/:listingId", requireAuth, async (req, res, next) => {
  try {
    const { listingId } = req.params;
    await prisma.cartItem
      .delete({ where: { userId_listingId: { userId: req.user.id, listingId } } })
      .catch(() => null);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
