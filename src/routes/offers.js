const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const validate = require("../middlewares/validate");
const { z } = require("zod");
const { normalizeListing } = require("../utils/photoUrls");
const { sendOfferEmailToSeller } = require("../email/sendOfferEmailToSeller");
const { createNotification } = require("../services/notificationService");

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

      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { seller: { select: { id: true, email: true, username: true, name: true } } },
      });
      if (!listing) return res.status(404).json({ error: "listing_not_found" });

      if (listing.sellerId === req.user.id)
        return res.status(400).json({ error: "cannot_offer_on_own_listing" });
      const existing = await prisma.offer.findFirst({
        where: {
          listingId,
          buyerId: req.user.id,
          status: { in: ["PENDING", "COUNTERED"] },
        },
      });

      if (existing)
        return res.status(400).json({ error: "offer_already_exists" });

      const offer = await prisma.offer.create({
        data: {
          amount,
          listingId,
          buyerId: req.user.id,
          sellerId: listing.sellerId,
        },
      });

      await createNotification({
        userId: listing.sellerId,
        type: "NEW_OFFER",
        title: "Te han hecho una nueva oferta",
        message: "Recibiste una nueva oferta por tu producto.",
        metadata: { offerId: offer.id, listingId, buyerId: req.user.id },
        preferenceKey: "emailSales",
        emailHandler: listing.seller?.email
          ? async () => {
              await sendOfferEmailToSeller({
                email: listing.seller.email,
                name: listing.seller.name || listing.seller.username,
                title: listing.title,
                amount,
              });
            }
          : null,
      });

      res.status(201).json(offer);
    } catch (e) {
      next(e);
    }
  }
);

// GET /offers/mine → Ofertas que YO hice
// GET /offers/mine → Ofertas que hice como comprador (paginado)
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    // 1️⃣ Leer query params (igual que orders / listings)
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);

    const safePage = page > 0 ? page : 1;
    const safePageSize =
      pageSize > 0 && pageSize <= 100 ? pageSize : 20;

    const skip = (safePage - 1) * safePageSize;
    const take = safePageSize;

    // 2️⃣ Where base: ofertas donde yo soy el comprador
    const where = {
      buyerId: req.user.id,
    };

    // 3️⃣ Query paginada + total
    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          listing: {
            include: {
              photos: { take: 1 },
              seller: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                },
              },
            },
          },
        },
      }),
      prisma.offer.count({ where }),
    ]);

    // 4️⃣ Normalizar listing (URLs absolutas, etc.)
    const normalized = offers.map((offer) => ({
      ...offer,
      listing: offer.listing
        ? normalizeListing(req, offer.listing)
        : offer.listing,
    }));

    // 5️⃣ Respuesta estándar (igual que orders / listings)
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


// GET /offers/received → Ofertas que me mandaron a mis publicaciones
// GET /offers/received → Ofertas que me hicieron (paginado)
router.get("/received", requireAuth, async (req, res, next) => {
  try {
    // 1️⃣ Leer query params (igual que orders / listings)
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);

    const safePage = page > 0 ? page : 1;
    const safePageSize =
      pageSize > 0 && pageSize <= 100 ? pageSize : 20;

    const skip = (safePage - 1) * safePageSize;
    const take = safePageSize;

    // 2️⃣ Where base: ofertas donde yo soy el vendedor
    const where = {
      sellerId: req.user.id,
    };

    // 3️⃣ Query paginada + total
    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          listing: {
            include: {
              photos: { take: 1 },
            },
          },
          buyer: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.offer.count({ where }),
    ]);

    // 4️⃣ Normalizar listing (URLs de imágenes, etc.)
    const normalized = offers.map((offer) => ({
      ...offer,
      listing: offer.listing
        ? normalizeListing(req, offer.listing)
        : offer.listing,
    }));

    // 5️⃣ Respuesta estándar (igual que orders / listings)
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
            acceptedPrice:
              status === "ACCEPTED"
                ? offer.counterOfferAmount ?? offer.amount
                : null,
          },
      });

      if (status === "ACCEPTED" || status === "REJECTED") {
        const type = status === "ACCEPTED" ? "OFFER_ACCEPTED" : "OFFER_REJECTED";
        const title =
          status === "ACCEPTED" ? "Tu oferta fue aceptada" : "Tu oferta fue rechazada";
        const message =
          status === "ACCEPTED"
            ? "El vendedor aceptó tu oferta."
            : "El vendedor rechazó tu oferta.";

        await createNotification({
          userId: offer.buyerId,
          type,
          title,
          message,
          metadata: { offerId: offer.id, listingId: offer.listingId },
          preferenceKey: "emailPurchases",
        });
      }

      res.json(updated);

    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
