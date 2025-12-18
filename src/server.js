// src/server.js
require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Reloop API escuchando en 0.0.0.0:${PORT}`);
});

