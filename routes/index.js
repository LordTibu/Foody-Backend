const express = require("express");
const router = express.Router();

const { router: authRoutes } = require("./auth");
router.use("/auth", authRoutes);

const ingredientsRoutes = require("./ingredients");
router.use("/ingredients", ingredientsRoutes);

const recipesRoutes = require("./recipes");
router.use("/recipes", recipesRoutes);

const recipeIngredientsRoutes = require("./recipeIngredients");
router.use("/recipe-ingredients", recipeIngredientsRoutes);

module.exports = router;
