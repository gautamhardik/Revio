const axios = require('axios');
const config = require('../config');

const mlClient = axios.create({
  baseURL: config.mlServiceUrl,
  timeout: 30000 // ML inference can take a few seconds
});

const getHealth = async () => {
  try {
    const response = await mlClient.get('/api/v1/health');
    return response.data;
  } catch (error) {
    console.error('Failed to get ML service health:', error.message);
    return null;
  }
};

const getModels = async () => {
  try {
    const response = await mlClient.get('/api/v1/models');
    return response.data;
  } catch (error) {
    console.error('Failed to get models info from ML service:', error.message);
    throw new Error('ML Service Unavailable');
  }
};

const predict = async (text, models = ["lr", "lstm", "bert"]) => {
  try {
    const response = await mlClient.post('/api/v1/predict', { text, models });
    return response.data;
  } catch (error) {
    console.error('Prediction failed in ML service:', error.message);
    throw new Error(error.response?.data?.detail || 'ML Service Prediction Failed');
  }
};

module.exports = {
  getHealth,
  getModels,
  predict
};
