const router = require("express").Router();
const { listDacAgencies } = require("../utils/dacAgencies"); 
// Ajustá el path si tu estructura es distinta

// GET /shipping/dac/agencies?department=Montevideo
router.get("/dac/agencies", (req, res) => {
  const { department } = req.query;
  const items = listDacAgencies(department);
  res.json({ items });
});

module.exports = router;
