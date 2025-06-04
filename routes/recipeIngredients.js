const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("./auth");

const prisma = new PrismaClient();
const router = express.Router();

// Add an ingredient to a recipe
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { recipeId, ingredientId, quantity, quantityType, notes } = req.body;
    const recipeIngredient = await prisma.recipeIngredient.create({
      data: {
        recipeId,
        ingredientId,
        quantity: parseFloat(quantity),
        quantityType,
        notes
      }
    });
    res.status(201).json(recipeIngredient);
  } catch (err) {
    res.status(400).json({ message: "Failed to add ingredient to recipe", error: err.message });
  }
});

// Get all ingredients for a recipe
router.get("/:recipeId", authMiddleware, async (req, res) => {
  try {
    const { recipeId } = req.params;
    const ingredients = await prisma.recipeIngredient.findMany({
      where: { recipeId },
      include: { ingredient: true }
    });
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch recipe ingredients" });
  }
});

// Update a recipe-ingredient
router.put("/", authMiddleware, async (req, res) => {
  try {
    const { recipeId, ingredientId, quantity, quantityType, notes } = req.body;
    const updated = await prisma.recipeIngredient.update({
      where: { recipeId_ingredientId: { recipeId, ingredientId } },
      data: { quantity, quantityType, notes }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Failed to update recipe ingredient", error: err.message });
  }
});

// Delete a recipe-ingredient
router.delete("/", authMiddleware, async (req, res) => {
  try {
    const { recipeId, ingredientId } = req.body;
    await prisma.recipeIngredient.delete({
      where: { recipeId_ingredientId: { recipeId, ingredientId } }
    });
    res.json({ message: "Recipe ingredient deleted" });
  } catch (err) {
    res.status(400).json({ message: "Failed to delete recipe ingredient", error: err.message });
  }
});

module.exports = router;