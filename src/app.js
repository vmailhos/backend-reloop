// src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const app = express();

// Middlewares base
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// 1) Servir estáticos de "public"
app.use(express.static(path.join(process.cwd(), "public")));

// 2) En dev, servir "uploads" como estático
if (process.env.NODE_ENV !== "production") {
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
}

// Rutas simples
app.get("/", (_req, res) => res.send("Backend de Reloop corriendo..."));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Rutas API
app.use("/auth", require("./routes/auth"));
app.use("/listings", require("./routes/listings"));
app.use("/uploads", require("./routes/uploads"));
app.use("/favorites", require("./routes/favorites"));
app.use("/users", require("./routes/users"));
app.use("/ratings", require("./routes/ratings"));

// Debug opcional
app.post("/_debug/body", (req, res) => {
  res.json({ body: req.body, headers: req.headers });
});

// Swagger UI
const openapi = YAML.load(path.join(process.cwd(), "src/docs/openapi.yaml"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

// 404 SIEMPRE al final
app.use((_req, res) => res.status(404).json({ error: "not_found" }));

// 500 SIEMPRE último
app.use((err, req, res, _next) => {
  if (err?.type === "entity.parse.failed") {
    console.error("JSON parse error:", err.message);
    return res.status(400).json({ error: "invalid_json", message: err.message });
  }
  if (err?.name === "ZodError") {
    console.error("Zod validation:", err.issues);
    return res.status(400).json({ error: "validation_error", details: err.issues });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "internal_error", message: err?.message });
});

module.exports = app;

