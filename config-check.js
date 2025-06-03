require('dotenv').config();

const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'REFRESH_SECRET',
  'COOKIE_SECRET'
];

const missing = requiredEnvVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set');
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🚀 Port: ${process.env.PORT}`);
  console.log('🔐 Secrets: Configured');
  console.log('🗄️  Database URL: Configured');
} 