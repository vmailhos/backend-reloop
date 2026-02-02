const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const validate = require("../middlewares/validate");
const { z } = require("zod");
const { normalizeListing } = require("../utils/photoUrls");

//
// Schemas
//
const createOfferSchema = {
  body: z.object({
    amount: z.number().positive(),
  }),
  params: z.object({
    listingId: z.string().min(1),
  }),
};

const respondOfferSchema = {
  body: z.object({
    status: z.enum(["ACCEPTED", "REJECTED", "COUNTERED"]),
    counterAmount: z.number().positive().optional(),
  }),
  params: z.object({
    offerId: z.string().min(1),
  }),
};

//
// ENDPOINTS
//

// POST /offers/:listingId → Crear oferta
router.post(
  "/:listingId",
  requireAuth,
  validate(createOfferSchema),
  async (req, res, next) => {
    try {
      const { amount } = req.body;
      const { listingId } = req.params;

      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (!listing) return res.status(404).json({ error: "listing_not_found" });

      if (listing.sellerId === req.user.id)
        return res.status(400).json({ error: "cannot_offer_on_own_listing" });

      const offer = await prisma.offer.create({
        data: {
          amount,
          listingId,
          buyerId: req.user.id,
          sellerId: listing.sellerId,
        },
      });

      res.status(201).json(offer);
    } catch (e) {
      next(e);
    }
  }
);

// GET /offers/mine → Ofertas que YO hice
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const offers = await prisma.offer.findMany({
      where: { buyerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { include: { photos: { take: 1 } } },
        seller: { select: { id: true, username: true, avatar: true } },
      },
    });

    const normalized = offers.map((offer) => ({
      ...offer,
      listing: offer.listing ? normalizeListing(req, offer.listing) : offer.listing,
    }));
    res.json(normalized);
  } catch (e) {
    next(e);
  }
});

// GET /offers/received → Ofertas que me mandaron a mis publicaciones
router.get("/received", requireAuth, async (req, res, next) => {
  try {
    const offers = await prisma.offer.findMany({
      where: { sellerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { include: { photos: { take: 1 } } },
        buyer: { select: { id: true, username: true, avatar: true } },
      },
    });

    const normalized = offers.map((offer) => ({
      ...offer,
      listing: offer.listing ? normalizeListing(req, offer.listing) : offer.listing,
    }));
    res.json(normalized);
  } catch (e) {
    next(e);
  }
});

// PATCH /offers/respond/:offerId → Aceptar, rechazar o contraofertar
router.patch(
  "/respond/:offerId",
  requireAuth,
  validate(respondOfferSchema),
  async (req, res, next) => {
    try {
      const { offerId } = req.params;
      const { status, counterAmount } = req.body;

      const offer = await prisma.offer.findUnique({ where: { id: offerId } });

      if (!offer) return res.status(404).json({ error: "offer_not_found" });
      if (offer.sellerId !== req.user.id)
        return res.status(403).json({ error: "not_your_offer" });

      const updated = await prisma.offer.update({
        where: { id: offerId },
        data: {
          status,
          counterOfferAmount: status === "COUNTERED" ? counterAmount : null,
        },
      });

      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
