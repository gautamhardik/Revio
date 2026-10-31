require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  env: process.env.NODE_ENV || 'development'
};
