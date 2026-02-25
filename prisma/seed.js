const { PrismaClient } = require("@prisma/client");
const { fakerES } = require("@faker-js/faker");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const USER_COUNT = 30;

const departments = [
  "Artigas","Canelones","Cerro Largo","Colonia","Durazno",
  "Flores","Florida","Lavalleja","Maldonado","Montevideo",
  "Paysandú","Río Negro","Rivera","Rocha","Salto",
  "San José","Soriano","Tacuarembó","Treinta y Tres"
];

function normalizeString(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

async function main() {

  console.log("🔥 RESET BASE (users + ratings)");

  await prisma.rating.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("hola123", 10);
  const users = [];

  console.log("👤 Creando usuarios...");

  // ==============================
  // 1️⃣ CREAR 30 USUARIOS
  // ==============================
  for (let i = 0; i < USER_COUNT; i++) {

    const firstName = fakerES.person.firstName();
    const lastName = fakerES.person.lastName();
    const gender = fakerES.helpers.arrayElement(["male","female"]);

    const user = await prisma.user.create({
      data: {
        email: `${normalizeString(firstName)}.${normalizeString(lastName)}${i}@gmail.com`,
        username: `${normalizeString(firstName)}${i}`,
        password: hashedPassword,
        name: firstName,
        lastName,
        phone: `09${fakerES.number.int({min:1000000,max:9999999})}`,
        country: fakerES.helpers.arrayElement(departments),
        gender,
        birthDate: fakerES.date.birthdate({min:18,max:50,mode:"age"}),
        avatar: `https://randomuser.me/api/portraits/${gender==="male"?"men":"women"}/${fakerES.number.int({min:1,max:99})}.jpg`,
        emailVerifiedAt: new Date()
      }
    });

    users.push(user);
  }

  console.log("⭐ Creando ratings dinámicos...");

  // ==============================
  // 2️⃣ RATINGS ENTRE 5 Y 10 POR USUARIO (RECIBIDOS)
  // ==============================
  for (const user of users) {

    const ratingsCount = fakerES.number.int({ min: 5, max: 10 });

    const otherUsers = users.filter(u => u.id !== user.id);

    for (let i = 0; i < ratingsCount; i++) {

      const author = fakerES.helpers.arrayElement(otherUsers);

      await prisma.rating.create({
        data: {
          value: fakerES.number.int({min:3,max:5}),
          comment: fakerES.helpers.arrayElement([
            "Excelente vendedor!",
            "Muy recomendable.",
            "Envío rápido y producto impecable.",
            "Todo perfecto.",
            "Muy buena experiencia.",
            "Super confiable.",
            "Volvería a comprar sin dudas."
          ]),
          authorId: author.id,
          targetId: user.id
        }
      });
    }
  }

  console.log("✅ USERS + RATINGS (5–10 por usuario) creados");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });