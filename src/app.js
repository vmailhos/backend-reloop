const express = require("express");
const app = express();

// Para poder recibir JSON
app.use(express.json());

// Ruta de prueba
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;
