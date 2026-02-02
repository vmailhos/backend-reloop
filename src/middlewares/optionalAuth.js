const jwt = require("jsonwebtoken");
const { prisma } = require("../db");

module.exports = async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      req.user = null;
      return next();
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.sub || payload.userId || payload.id;

    if (!userId) {
      req.user = null;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true },
    });

    req.user = user || null;
    return next();
  } catch (err) {
    console.warn("optionalAuth error (treating as guest):", err.message);
    req.user = null;
    return next();
  }
};

