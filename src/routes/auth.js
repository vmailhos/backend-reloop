const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { prisma } = require("../db");
const validate = require("../middlewares/validate");
const { z } = require("zod");


const { JWT_SECRET } = require("../config");

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
    name: z.string().trim().optional(),
    country: z.string().trim().optional(),
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
    const { email, username, password, name, country } = req.body;

    // 🔹 Verificar duplicados
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }, // email en minúsculas
    });
    if (existingEmail)
      return res.status(409).json({ error: "email_taken" });

    const existingUsername = await prisma.user.findUnique({
      where: { username: username.trim() }, // username exacto, no toLowerCase
    });
    if (existingUsername)
      return res.status(409).json({ error: "username_taken" });

    // 🔹 Encriptar contraseña
    const hash = await bcrypt.hash(password, 10);

    // 🔹 Generar avatar
    const initial = username.charAt(0).toUpperCase();
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=random&color=fff&size=128`;

    // 🔹 Crear usuario (username tal cual lo escribió)
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        username: username.trim(), // 👈 se guarda tal cual
        password: hash,
        avatar,
        name,
        country,
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        name: true,
        country: true,
      },
    });

    // 🔹 Crear token con los datos del usuario
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        name: user.name,
        country: user.country,
      },
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
    const trimmed = identifier.trim(); // 👈 solo recorta espacios, sin cambiar el caso

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmed.toLowerCase() }, // email sí conviene en minúsculas
          { username: trimmed }              // 👈 busca exactamente igual como fue guardado
        ]
      },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        avatar: true,
        name: true,
        country: true
      },
    });

    if (!user) return res.status(401).json({ error: "invalid_credentials" });

    const valid = await bcrypt.compare(password, user.password || "");
    if (!valid) return res.status(401).json({ error: "invalid_credentials" });

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        name: user.name,
        country: user.country,
      },
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
      let usernameBase = (payload.name || email.split("@")[0])
        .replace(/\W+/g, "")
        .toLowerCase();
      let username = usernameBase;
      let count = 1;

      // Evitar duplicados
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${usernameBase}${count++}`;
      }

      const password = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);

      user = await prisma.user.create({
        data: {
          email,
          username,
          name: payload.name || null,
          avatar: payload.picture || null,
          password,
        },
        select: { id: true, email: true, username: true, avatar: true, name: true, country: true },
      });
    }

    const jwtToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        name: user.name,
        country: user.country,
      },
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
