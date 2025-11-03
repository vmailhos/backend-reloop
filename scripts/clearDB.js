const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Borrando todos los datos...");

  // Borra todas las tablas (sin eliminar las estructuras)
  await prisma.user.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.favorite.deleteMany();
  // Agregá aquí las demás tablas que tengas

  console.log("✅ Base de datos vacía (tablas intactas)");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
