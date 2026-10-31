const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const path = require('path');
const config = require('./config');
const v1Routes = require('./routes/v1.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts/styles for local frontend development
}));

// Enable CORS
app.use(cors({
  origin: '*', // In production, restrict to frontend URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Serve static frontend files directly
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Routes
app.use('/api/v1', v1Routes);

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Revio Review Intelligence Gateway' });
});

// Root endpoint for simple health check
app.get('/', (req, res) => {
  res.json({ message: 'Revio - Review Intelligence Gateway is running' });
});

// Centralized error handling
app.use(errorHandler);

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested resource was not found' });
});

app.listen(config.port, () => {
  console.log(`Backend API Gateway listening on port ${config.port}`);
  console.log(`Environment: ${config.env}`);
  console.log(`Connecting to ML Service at: ${config.mlServiceUrl}`);
});
