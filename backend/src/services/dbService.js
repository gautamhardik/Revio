const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const savePrediction = async (sessionId, text, result) => {
  try {
    return await prisma.prediction.create({
      data: {
        sessionId: sessionId || 'anonymous',
        text: text,
        lrResult: JSON.stringify(result.models.lr || {}),
        lstmResult: JSON.stringify(result.models.lstm || {}),
        bertResult: JSON.stringify(result.models.bert || {}),
        majorityLabel: result.overall.label,
        agreement: result.overall.agreement,
        totalLatencyMs: result.timing.total_ms
      }
    });
  } catch (error) {
    console.error('Failed to save prediction to DB:', error);
    // Non-blocking error - we don't want to fail the request if DB fails
    return null;
  }
};

const getSessionHistory = async (sessionId) => {
  try {
    const history = await prisma.prediction.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 20 // Return last 20 predictions
    });
    return history.map(item => ({
      ...item,
      lrResult: JSON.parse(item.lrResult),
      lstmResult: JSON.parse(item.lstmResult),
      bertResult: JSON.parse(item.bertResult)
    }));
  } catch (error) {
    console.error('Failed to fetch history from DB:', error);
    return [];
  }
};

const getModelMetrics = async () => {
  try {
    return await prisma.modelMetric.findMany();
  } catch (error) {
    console.error('Failed to fetch model metrics from DB:', error);
    return [];
  }
};

module.exports = {
  prisma,
  savePrediction,
  getSessionHistory,
  getModelMetrics
};
