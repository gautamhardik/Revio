const express = require('express');
const axios = require('axios');
const config = require('../config');
const { predict, getHistory, getModels, getHealth, getMetrics } = require('../controllers/predict.controller');
const { validate, predictSchema } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/health', getHealth);
router.get('/models', getModels);
router.get('/metrics', getMetrics);
router.get('/history/:sessionId', getHistory);

// Proxy Revio business review routes directly to ML Service
router.get('/revio/models', async (req, res, next) => {
  try {
    const response = await axios.get(`${config.mlServiceUrl}/api/v1/revio/models`);
    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

router.post('/revio/predict', async (req, res, next) => {
  try {
    const response = await axios.post(`${config.mlServiceUrl}/api/v1/revio/predict`, req.body);
    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

router.post('/revio/batch', async (req, res, next) => {
  try {
    const response = await axios.post(`${config.mlServiceUrl}/api/v1/revio/batch`, req.body);
    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

// Apply rate limiting and validation to the predict route
router.post('/predict', apiLimiter, validate(predictSchema), predict);

module.exports = router;
