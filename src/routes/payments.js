const router = require("express").Router();
const { prisma } = require("../db");
const requireAuth = require("../middlewares/requireAuth");
const { z } = require("zod");
const validate = require("../middlewares/validate");
const crypto = require("crypto");

const { MercadoPagoConfig, Preference } = require("mercadopago");

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const preferenceClient = new Preference(mpClient);


const createPreferenceSchema = {
  body: z.object({
    listingIds: z.array(z.string().min(1)).min(1),
    shipping: z.object({
      provider: z.literal("DAC"),
      type: z.enum(["HOME", "AGENCY"]),
      data: z.any(),
    }),
  }),
};

router.post(
  "/mercadopago/preference",
  requireAuth,
  validate(createPreferenceSchema),
  async (req, res, next) => {
    try {
      const { listingIds } = req.body;
      const uniqueListingIds = [...new Set(listingIds)];

      const listings = await prisma.listing.findMany({
        where: { id: { in: uniqueListingIds } },
        include: { seller: { select: { id: true } } },
      });

      if (listings.length !== uniqueListingIds.length) {
        return res.status(400).json({ error: "invalid_listing_ids" });
      }

      const unavailable = listings.find((l) => l.status !== "available");
      if (unavailable) return res.status(409).json({ error: "listing_unavailable" });

      // Regla actual: un solo seller por orden
      const firstSellerId = listings[0]?.sellerId;
      const notSameSeller = listings.some((l) => l.sellerId !== firstSellerId);
      if (notSameSeller) return res.status(400).json({ error: "listings_not_same_seller" });

      const subtotal = listings.reduce((acc, l) => acc + Number(l.price), 0);
      const commissionPct = 3;
      const commission = Number((subtotal * 0.03).toFixed(2));
      const totalAmount = Number((subtotal + commission).toFixed(2));

      // Identificador tuyo (para atar vuelta del pago con el intento)
      const externalReference = crypto.randomUUID();

      // ⚠️ URLs: en dev usá ngrok para que MP pueda redirigir
      const FRONT_URL = "https://reloop-uy.com"; // ej: https://xxxx.ngrok-free.app
      const back_urls = {
        success: `${FRONT_URL}/orders/success`,
        failure: `${FRONT_URL}/orders/failure`,
        pending: `${FRONT_URL}/orders/success?status=pending`,
      };

      const preferenceBody = {
        items: [
          {
            title: `Compra Reloop (${listings.length} producto/s)`,
            quantity: 1,
            unit_price: totalAmount, // lo que paga el buyer (incluye comisión)
            currency_id: "UYU",
          },
        ],
        back_urls,
        auto_return: "approved",
        external_reference: externalReference,
            metadata: {
            listingIds: uniqueListingIds,
            commissionPct,
            shipping: req.body.shipping,
            }

      };

      const mpResp = await preferenceClient.create({
        body: preferenceBody,
        });
        const { id, init_point, sandbox_init_point } = mpResp;

        return res.json({
        preferenceId: id,
        init_point,
        sandbox_init_point,
        externalReference,
        });

    } catch (e) {
      next(e);
    }
  }
);

const { Payment } = require("mercadopago");

const paymentClient = new Payment(mpClient);

router.post(
  "/mercadopago/confirm",
  requireAuth,
  async (req, res, next) => {
    try {
      const {
        payment_id,
        merchant_order_id,
        external_reference,
        collection_id
      } = req.body;

      const finalPaymentId = payment_id || collection_id;

      if (!finalPaymentId) {
        return res.status(400).json({ error: "payment_id_required" });
      }

      const mpPayment = await paymentClient.get({ id: finalPaymentId });


      if (mpPayment.status !== "approved") {
        return res.status(400).json({ error: "payment_not_approved" });
      }

      console.log("MP PAYMENT FULL:", JSON.stringify(mpPayment, null, 2));

      // Mercado Pago devuelve metadata dentro del payment
      const metadata = mpPayment.metadata || {};

      const listingIds =
        metadata.listingIds ||
        metadata.listing_ids ||
        [];

      const shipping = metadata.shipping || null;


if (!listingIds.length) {
  return res.status(400).json({ error: "missing_listing_ids" });
}

// 🔹 Traer listings reales desde DB
const listings = await prisma.listing.findMany({
  where: { id: { in: listingIds } },
});

if (listings.length !== listingIds.length) {
  return res.status(400).json({ error: "invalid_listing_ids" });
}

// Validar que sigan disponibles
const unavailable = listings.find(l => l.status !== "available");
if (unavailable) {
  return res.status(409).json({ error: "listing_unavailable" });
}

// 🔹 Calcular montos
const subtotal = listings.reduce(
  (acc, l) => acc + Number(l.price),
  0
);

const commission = Number((subtotal * 0.03).toFixed(2));
const totalAmount = Number((subtotal + commission).toFixed(2));

// 🔹 Crear orden
const order = await prisma.$transaction(async (tx) => {

  // marcar listings como vendidas
  await tx.listing.updateMany({
    where: { id: { in: listingIds }, status: "available" },
    data: { status: "sold" },
  });

  const createdOrder = await tx.order.create({
    data: {
      buyerId: req.user.id,
      subtotal,
      commission,
      commissionPct: 3,
      totalAmount,
      status: "PAID",
      shippingProvider: "DAC",
      shippingType: shipping?.type,
      shippingData: shipping?.data,
      items: {
        create: listings.map((l) => ({
          listingId: l.id,
          price: l.price,
        })),
      },
    },
    include: { items: true },
  });

  return createdOrder;
});

      return res.json({ order });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
