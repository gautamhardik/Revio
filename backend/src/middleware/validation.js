const { z } = require('zod');

// Validation schema for prediction request
const predictSchema = z.object({
  body: z.object({
    text: z.string().min(10, "Review must be at least 10 characters long").max(5000, "Review is too long"),
    sessionId: z.string().uuid("Invalid session ID").optional()
  })
});

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
      });
    }
    next(err);
  }
};

module.exports = {
  predictSchema,
  validate
};
