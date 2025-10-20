// src/routes/uploads.js
const router = require("express").Router();
const fs = require("fs");
const path = require("path");

// POST /uploads/local  -> guarda un archivo base64 en la carpeta /uploads (raíz del proyecto)
router.post("/local", (req, res) => {
  try {
    const { filename, base64 } = req.body || {};
    if (!filename || !base64) {
      return res.status(400).json({ error: "bad_request" });
    }

    // asegurá carpeta /uploads
    const dir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // decodificar base64 y escribir a disco
    const buffer = Buffer.from(base64, "base64");
    const stamped = `${Date.now()}-${filename}`;
    const filePath = path.join(dir, stamped);
    fs.writeFileSync(filePath, buffer);

    // devolver ruta pública (en dev la servimos como estático)
    return res.status(201).json({ ok: true, path: `uploads/${stamped}` });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
