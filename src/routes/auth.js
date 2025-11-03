const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { prisma } = require("../db");
const validate = require("../middlewares/validate");
const { z } = require("zod");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

// ---------- Schemas ----------
const emailSchema = z.string().trim().toLowerCase().email("Email inválido");

const usernameSchema = z
  .string()
  .trim()
  .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
  .max(20, "El nombre de usuario no puede tener más de 20 caracteres")
  .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guiones bajos");

const signupSchema = {
  body: z.object({
    email: emailSchema,
    username: usernameSchema,
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
  }),
};

const loginSchema = {
  body: z.object({
    identifier: z.string().min(3, "Email o nombre de usuario requerido"),
    password: z.string().min(1, "Contraseña requerida"),
  }),
};

// ---------- Rutas ----------

// ✅ POST /auth/signup
router.post("/signup", validate(signupSchema), async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    // Verificar duplicados
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) return res.status(409).json({ error: "email_taken" });

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) return res.status(409).json({ error: "username_taken" });

    const hash = await bcrypt.hash(password, 10);

    // 🔤 Generar avatar
    const initial = username.charAt(0).toUpperCase();
    const avatar = `https://ui-avatars.com/api/?name=${initial}&background=random&color=fff&size=128`;

    // Crear el usuario
    const user = await prisma.user.create({
      data: { email, username, password: hash, avatar },
      select: { id: true, email: true, username: true, avatar: true },
    });

    // Crear token con avatar incluido
    const token = jwt.sign(
      { sub: user.id, email: user.email, username: user.username, avatar: user.avatar },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.status(201).json({ token, user });
  } catch (e) {
    console.error("POST /auth/signup error:", e);
    next(e);
  }
});

// ✅ POST /auth/login
router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
      },
      select: { id: true, email: true, username: true, password: true, avatar: true },
    });

    if (!user) return res.status(401).json({ error: "invalid_credentials" });

    const valid = await bcrypt.compare(password, user.password || "");
    if (!valid) return res.status(401).json({ error: "invalid_credentials" });

    const token = jwt.sign(
      { sub: user.id, email: user.email, username: user.username, avatar: user.avatar },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    const { password: _, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  } catch (e) {
    console.error("POST /auth/login error:", e);
    next(e);
  }
});

// ✅ POST /auth/google
router.post("/google", async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "missing_token" });

    const { OAuth2Client } = require("google-auth-library");
    const client = new OAuth2Client(
      "228787203085-tlsm44gmc2kud4o11lbilr7l622eq76g.apps.googleusercontent.com"
    );

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience:
        "228787203085-tlsm44gmc2kud4o11lbilr7l622eq76g.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    if (!email) return res.status(400).json({ error: "invalid_token" });

    // Buscar o crear usuario
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const baseUsername =
        payload.name?.replace(/\s+/g, "").toLowerCase() || "user";
      const username = baseUsername + Math.floor(Math.random() * 10000);
      const password = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);

      user = await prisma.user.create({
        data: {
          email,
          username,
          name: payload.name || null,
          avatar: payload.picture || null,
          password,
        },
        select: { id: true, email: true, username: true, avatar: true },
      });
    }

    const jwtToken = jwt.sign(
      { sub: user.id, email: user.email, username: user.username, avatar: user.avatar },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({ token: jwtToken, user });
  } catch (e) {
    console.error("POST /auth/google error:", e);
    next(e);
  }
});

module.exports = router;
