// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  // usuarios
  const pass = await bcrypt.hash("123456", 10);
  const sofi = await prisma.user.upsert({
    where: { email: "sofi@example.com" },
    create: { email: "sofi@example.com", password: pass },
    update: {}
  });
  const leo = await prisma.user.upsert({
    where: { email: "leo@example.com" },
    create: { email: "leo@example.com", password: pass },
    update: {}
  });

  // listings + fotos
  const l1 = await prisma.listing.upsert({
    where: { id: "seed-1" },
    create: {
      id: "seed-1",
      title: "Vestido lila",
      price: 1200,
      category: "vestidos",
      condition: "como_nuevo",
      sellerId: sofi.id,
      photos: { create: [{ url: "uploads/foto1.png" }] }
    },
    update: {}
  });

  const l2 = await prisma.listing.upsert({
    where: { id: "seed-2" },
    create: {
      id: "seed-2",
      title: "Campera denim",
      price: 2500,
      category: "camperas",
      condition: "usado",
      sellerId: leo.id,
      photos: { create: [{ url: "uploads/foto2.png" }] }
    },
    update: {}
  });

  // favorito demo (sofi → campera de leo)
  await prisma.favorite.upsert({
    where: { userId_listingId: { userId: sofi.id, listingId: l2.id } },
    create: { userId: sofi.id, listingId: l2.id },
    update: {}
  });

  console.log("Seed OK");
}

main().finally(async () => prisma.$disconnect());
