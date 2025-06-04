/**
 * Converts AI-generated recipe instructions into a formatted string
 * @param {Object} instructions - Structured instructions object from AI
 * @returns {string} - Formatted instructions string
 */
function formatInstructions(instructions) {
  const sections = [];

  // Format preparation steps
  if (instructions.prep && instructions.prep.length > 0) {
    sections.push('Preparation:');
    instructions.prep.forEach(step => {
      const tools = step.tools ? ` (Tools needed: ${step.tools.join(', ')})` : '';
      sections.push(`${step.step}. ${step.description}${tools}`);
    });
  }

  // Format cooking steps
  if (instructions.cooking && instructions.cooking.length > 0) {
    sections.push('\nCooking:');
    instructions.cooking.forEach(step => {
      let details = [];
      if (step.temperature) details.push(`Temperature: ${step.temperature}`);
      if (step.indicators) details.push(`Done when: ${step.indicators}`);
      const extraInfo = details.length > 0 ? ` (${details.join(', ')})` : '';
      sections.push(`${step.step}. ${step.description}${extraInfo}`);
    });
  }

  // Format plating steps
  if (instructions.plating && instructions.plating.length > 0) {
    sections.push('\nPlating:');
    instructions.plating.forEach(step => {
      sections.push(`${step.step}. ${step.description}`);
    });
  }

  return sections.join('\n');
}

/**
 * Converts an AI-generated recipe to the format expected by the /recipes endpoint
 * @param {Object} aiRecipe - The AI-generated recipe object
 * @returns {Object} - Formatted recipe object for the /recipes endpoint
 */
function convertAiRecipeToRegular(aiRecipe) {
  // Extract basic recipe information
  const regularRecipe = {
    title: aiRecipe.title,
    time: aiRecipe.time,
    instructions: formatInstructions(aiRecipe.instructions),
    notes: aiRecipe.notes,
    imageUrl: aiRecipe.imageUrl
  };

  // Format ingredients for reference in notes
  const ingredientsList = [];
  
  if (aiRecipe.ingredients.available && aiRecipe.ingredients.available.length > 0) {
    ingredientsList.push('\nRequired Ingredients:');
    aiRecipe.ingredients.available.forEach(ing => {
      const notes = ing.notes ? ` (${ing.notes})` : '';
      ingredientsList.push(`- ${ing.quantity} ${ing.quantityType} ${ing.name}${notes}`);
    });
  }

  if (aiRecipe.ingredients.missing && aiRecipe.ingredients.missing.length > 0) {
    ingredientsList.push('\nAdditional Ingredients Needed:');
    aiRecipe.ingredients.missing.forEach(ing => {
      const notes = ing.notes ? ` (${ing.notes})` : '';
      ingredientsList.push(`- ${ing.quantity} ${ing.quantityType} ${ing.name}${notes}`);
    });
  }

  // Append ingredients list to notes
  if (ingredientsList.length > 0) {
    regularRecipe.notes = (regularRecipe.notes || '') + 
      '\n\n' + ingredientsList.join('\n');
  }

  return regularRecipe;
}

module.exports = {
  convertAiRecipeToRegular
}; 