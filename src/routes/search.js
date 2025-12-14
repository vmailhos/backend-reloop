const express = require("express");
const prisma = require("../lib/prisma");
const router = express.Router();

router.get("/", async (req, res) => {
  const q = req.query.q;

  if (!q || q.trim().length < 2) {
    return res.json([]);
  }

  try {
    const results = await prisma.$queryRaw`
      SELECT 
        "id",
        "title",
        "description",
        "price",
        "brand",
        "color",
        "sellerId",
        "createdAt",
        ts_rank(
          "search_vector",
          plainto_tsquery('spanish', immutable_unaccent(${q}))
        ) AS "fts_rank",
        similarity(
          immutable_unaccent("title"),
          immutable_unaccent(${q})
        ) AS "trigram_rank"
      FROM "Listing"
      WHERE 
            "search_vector" @@ plainto_tsquery('spanish', immutable_unaccent(${q}))
         OR immutable_unaccent("title") % immutable_unaccent(${q})
      ORDER BY 
        "fts_rank" DESC,
        "trigram_rank" DESC,
        "createdAt" DESC
      LIMIT 50;
    `;

    return res.json(results);
  } catch (err) {
    console.error("🔥 Error en /search:", err);
    return res.status(500).json({
      error: "Error al buscar listings",
      details: err.message,
    });
  }
});

module.exports = router;


