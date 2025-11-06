// src/config/swagger.js
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Backend - Documentación",
      version: "1.0.0",
      description: "Documentación de endpoints del servidor backend con Swagger",
    },
    servers: [
      {
        url: "http://localhost:3000", // Cambiá el puerto según tu entorno
      },
    ],
  },
  apis: ["./src/routes/*.js"], // 👈 Archivos donde escribirás la documentación
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };
