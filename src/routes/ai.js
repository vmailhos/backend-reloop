const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const router = express.Router();

const upload = multer();

router.post("/analyze-image", upload.single("image"), async (req, res) => {
  console.log("FILE RECIBIDO:", req.file);

  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    const base64 = req.file.buffer.toString("base64");

    // 🔥 PROMPT COMPLETO
    const systemPrompt = `
Eres un sistema experto en análisis de productos para un marketplace de moda.

Tu tarea es analizar la imagen del producto y devolver ÚNICAMENTE un JSON válido con el siguiente esquema:

{
  "title": String,
  "description": String,
  "brand": String | null,
  "category": Category,
  "subCategory": SubCategory,
  "subSubCategory": SubSubCategory,
  "condition": Condition,
  "color": String | null,

  "sizeTop": TopSize | null,
  "sizeBottom": BottomSize | null,
  "sizeShoe": ShoeSize | null,
  "sizeKids": KidsSize | null,
  "sizeKidsShoe": KidsShoeSize | null,
  "sizeAccessory": AccessorySize | null
}

### ENUMS DISPONIBLES

Condition = [
  "NUEVO_CON_ETIQUETA","NUEVO_SIN_ETIQUETA",
  "MUY_BUENO","BUENO","SATISFACTORIO"
]

Category = ["HOMBRE","MUJER","NINOS"]

SubCategory = ["ROPA","ACCESORIOS","CALZADOS"]

SubSubCategory = [
  "Todos","Remeras","Camisas","Tops","Pantalones",
  "Bermudas","Shorts","Camperas","Vestidos","Buzos",
  "Faldas","Blazers","Carteras","Sombreros","Lentes",
  "Bijou","Cinturones","Guantes","Bufandas","Joyas",
  "Sandalias","Botas","Zapatillas","Tacos"
]

TopSize = ["TS_XXS","TS_XS","TS_S","TS_M","TS_L","TS_XL","TS_XXL","TS_XXXL","TS_U"]

BottomSize = [
  "TB_XXS","TB_XS","TB_S","TB_M","TB_L","TB_XL","TB_XXL","TB_U",
  "TB_30","TB_32","TB_34","TB_36","TB_38","TB_40","TB_42","TB_44","TB_46","TB_48"
]

ShoeSize = ["SH_33","SH_34","SH_35","SH_36","SH_37","SH_38","SH_39","SH_40","SH_41","SH_42","SH_43","SH_44","SH_45","SH_46"]

KidsSize = [
  "K_0_3M","K_3_6M","K_6_9M","K_9_12M","K_12_18M","K_18_24M",
  "K_2","K_3","K_4","K_5","K_6","K_7","K_8","K_10","K_12","K_14","K_16"
]

KidsShoeSize = [
  "KS_16","KS_17","KS_18","KS_19","KS_20","KS_21","KS_22",
  "KS_23","KS_24","KS_25","KS_26","KS_27","KS_28","KS_29","KS_30",
  "KS_31","KS_32","KS_33"
]

AccessorySize = ["A_U","A_S","A_M","A_L","A_XL"]

### REGLAS
- Si no puedes determinar un campo → usa null.
- No inventes información.
- Devuelve SOLO el JSON final, sin texto adicional.
`;

    // 🔥 REQUEST A OPENROUTER
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "Reloop AI"
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          {
            role: "system",
            content: [{ type: "text", text: systemPrompt }]
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analiza esta imagen y devuelve SOLO JSON." },
              { type: "image_url", image_url: `data:image/jpeg;base64,${base64}` }
            ]
          }
        ]
      })
    });

    // 🔥 Leer respuesta cruda
    let raw = await response.text();
    console.log("RAW AI ANSWER:", raw);

    // 🔥 Limpiar formatos extra
    let clean = raw
      .trim()
      .replace(/^```json/i, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (err) {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: clean
      });
    }

    return res.json(parsed);

  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({ error: "AI processing failed", details: err.message });
  }
});

module.exports = router;
