const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();
const routes = require("./routes");

// Load environment variables
require('dotenv').config();

// Route Logger Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", routes);

// Print registered routes
console.log('Registered Routes:');
function printRoutes(stack, basePath = '') {
  stack.forEach(mw => {
    if (mw.route) { // routes registered directly
      const methods = Object.keys(mw.route.methods).join(', ').toUpperCase();
      console.log(`${methods} ${basePath}${mw.route.path}`);
    } else if (mw.name === 'router') { // router middleware
      printRoutes(mw.handle.stack, basePath + (mw.regexp.source === '^\\/?(?=\\/|$)' ? '' : mw.regexp.source.replace(/\\\//g, '/').replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, '')));
    }
  });
}
printRoutes(app._router.stack);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`${new Date().toISOString()} - Error:`, err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`${new Date().toISOString()} - 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;
