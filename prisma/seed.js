const { PrismaClient, Prisma } = require("@prisma/client");
const { fakerES } = require("@faker-js/faker");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const departments = [
  "Artigas","Canelones","Cerro Largo","Colonia","Durazno",
  "Flores","Florida","Lavalleja","Maldonado","Montevideo",
  "Paysandú","Río Negro","Rivera","Rocha","Salto",
  "San José","Soriano","Tacuarembó","Treinta y Tres"
];

const conditions = [
  "NUEVO_CON_ETIQUETA",
  "NUEVO_SIN_ETIQUETA",
  "MUY_BUENO",
  "BUENO",
  "SATISFACTORIO"
];

const clothingTypes = [
  "Remeras","Camisas","Pantalones","Camperas",
  "Vestidos","Buzos","Faldas","Blazers","Shorts"
];

const brands = [
  "Zara","H&M","Nike","Adidas",
  "Levi's","Pull & Bear","Forever 21","Mango"
];

function normalizeString(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function getClothingImage(type, seed) {
  return `https://loremflickr.com/600/800/${type},fashion?lock=${seed}`;
}

function getSizeByType(type) {
  if (["Pantalones","Shorts","Faldas"].includes(type)) {
    return {
      sizeBottom: fakerES.helpers.arrayElement([
        "TB_30","TB_32","TB_34","TB_36","TB_38","TB_40"
      ])
    };
  }

  return {
    sizeTop: fakerES.helpers.arrayElement([
      "TS_S","TS_M","TS_L","TS_XL"
    ])
  };
}

async function main() {

  console.log("🇺🇾 Creando usuarios...");

  const hashedPassword = await bcrypt.hash("hola123", 10);
  const users = [];

  // ==============================
  // 1️⃣ CREAR 30 USUARIOS
  // ==============================
  for (let i = 0; i < 30; i++) {

    const firstName = fakerES.person.firstName();
    const lastName = fakerES.person.lastName();
    const gender = fakerES.helpers.arrayElement(["male","female"]);

    const cleanFirst = normalizeString(firstName);
    const cleanLast = normalizeString(lastName);

    const user = await prisma.user.create({
      data: {
        email: `${cleanFirst}.${cleanLast}${i}@gmail.com`,
        username: `${cleanFirst}${i}`,
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

  const listings = [];

  console.log("🛍 Creando listings...");

  // ==============================
  // 2️⃣ 5 LISTINGS POR USUARIO
  // ==============================
  for (const user of users) {

    for (let i = 0; i < 5; i++) {

      const type = fakerES.helpers.arrayElement(clothingTypes);

      const photoCount = fakerES.number.int({min:2,max:4});
      const photosArray = Array.from({length:photoCount}).map((_,index)=>({
        url: getClothingImage(type,fakerES.number.int({min:1,max:10000})),
        order: index
      }));

      const listing = await prisma.listing.create({
        data: {
          title: `${type} ${fakerES.color.human()}`,
          description: "Prenda usada en excelente estado.",
          price: new Prisma.Decimal(
            fakerES.number.int({min:800,max:4500})
          ),
          condition: fakerES.helpers.arrayElement(conditions),
          category: fakerES.helpers.arrayElement(["HOMBRE","MUJER","UNISEX"]),
          subCategory: "ROPA",
          subSubCategory: type,
          brand: fakerES.helpers.arrayElement(brands),
          color: fakerES.color.human(),
          ...getSizeByType(type),
          sellerId: user.id,
          photos: { create: photosArray }
        }
      });

      listings.push(listing);
    }
  }

  console.log("⭐ Creando ratings...");

  for (const user of users) {
    const otherUsers = users.filter(u=>u.id!==user.id);

    for (let i=0;i<5;i++){
      const target = fakerES.helpers.arrayElement(otherUsers);

      await prisma.rating.create({
        data:{
          value: fakerES.number.int({min:3,max:5}),
          comment: fakerES.lorem.sentence(),
          authorId: user.id,
          targetId: target.id
        }
      });
    }
  }

  console.log("💬 Creando threads...");

  for (const listing of listings) {

    const buyer = fakerES.helpers.arrayElement(users.filter(u=>u.id!==listing.sellerId));

    const thread = await prisma.commentThread.create({
      data:{
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: listing.sellerId
      }
    });

    for (let i=0;i<2;i++){
      await prisma.comment.create({
        data:{
          content: fakerES.lorem.sentence(),
          authorId: i%2===0?buyer.id:listing.sellerId,
          threadId: thread.id
        }
      });
    }
  }

  console.log("💰 Creando ofertas...");

  for (const listing of listings) {

    const buyer = fakerES.helpers.arrayElement(users.filter(u=>u.id!==listing.sellerId));

    await prisma.offer.create({
      data:{
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        amount: new Prisma.Decimal(
          fakerES.number.int({min:500,max:3000})
        ),
        status: fakerES.helpers.arrayElement(["PENDING","ACCEPTED","REJECTED"])
      }
    });
  }

  console.log("📦 Creando ventas...");

  for (const user of users) {

    const userListings = listings.filter(l=>l.sellerId===user.id);
    const listingToSell = userListings[0];

    const buyer = fakerES.helpers.arrayElement(users.filter(u=>u.id!==user.id));

    const price = Number(listingToSell.price);
    const commission = price * 0.03;
    const total = price + commission;

    await prisma.order.create({
      data:{
        subtotal: new Prisma.Decimal(price),
        commission: new Prisma.Decimal(commission),
        totalAmount: new Prisma.Decimal(total),
        commissionPct: new Prisma.Decimal(3),
        status:"COMPLETED",
        buyerId: buyer.id,
        shippingProvider:"DAC",
        shippingType:"HOME",
        items:{
          create:{
            listingId: listingToSell.id,
            price: new Prisma.Decimal(price)
          }
        }
      }
    });

    await prisma.listing.update({
      where:{id:listingToSell.id},
      data:{status:"sold"}
    });
  }

  console.log("✅ DATASET COMPLETO CREADO");
}

main()
  .catch(e=>{
    console.error(e);
  })
  .finally(async()=>{
    await prisma.$disconnect();
  });