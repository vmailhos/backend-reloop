
const router = require("express").Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { prisma } = require("../db");
const validate = require("../middlewares/validate");
const { z } = require("zod");
const { JWT_SECRET } = require("../config");
const { sendWelcomeEmail } = require("../email/sendWelcomeEmail");
const { sendPasswordResetEmail } = require("../email/sendPasswordResetEmail");
const {
  sendEmailVerificationEmail,
} = require("../email/sendEmailVerificationEmail");

const EMAIL_VERIFICATION_WINDOW_MS = 15 * 60 * 1000;

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

const forgotPasswordSchema = {
  body: z.object({
    email: emailSchema,
  }),
};

const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(20, "Token inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  }),
};

const verifyEmailSchema = {
  body: z.object({
    token: z.string().min(20, "Token inválido"),
  }),
};

const resendVerificationSchema = {
  body: z.object({
    email: emailSchema,
  }),
};

// ---------- Rutas ----------

// ✅ POST /auth/signup
// ✅ POST /auth/signup
router.post("/signup", validate(signupSchema), async (req, res, next) => {
  try {
    const { email, username, password, name, country } = req.body;

    // 🔹 Verificar duplicados
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existingEmail)
      return res.status(409).json({ error: "email_taken" });

    const existingUsername = await prisma.user.findFirst({
      where: { username: { equals: username.trim(), mode: "insensitive" } },
    });
    if (existingUsername)
      return res.status(409).json({ error: "username_taken" });

    // 🔹 Encriptar contraseña
    const hash = await bcrypt.hash(password, 10);

    // 🔹 Generar avatar
    const initial = username.charAt(0).toUpperCase();
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      initial
    )}&background=random&color=fff&size=128`;

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_WINDOW_MS
    );

    // 🔹 Crear usuario
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        username: username.trim(),
        password: hash,
        avatar,
        name,
        country,
        emailVerificationToken: verificationToken,
        emailVerificationExpiresAt: verificationExpiresAt,
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

    console.log("[MAIL] Intentando enviar mail de verificacion");
    console.log("[MAIL] Destinatario:", user.email);
    sendEmailVerificationEmail({
      email: user.email,
      name: user.name || user.username,
      token: verificationToken,
    })
      .then(() => {
        console.log("[MAIL] Mail de verificacion enviado correctamente");
      })
      .catch((err) => {
        console.error("[MAIL] Error enviando mail de verificacion");
        console.error(err);
      });

    return res.status(201).json({
      message: "email_verification_required",
      emailVerificationRequired: true,
      user,
    });
  } catch (e) {
    console.error("POST /auth/signup error:", e);
    next(e);
  }
});

// ✅ POST /auth/login
router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    const trimmed = identifier.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmed.toLowerCase() },
          { username: { equals: trimmed, mode: "insensitive" } },
        ]
      },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        avatar: true,
        name: true,
        country: true,
        emailVerifiedAt: true
      },
    });

    if (!user) return res.status(401).json({ error: "invalid_credentials" });

    const valid = await bcrypt.compare(password, user.password || "");
    if (!valid) return res.status(401).json({ error: "invalid_credentials" });

    if (!user.emailVerifiedAt) {
      return res.status(403).json({ error: "email_not_verified" });
    }

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

    const { password: _, emailVerifiedAt: __, ...safeUser } = user;
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
    let user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        name: true,
        country: true,
        emailVerifiedAt: true,
      },
    });

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
          emailVerifiedAt: new Date(),
        },
        select: { id: true, email: true, username: true, avatar: true, name: true, country: true },
      });
    } else if (!user.emailVerifiedAt) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date(),
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
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

// ✅ POST /auth/verify-email
router.post("/verify-email", validate(verifyEmailSchema), async (req, res, next) => {
  try {
    const { token } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: { gt: new Date() },
      },
      select: { id: true, email: true, name: true, username: true },
    });

    if (!user) {
      return res.status(400).json({ error: "invalid_or_expired_token" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    sendWelcomeEmail({
      email: user.email,
      name: user.name,
      username: user.username,
    })
      .then(() => {
        console.log("[MAIL] Mail de bienvenida enviado correctamente");
      })
      .catch((err) => {
        console.error("[MAIL] Error enviando mail de bienvenida");
        console.error(err);
      });

    return res.json({ message: "email_verified" });
  } catch (e) {
    console.error("POST /auth/verify-email error:", e);
    next(e);
  }
});

// ✅ POST /auth/resend-verification
router.post(
  "/resend-verification",
  validate(resendVerificationSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id: true, email: true, name: true, username: true, emailVerifiedAt: true },
      });

      if (!user) {
        return res.json({
          message: "Si el email existe, te enviaremos un enlace de verificacion.",
        });
      }

      if (user.emailVerifiedAt) {
        return res.status(400).json({ error: "email_already_verified" });
      }

      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationExpiresAt = new Date(
        Date.now() + EMAIL_VERIFICATION_WINDOW_MS
      );

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: verificationToken,
          emailVerificationExpiresAt: verificationExpiresAt,
        },
      });

      sendEmailVerificationEmail({
        email: user.email,
        name: user.name || user.username,
        token: verificationToken,
      })
        .then(() => {
          console.log("[MAIL] Mail de verificacion reenviado correctamente");
        })
        .catch((err) => {
          console.error("[MAIL] Error reenviando mail de verificacion");
          console.error(err);
        });

      return res.json({ message: "verification_email_sent" });
    } catch (e) {
      console.error("POST /auth/resend-verification error:", e);
      next(e);
    }
  }
);

// ✅ POST /auth/forgot-password
router.post("/forgot-password", validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, name: true, username: true },
    });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: token,
          resetPasswordExpiresAt: expiresAt,
        },
      });

      (async () => {
        try {
          console.log("[MAIL] Intentando enviar mail de recuperación");
          console.log("[MAIL] Destinatario:", user.email);
          await sendPasswordResetEmail({
            email: user.email,
            name: user.name || user.username,
            token,
          });
          console.log("[MAIL] Mail de recuperación enviado correctamente");
        } catch (err) {
          console.error("[MAIL] Error enviando mail de recuperación");
          console.error(err);
        }
      })();
    }

    return res.json({
      message: "Si el email existe, te enviaremos un enlace de recuperación.",
    });
  } catch (e) {
    console.error("POST /auth/forgot-password error:", e);
    next(e);
  }
});

// ✅ POST /auth/reset-password
router.post("/reset-password", validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({ error: "invalid_or_expired_token" });
    }

    const hash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (e) {
    console.error("POST /auth/reset-password error:", e);
    next(e);
  }
});

module.exports = router;
