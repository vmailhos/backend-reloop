const { z } = require("zod");

const createRatingSchema = z.object({
  targetId: z.string().cuid("targetId debe ser un CUID"),
  value: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  listingId: z.string().cuid().optional(),
});

module.exports = {
  createRatingSchema,
};
