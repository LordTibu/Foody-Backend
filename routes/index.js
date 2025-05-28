const express = require("express");
const router = express.Router();

const { router: authRoutes } = require("./auth");
router.use("/auth", authRoutes);

module.exports = router;
