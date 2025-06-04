const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("./auth");
const { getRecipeSuggestions } = require("../utils/groq");
const { convertAiRecipeToRegular } = require("../utils/recipeUtils");

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

// Get recipe suggestions based on user's ingredients
router.post("/suggestions", authMiddleware, async (req, res) => {
  try {
    // Get user's ingredients from database
    const userIngredients = await prisma.ingredient.findMany({
      where: { userId: req.userId },
      select: { name: true }
    });

    if (!userIngredients.length) {
      return res.status(400).json({
        message: "No ingredients found. Please add some ingredients first."
      });
    }

    // Get recipe suggestions from Groq
    const suggestions = await getRecipeSuggestions(userIngredients, {
      limit: req.body.limit || 3
    });

    res.json(suggestions);
  } catch (err) {
    console.error('Recipe suggestion error:', err);
    res.status(500).json({
      message: "Failed to fetch recipe suggestions",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Save a generated recipe
router.post("/save-suggestion", authMiddleware, async (req, res) => {
  try {
    // Destructure only the fields we want to save
    const { title, time, instructions, imageUrl, notes, ingredients } = req.body;

    // Start a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the recipe with only the fields in our schema
      const recipe = await tx.recipe.create({
        data: {
          title,
          time,
          // Convert structured instructions to string format for storage
          instructions: JSON.stringify(instructions),
          imageUrl,
          notes,
          createdById: req.userId
        }
      });

      // 2. Process available ingredients
      const availableIngredientPromises = ingredients.available.map(async (ing) => {
        // Check if ingredient exists
        let ingredient = await tx.ingredient.findFirst({
          where: {
            name: ing.name,
            userId: req.userId
          }
        });

        // If ingredient doesn't exist, create it
        if (!ingredient) {
          ingredient = await tx.ingredient.create({
            data: {
              name: ing.name,
              quantity: ing.quantity,
              quantityType: ing.quantityType,
              notes: ing.notes,
              userId: req.userId
            }
          });
        }

        // Create recipe-ingredient relationship
        return tx.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            quantity: ing.quantity,
            quantityType: ing.quantityType,
            notes: ing.notes
          }
        });
      });

      // 3. Process missing ingredients
      const missingIngredientPromises = ingredients.missing.map(async (ing) => {
        // Create ingredient with zero quantity
        const ingredient = await tx.ingredient.create({
          data: {
            name: ing.name,
            quantity: 0, // Set to 0 since it's missing
            quantityType: ing.quantityType,
            notes: ing.notes,
            userId: req.userId
          }
        });

        // Create recipe-ingredient relationship
        return tx.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            quantity: ing.quantity,
            quantityType: ing.quantityType,
            notes: ing.notes
          }
        });
      });

      // Wait for all ingredient operations to complete
      await Promise.all([...availableIngredientPromises, ...missingIngredientPromises]);

      // Return the created recipe with its ingredients
      return tx.recipe.findUnique({
        where: { id: recipe.id },
        include: {
          ingredients: {
            include: {
              ingredient: true
            }
          }
        }
      });
    });

    const aiRecipe = result;
    const regularRecipe = convertAiRecipeToRegular(aiRecipe);

    res.status(201).json({
      message: "Recipe saved successfully",
      recipe: {
        ...regularRecipe,
        instructions: JSON.parse(regularRecipe.instructions) // Convert back to structured format
      }
    });
  } catch (err) {
    console.error('Save recipe error:', err);
    res.status(400).json({
      message: "Failed to save recipe",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;