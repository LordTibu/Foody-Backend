const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { body, validationResult } = require("express-validator");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

// Use cookie secret for signing cookies
router.use(cookieParser(process.env.COOKIE_SECRET));

if (!process.env.JWT_SECRET || !process.env.REFRESH_SECRET) {
  throw new Error('JWT_SECRET and REFRESH_SECRET must be defined in environment variables');
}

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

// Helper function for consistent error responses
const createErrorResponse = (err, defaultMessage) => {
  console.error(`Error: ${defaultMessage}:`, err);
  return {
    message: defaultMessage,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  };
};

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

// Register
router.post(
  "/register",
  body("email").isEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must contain at least 6 characters"),
  async (req, res) => {
    console.log('Registration attempt started:', { email: req.body.email });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation failed:', errors.array());
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    try {
      console.log('Checking for existing user...');
      const existing = await prisma.user.findUnique({ where: { email } });
      
      if (existing) {
        console.log('User already exists:', email);
        return res.status(400).json({
          message: "Email already in use",
          field: "email"
        });
      }

      console.log('Hashing password...');
      const hashed = await bcrypt.hash(password, 10);
      
      console.log('Creating new user...');
      const user = await prisma.user.create({
        data: { email, passwordHash: hashed },
        select: { id: true, email: true }
      });

      console.log('User created successfully:', { id: user.id, email: user.email });
      res.status(201).json({
        message: "User successfully created",
        user
      });
    } catch (err) {
      console.error('Registration error:', err);
      const errorResponse = createErrorResponse(err, "Failed to create user account");
      res.status(500).json(errorResponse);
    }
  }
);

// Update cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "Strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  signed: true, // Enable cookie signing
  path: '/' // Ensure consistent path
};

// Login
router.post(
  "/login",
  body("email").isEmail()
    .withMessage("Please provide a valid email address"),
  body("password").exists()
    .withMessage("Password is required"),
  async (req, res) => {
    console.log('Login attempt for email:', req.body.email);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation failed:', errors.array());
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        console.log('Invalid credentials for email:', email);
        return res.status(401).json({
          message: "Invalid credentials",
          field: "email_password"
        });
      }

      console.log('Login successful for user:', user.id);
      const { accessToken, refreshToken } = generateTokens(user.id);

      res
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json({
          message: "Successfully logged in",
          accessToken,
          user: {
            id: user.id,
            email: user.email
          }
        });
    } catch (err) {
      console.error('Login error:', err);
      const errorResponse = createErrorResponse(err, "Login failed");
      res.status(500).json(errorResponse);
    }
  }
);

// Refresh Token
router.post("/refresh", async (req, res) => {
  console.log('Refresh attempt - Cookies received:', req.cookies);
  console.log('Signed Cookies:', req.signedCookies);
  
  const token = req.signedCookies.refreshToken;
  if (!token) {
    console.log('No refresh token found in cookies');
    return res.status(401).json({
      message: "No refresh token provided",
      code: "MISSING_TOKEN",
      details: "Please login again to obtain a new refresh token"
    });
  }

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    console.log('Token verified for user:', decoded.userId);
    
    const { accessToken, refreshToken } = generateTokens(decoded.userId);

    res
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        // Ensure the path is set
        path: '/'
      })
      .json({
        message: "Tokens refreshed successfully",
        accessToken
      });
  } catch (err) {
    console.error('Refresh token error:', err);
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        message: "Refresh token has expired",
        code: "TOKEN_EXPIRED",
        details: "Please login again to obtain a new refresh token"
      });
    }
    const errorResponse = createErrorResponse(err, "Failed to refresh token");
    res.status(403).json(errorResponse);
  }
});

// Logout
router.post("/logout", (req, res) => {
  console.log('Logout attempt - Cookies received:', req.cookies);
  console.log('Signed Cookies:', req.signedCookies);

  // Even if no token is present, we'll clear it
  res
    .clearCookie("refreshToken", {
      ...cookieOptions,
      // Ensure the path matches the one used when setting the cookie
      path: '/'
    })
    .json({
      message: "Successfully logged out",
      details: req.signedCookies.refreshToken ? "Token cleared" : "No token was present"
    });
});

// Authentication Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      message: "No authorization header",
      code: "MISSING_AUTH_HEADER"
    });
  }

  const [bearer, token] = authHeader.split(" ");
  if (bearer !== "Bearer" || !token) {
    return res.status(401).json({
      message: "Invalid authorization header format",
      code: "INVALID_AUTH_FORMAT"
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        message: "Access token has expired",
        code: "TOKEN_EXPIRED"
      });
    }
    return res.status(401).json({
      message: "Invalid access token",
      code: "INVALID_TOKEN"
    });
  }
}

module.exports = { router, authMiddleware };
