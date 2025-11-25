const router = require("express").Router();
const { prisma } = require("../db");
const authMiddleware = require("../middlewares/requireAuth");

// Obtener perfil propio
router.get("/get", authMiddleware, async (req, res) => {
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

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Error fetching user profile" });
  }
});

// Actualizar perfil propio
router.put("/edit", authMiddleware, async (req, res) => {
  const { name, lastName, phone, gender, birthDate, country } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, lastName, phone, gender, birthDate, country },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error updating profile" });
  }
});

// Cambiar avatar
router.post("/avatar", authMiddleware, async (req, res) => {
  const { avatarUrl } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Error updating avatar" });
  }
});

module.exports = router;
