// src/routes/auth.js
const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { prisma } = require("../db");
const validate = require("../middlewares/validate");
const { z } = require("zod");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

// ---------- Schemas ----------
const emailSchema = z.string().trim().toLowerCase().email("Email inválido");

const signupSchema = {
  body: z.object({
    email: emailSchema,
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  }),
};

const loginSchema = {
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, "Contraseña requerida"),
  }),
};

// ---------- Rutas ----------

// POST /auth/signup
router.post("/signup", validate(signupSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "email_taken" });

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { email, password: hash } });

    return res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

// POST /auth/login
router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    console.log("LOGIN body:", req.body);

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "invalid_credentials" });

    let valid = false;
    try {
      valid = await bcrypt.compare(password, user.password);
    } catch (e) {
      console.error("bcrypt.compare error:", e?.message || e);
      return res.status(401).json({ error: "invalid_credentials" });
    }
    if (!valid) return res.status(401).json({ error: "invalid_credentials" });

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "2h" });
    return res.json({ token });
  } catch (e) {
    console.error("POST /auth/login error:", e);
    next(e);
  }
});

module.exports = router;
