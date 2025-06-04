const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

async function main() {
  // Hash the test password
  const password = "Test123!";
  const passwordHash = await bcrypt.hash(password, 10);

  // Create a user
  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      passwordHash,
    },
  });

  // Create ingredients for the user
  const milk = await prisma.ingredient.create({
    data: {
      name: "Milk",
      quantity: 1,
      quantityType: "L",
      expiration: new Date("2025-07-01T00:00:00.000Z"),
      notes: "Low fat",
      userId: user.id,
    },
  });

  const eggs = await prisma.ingredient.create({
    data: {
      name: "Eggs",
      quantity: 12,
      quantityType: "PCS",
      expiration: new Date("2025-06-15T00:00:00.000Z"),
      notes: "Free range",
      userId: user.id,
    },
  });

  // Create a recipe for the user
  const recipe = await prisma.recipe.create({
    data: {
      title: "Omelette",
      time: 10,
      instructions: "Beat eggs, add milk, cook in pan.",
      imageUrl: "https://example.com/omelette.jpg",
      notes: "Classic breakfast",
      createdById: user.id,
    },
  });

  // Link ingredients to the recipe
  await prisma.recipeIngredient.createMany({
    data: [
      {
        recipeId: recipe.id,
        ingredientId: eggs.id,
        quantity: 2,
        quantityType: "PCS",
        notes: "Beaten",
      },
      {
        recipeId: recipe.id,
        ingredientId: milk.id,
        quantity: 0.1,
        quantityType: "L",
        notes: "Optional",
      },
    ],
  });

  console.log("Seed data created!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
