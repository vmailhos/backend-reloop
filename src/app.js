// src/app.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const app = express();
console.log("AWS KEY:", process.env.AWS_ACCESS_KEY_ID ? "OK" : "NO");

// Middlewares base
app.use(helmet());
const allowedOrigins = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",

  "https://d2m3tqyy5tqw5o.cloudfront.net",
  "https://reloop-uy.com",
  "https://www.reloop-uy.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // mobile apps
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// 1) Servir estáticos de "public"
app.use(express.static(path.join(process.cwd(), "public")));

// 2) Servir "uploads" como estático
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

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
app.use("/comments", require("./routes/comments"));
app.use("/cart", require("./routes/cart"));
app.use("/orders", require("./routes/orders"));
app.use("/notifications", require("./routes/notifications"));
app.use("/offers", require("./routes/offers"));
app.use("/uploads", require("./routes/uploads"));

// Debug endpoints
app.post("/_debug/body", (req, res) => {
  res.json({ body: req.body, headers: req.headers });
});

// Debug: Check authentication status
app.get("/_debug/auth", require("./middlewares/optionalAuth"), (req, res) => {
  res.json({
    authenticated: !!req.user,
    userId: req.user?.id || null,
    username: req.user?.username || null,
    headers: {
      authorization: req.headers.authorization ? "***present***" : "***missing***",
    },
  });
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

