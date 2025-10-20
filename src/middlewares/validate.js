// src/middlewares/validate.js
const { ZodError } = require("zod");

module.exports = (schema = {}) => (req, res, next) => {
  try {
    if (schema.body)  req.body  = schema.body.parse(req.body);
    if (schema.query) req.query = schema.query.parse(req.query);
    if (schema.params) req.params = schema.params.parse(req.params);
    return next();
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({ error: "validation_error", details: e.errors });
    }
    return next(e);
  }
};
