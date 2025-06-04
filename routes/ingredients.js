const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("./auth");

const prisma = new PrismaClient();
const router = express.Router();

// Get all ingredients for the authenticated user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const ingredients = await prisma.ingredient.findMany({
      where: { userId: req.userId }
    });
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch ingredients" });
  }
});

// Add a new ingredient
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, quantity, quantityType, expiration, notes } = req.body;
    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        quantity: parseFloat(quantity),
        quantityType,
        expiration: expiration ? new Date(expiration) : null,
        notes,
        userId: req.userId
      }
    });
    res.status(201).json(ingredient);
  } catch (err) {
    res.status(400).json({ message: "Failed to create ingredient", error: err.message });
  }
});

// Update an ingredient
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, quantity, quantityType, expiration, notes } = req.body;
    const updated = await prisma.ingredient.updateMany({
      where: { id, userId: req.userId },
      data: {
        name,
        quantity: parseFloat(quantity),
        quantityType,
        expiration: expiration ? new Date(expiration) : null,
        notes
      }
    });
    if (updated.count === 0) return res.status(404).json({ message: "Ingredient not found" });
    res.json({ message: "Ingredient updated" });
  } catch (err) {
    res.status(400).json({ message: "Failed to update ingredient", error: err.message });
  }
});

// Delete an ingredient
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await prisma.ingredient.deleteMany({
      where: { id, userId: req.userId }
    });
    if (deleted.count === 0) return res.status(404).json({ message: "Ingredient not found" });
    res.json({ message: "Ingredient deleted" });
  } catch (err) {
    res.status(400).json({ message: "Failed to delete ingredient", error: err.message });
  }
});

// Get a single ingredient by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const ingredient = await prisma.ingredient.findFirst({
      where: { id, userId: req.userId }
    });
    if (!ingredient) return res.status(404).json({ message: "Ingredient not found" });
    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch ingredient" });
  }
});

module.exports = router;