const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("./auth");

const prisma = new PrismaClient();
const router = express.Router();

// Get all recipes for the authenticated user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: { createdById: req.userId },
      include: { ingredients: true }
    });
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch recipes" });
  }
});

// Add a new recipe
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, time, instructions, imageUrl, notes } = req.body;
    const recipe = await prisma.recipe.create({
      data: {
        title,
        time: time ? parseInt(time) : null,
        instructions,
        imageUrl,
        notes,
        createdById: req.userId
      }
    });
    res.status(201).json(recipe);
  } catch (err) {
    res.status(400).json({ message: "Failed to create recipe", error: err.message });
  }
});

// Update a recipe
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, time, instructions, imageUrl, notes } = req.body;
    const recipe = await prisma.recipe.updateMany({
      where: { id, createdById: req.userId },
      data: { title, time, instructions, imageUrl, notes }
    });
    if (recipe.count === 0) return res.status(404).json({ message: "Recipe not found" });
    res.json({ message: "Recipe updated" });
  } catch (err) {
    res.status(400).json({ message: "Failed to update recipe", error: err.message });
  }
});

// Delete a recipe
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await prisma.recipe.deleteMany({
      where: { id, createdById: req.userId }
    });
    if (recipe.count === 0) return res.status(404).json({ message: "Recipe not found" });
    res.json({ message: "Recipe deleted" });
  } catch (err) {
    res.status(400).json({ message: "Failed to delete recipe", error: err.message });
  }
});

// Get a single recipe by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await prisma.recipe.findFirst({
      where: { id, createdById: req.userId },
      include: { ingredients: true }
    });
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch recipe" });
  }
});

module.exports = router;