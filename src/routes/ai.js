// src/routes/ai.js
const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");

const router = express.Router();
const upload = multer();

/**
 * Crea el cliente “on-demand” para que el servidor NO crashee si falta la key.
 * Soporta OpenRouter (por compatibilidad OpenAI-style) y también OpenAI directo.
 */
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;

  if (!apiKey) return null;

  const baseURL =
    process.env.OPENAI_BASE_URL ||
    process.env.OPENROUTER_BASE_URL ||
    "https://openrouter.ai/api/v1";

  return new OpenAI({
    apiKey,
    baseURL,
    // Headers recomendados por OpenRouter (son opcionales; no rompen si no están)
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://reloop.local",
      "X-Title": process.env.OPENROUTER_APP_NAME || "backend-reloop",
    },
  });
}

router.post("/analyze-image", upload.single("image"), async (req, res) => {
  try {
    // 1) Validación de archivo
    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    // 2) Cliente AI (NO crashea si no hay key)
    const openai = getClient();
    if (!openai) {
      return res.status(503).json({
        error: "AI is not configured",
        details:
          "Missing API key. Set OPENAI_API_KEY (or OPENROUTER_API_KEY) in the environment.",
      });
    }

    const base64 = req.file.buffer.toString("base64");

    const prompt = `
Eres un sistema experto en moda para un marketplace de ropa usada en URUGUAY.
Debes analizar la imagen y devolver SOLO un JSON válido con EXACTAMENTE este esquema:
{
  "title": string (<=60 chars),
  "description": string (<=200 chars),
  "price": number (UYU, usado, mercado Uruguay),
  "brand": string | null,
  "category": "HOMBRE" | "MUJER" | "NINOS" | "UNISEX",
  "subCategory": "ROPA" | "ACCESORIOS" | "CALZADOS",
  "subSubCategory": "Todos" | "Remeras" | "Camisas" | "Tops" | "Pantalones" | "Bermudas" | "Shorts" | "Camperas" | "Vestidos" | "Buzos" | "Faldas" | "Blazers" | "Carteras" | "Sombreros" | "Gorros" | "Lentes" | "Bijou" | "Cinturones" | "Guantes" | "Bufandas" | "Joyas" | "Sandalias" | "Botas" | "Zapatillas" | "Tacos",
  "condition": "NUEVO_CON_ETIQUETA" | "NUEVO_SIN_ETIQUETA" | "MUY_BUENO" | "BUENO" | "SATISFACTORIO",
  "color": string | null,
  "sizeTop": "TS_XXS" | "TS_XS" | "TS_S" | "TS_M" | "TS_L" | "TS_XL" | "TS_XXL" | "TS_XXXL" | "TS_U" | null,
  "sizeBottom": "TB_XXS" | "TB_XS" | "TB_S" | "TB_M" | "TB_L" | "TB_XL" | "TB_XXL" | "TB_U" | "TB_30" | "TB_32" | "TB_34" | "TB_36" | "TB_38" | "TB_40" | "TB_42" | "TB_44" | "TB_46" | "TB_48" | null,
  "sizeShoe": "SH_33" | "SH_34" | "SH_35" | "SH_36" | "SH_37" | "SH_38" | "SH_39" | "SH_40" | "SH_41" | "SH_42" | "SH_43" | "SH_44" | "SH_45" | "SH_46" | null,
  "sizeKids": "K_0_3M" | "K_3_6M" | "K_6_9M" | "K_9_12M" | "K_12_18M" | "K_18_24M" | "K_2" | "K_3" | "K_4" | "K_5" | "K_6" | "K_7" | "K_8" | "K_10" | "K_12" | "K_14" | "K_16" | null,
  "sizeKidsShoe": "KS_16" | "KS_17" | "KS_18" | "KS_19" | "KS_20" | "KS_21" | "KS_22" | "KS_23" | "KS_24" | "KS_25" | "KS_26" | "KS_27" | "KS_28" | "KS_29" | "KS_30" | "KS_31" | "KS_32" | "KS_33" | null,
  "sizeAccessory": "A_U" | "A_S" | "A_M" | "A_L" | "A_XL" | null
}
REGLAS:
- Usa EXACTAMENTE los valores permitidos.
- El talle debe devolverse en formato enum (ej: TS_S, TB_38).
- Solo uno de los size puede tener valor distinto de null.
- Estimar precio realista para Uruguay
- SOLO JSON válido.
`;

    // OJO: si usás OpenRouter, el "model" debe ser uno soportado por OpenRouter.
    // Ej: "openai/gpt-4.1-mini" o "gpt-4o-mini" según tu cuenta.
    const model =
      process.env.AI_MODEL || "openai/gpt-4.1-mini";

    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            {
              type: "input_image",
              image_url: `data:${req.file.mimetype};base64,${base64}`,
            },
          ],
        },
      ],
    });

    const outputText = response.output_text || "";

    // 3) Parseo robusto (quita fences)
    let parsed;
    try {
      let clean = outputText
        // elimina ```json ... ``` o ``` ... ```
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      parsed = JSON.parse(clean);

      // --- Normalización color ---
      const VALID_COLORS = [
        "Blanco",
        "Negro",
        "Gris",
        "Rojo",
        "Azul",
        "Verde",
        "Amarillo",
        "Marron",
        "Naranja",
        "Violeta",
        "Rosado",
        "Celeste",
        "Beige",
        "Bordo",
        "Dorado",
        "Plateado",
        "Jean",
        "Estampado",
        "Animal print",
        "A cuadros",
        "Otro",
      ];

      if (parsed.color) {
        const lower = String(parsed.color).toLowerCase();
        const normalized = VALID_COLORS.find((c) =>
          lower.includes(c.toLowerCase())
        );
        parsed.color = normalized || "Otro";
      }

      // --- Normalización talles ---
      if (parsed.sizeTop && !String(parsed.sizeTop).startsWith("TS_")) {
        parsed.sizeTop = "TS_" + String(parsed.sizeTop).toUpperCase();
      }
      if (parsed.sizeBottom && !String(parsed.sizeBottom).startsWith("TB_")) {
        parsed.sizeBottom = "TB_" + String(parsed.sizeBottom).toUpperCase();
      }
      if (parsed.sizeShoe && !String(parsed.sizeShoe).startsWith("SH_")) {
        parsed.sizeShoe = "SH_" + String(parsed.sizeShoe);
      }

      // --- Normalización precio ---
      if (
        parsed.price === undefined ||
        parsed.price === null ||
        typeof parsed.price !== "number" ||
        parsed.price < 300
      ) {
        parsed.price = 1500;
      }
    } catch (err) {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: outputText,
      });
    }

    return res.json(parsed);
  } catch (err) {
    console.error("AI ERROR:", err);
    return res.status(500).json({
      error: "AI processing failed",
      details: err?.message || String(err),
    });
  }
});

module.exports = router;
