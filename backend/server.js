const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Database connection
const { testConnection } = require('./utils/database');

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
// Configure CORS to allow frontend dev servers (3000 and 3001) and any configured FRONTEND_URL
const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001'];
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: Origin not allowed'), false);
  },
  credentials: true
}));

// Body parsing middleware - increased limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// API routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Vijayalakshmi Boyar Matrimony API',
    version: '1.0.0',
    status: 'running',
    database: 'connected'
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const searchRoutes = require('./routes/search');
const messageRoutes = require('./routes/message');
const interestRoutes = require('./routes/interest');
const lookupRoutes = require('./routes/lookup');
const verificationRoutes = require('./routes/verification');
const adminRoutes = require('./routes/admin');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/interest', interestRoutes);
app.use('/api/lookup', lookupRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log(`✅ Cloudinary configured: ${process.env.CLOUDINARY_CLOUD_NAME}`);
} else {
  console.log('⚠️  Cloudinary not configured. Using local file storage for development.');
}

// Start server after database connection
async function startServer() {
  try {
    // Connect to database first
    await testConnection();
    
    // Only start server after successful DB connection
    app.listen(PORT, () => {
      console.log(`\n✅ Database: Connected Successfully`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📧 Admin contact: vijayalakshmijayakumar45@gmail.com`);
      console.log(`🏠 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`\n✅ Frontend can now connect to the backend\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Initialize server
startServer();
