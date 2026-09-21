const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables (from server/.env or root .env)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const { connectDB } = require('./config/db');

// Middleware & Auth
const { optionalAuth } = require('./middleware/auth');

// Route imports
const authRoutes = require('./routes/authRoutes');
const scanRoutes = require('./routes/scanRoutes');
const ruleRoutes = require('./routes/ruleRoutes');
const findingRoutes = require('./routes/findingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Connect to MongoDB if not in test
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: "CloudGuard API is running"
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/scans', optionalAuth, scanRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/findings', optionalAuth, findingRoutes);
app.use('/api/dashboard', optionalAuth, dashboardRoutes);
app.use('/api/ai', optionalAuth, aiRoutes);

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server if not imported
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`CloudGuard server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
