const mlService = require('../services/mlService');
const dbService = require('../services/dbService');

const predict = async (req, res, next) => {
  try {
    const { text, sessionId } = req.body;
    
    // Call FastAPI service
    const predictionResult = await mlService.predict(text);
    
    // Persist this prediction using Prisma
    await dbService.savePrediction(sessionId, text, predictionResult);
    
    // Return standardized response back to frontend
    res.json(predictionResult);
  } catch (error) {
    next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const history = await dbService.getSessionHistory(sessionId);
    
    res.json({ history });
  } catch (error) {
    next(error);
  }
};

const getModels = async (req, res, next) => {
  try {
    const models = await mlService.getModels();
    res.json(models);
  } catch (error) {
    next(error);
  }
};

const getMetrics = async (req, res, next) => {
  try {
    const metrics = await dbService.getModelMetrics();
    const serializedMetrics = metrics.map(m => ({
        ...m,
        sizeBytes: m.sizeBytes.toString()
    }));
    res.json(serializedMetrics);
  } catch (error) {
    next(error);
  }
};

const getHealth = async (req, res, next) => {
  try {
    const mlHealth = await mlService.getHealth();
    
    res.json({
      status: "healthy",
      backend: true,
      ml_service: !!mlHealth,
      database: true,
      models_loaded: mlHealth?.models_loaded || {
        logistic_regression: false,
        lstm: false,
        bert: false
      },
      load_errors: mlHealth?.load_errors || {},
      version: "1.0.0"
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  predict,
  getHistory,
  getModels,
  getMetrics,
  getHealth
};
