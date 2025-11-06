// src/middlewares/requireAuth.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "change-me";

module.exports = function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "missing_token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // 🔹 Incluye todos los datos relevantes del usuario en req.user
    req.user = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      avatar: payload.avatar,
      name: payload.name,
      country: payload.country,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: "invalid_token" });
  }
};

