const router = require("express").Router();
const { prisma } = require("../db");
const authMiddleware = require("../middlewares/requireAuth");
const validate = require("../middlewares/validate");
const { z } = require("zod");

// Schemas
const editProfileSchema = {
  body: z.object({
    name: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    phone: z.string().max(20).optional(),
    gender: z.string().optional(),
    birthDate: z.string().datetime().optional(),
    country: z.string().max(100).optional(),
  }),
};

const updateAvatarSchema = {
  body: z.object({
    avatarUrl: z.string().url(),
  }),
};

// Obtener perfil propio
router.get("/get", authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        lastName: true,
        phone: true,
        gender: true,
        birthDate: true,
        avatar: true,
        country: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user profile:", err);
    next(err);
  }
});

// Actualizar perfil propio
router.put("/edit", authMiddleware, validate(editProfileSchema), async (req, res, next) => {
  try {
    const { name, lastName, phone, gender, birthDate, country } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (birthDate !== undefined) updateData.birthDate = birthDate;
    if (country !== undefined) updateData.country = country;

    // If no fields to update, return current user
    if (Object.keys(updateData).length === 0) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          lastName: true,
          phone: true,
          gender: true,
          birthDate: true,
          avatar: true,
          country: true,
          createdAt: true,
        },
      });
      return res.json(user);
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        lastName: true,
        phone: true,
        gender: true,
        birthDate: true,
        avatar: true,
        country: true,
        createdAt: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating user profile:", err);
    next(err);
  }
});

// Cambiar avatar
router.post("/avatar", authMiddleware, validate(updateAvatarSchema), async (req, res, next) => {
  try {
    const { avatarUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        lastName: true,
        phone: true,
        gender: true,
        birthDate: true,
        avatar: true,
        country: true,
        createdAt: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating avatar:", err);
    next(err);
  }
});

module.exports = router;
