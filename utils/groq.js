const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Valid unit types from Prisma schema
const VALID_UNITS = ['G', 'KG', 'ML', 'L', 'PCS', 'TBSP', 'TSP', 'CUP', 'OZ', 'LB', 'SLICE', 'PINCH', 'OTHER'];

// Helper function to format ingredients for prompt
const formatIngredientsForPrompt = (ingredients) => {
  return ingredients.map(ing => `${ing.name} (${ing.quantity} ${ing.quantityType})`).join(', ');
};

// Helper function to clean response content
const cleanResponseContent = (content) => {
  // Remove markdown code blocks and any explanatory text
  return content
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .replace(/^Here.*?:\s*/g, '')
    .trim();
};

// Main function to get recipe suggestions
async function getRecipeSuggestions(ingredients, options = {}) {
  try {
    const formattedIngredients = formatIngredientsForPrompt(ingredients);
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content: `You are a professional chef API that ONLY outputs raw JSON arrays without any markdown formatting or explanation. 
                     Each recipe must strictly follow this schema and cooking best practices:
                     {
                       "title": "string (descriptive name)",
                       "time": "number (total minutes required)",
                       "instructions": {
                         "prep": [
                           {
                             "step": "number",
                             "description": "string (detailed preparation instruction)",
                             "time": "number (minutes required)",
                             "tools": ["string (required kitchen tools)"]
                           }
                         ],
                         "cooking": [
                           {
                             "step": "number",
                             "description": "string (detailed cooking instruction)",
                             "time": "number (minutes required)",
                             "temperature": "string (if applicable)",
                             "indicators": "string (how to know step is complete)"
                           }
                         ],
                         "plating": [
                           {
                             "step": "number",
                             "description": "string (plating and serving instructions)"
                           }
                         ]
                       },
                       "difficulty": "string (easy, medium, hard)",
                       "imageUrl": "string (optional)",
                       "notes": "string (tips, variations, storage advice)",
                       "ingredients": {
                         "available": [
                           {
                             "name": "string",
                             "quantity": "number",
                             "quantityType": "enum(${VALID_UNITS.join(', ')})",
                             "notes": "string (preparation state, e.g., 'diced', 'room temperature')"
                           }
                         ],
                         "missing": [
                           {
                             "name": "string",
                             "quantity": "number",
                             "quantityType": "enum(${VALID_UNITS.join(', ')})",
                             "notes": "string (optional)"
                           }
                         ]
                       }
                     }`
          },
          {
            role: "user",
            content: `Output a raw JSON array with ${options.limit || 3} recipes using these ingredients: ${formattedIngredients}. 
                     Follow the schema exactly. Use realistic quantities and appropriate units from the allowed enum values.
                     Make instructions extremely detailed and specific, including:
                     - Exact measurements and temperatures
                     - Required tools and equipment
                     - Visual or tactile indicators for doneness
                     - Timing for each step
                     - Proper ingredient preparation states
                     - Safety precautions where needed
                     
                     Example response format:
                     [{
                       "title": "Classic French Toast with Vanilla",
                       "time": 25,
                       "difficulty": "easy",
                       "instructions": {
                         "prep": [
                           {
                             "step": 1,
                             "description": "In a shallow bowl, whisk 2 eggs until fully beaten. Add 1/2 cup milk, 1 tsp vanilla extract, and 1/4 tsp cinnamon. Whisk until well combined and no egg streaks remain.",
                             "time": 3,
                             "tools": ["whisk", "shallow bowl", "measuring cups", "measuring spoons"]
                           }
                         ],
                         "cooking": [
                           {
                             "step": 1,
                             "description": "Heat a non-stick skillet over medium heat (350°F). Add 1 TBSP butter and swirl to coat the pan. Once butter is foamy but not brown, proceed to cooking.",
                             "time": 2,
                             "temperature": "350°F",
                             "indicators": "Butter should be foamy but not browned"
                           },
                           {
                             "step": 2,
                             "description": "Dip each bread slice in egg mixture for 5 seconds per side. Let excess drip off. Place in pan and cook until golden brown, about 2-3 minutes per side.",
                             "time": 5,
                             "temperature": "medium heat",
                             "indicators": "Golden brown color, slightly puffed, and no wet spots"
                           }
                         ],
                         "plating": [
                           {
                             "step": 1,
                             "description": "Serve immediately on warmed plates. Dust with powdered sugar and serve with maple syrup on the side."
                           }
                         ]
                       },
                       "notes": "For best results, use day-old bread. Store any leftovers in an airtight container in the refrigerator for up to 2 days. Reheat in a toaster for best texture.",
                       "ingredients": {
                         "available": [
                           {"name": "eggs", "quantity": 2, "quantityType": "PCS", "notes": "room temperature"},
                           {"name": "milk", "quantity": 0.5, "quantityType": "CUP", "notes": "whole milk preferred"}
                         ],
                         "missing": [
                           {"name": "bread", "quantity": 4, "quantityType": "SLICE", "notes": "thick-cut, day-old"},
                           {"name": "vanilla extract", "quantity": 1, "quantityType": "TSP", "notes": null},
                           {"name": "cinnamon", "quantity": 0.25, "quantityType": "TSP", "notes": "ground"}
                         ]
                       }
                     }]`
          }
        ],
        temperature: 0.3,
        max_tokens: 4096
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      console.error('Unexpected Groq API response structure:', response.data);
      throw new Error('Invalid response structure from Groq API');
    }

    // Parse and format the response
    let suggestions;
    try {
      const content = cleanResponseContent(response.data.choices[0].message.content);
      console.log('Cleaned Groq response:', content);  // Log the cleaned response for debugging
      suggestions = JSON.parse(content);
      
      if (!Array.isArray(suggestions)) {
        throw new Error('Response is not an array');
      }

      // Validate each recipe matches our schema
      suggestions.forEach(recipe => {
        if (!recipe.title || !recipe.time || !recipe.instructions || !recipe.ingredients) {
          throw new Error('Recipe missing required fields');
        }
        
        // Validate instructions structure
        if (!recipe.instructions.prep || !recipe.instructions.cooking || !recipe.instructions.plating) {
          throw new Error('Recipe instructions missing required sections');
        }

        // Validate steps are numbered correctly
        ['prep', 'cooking', 'plating'].forEach(section => {
          recipe.instructions[section].forEach((step, index) => {
            if (step.step !== index + 1) {
              throw new Error(`Invalid step numbering in ${section} section`);
            }
          });
        });
        
        // Validate units in ingredients
        [...(recipe.ingredients.available || []), ...(recipe.ingredients.missing || [])].forEach(ing => {
          if (!VALID_UNITS.includes(ing.quantityType)) {
            throw new Error(`Invalid unit type: ${ing.quantityType}`);
          }
        });
      });
    } catch (parseError) {
      console.error('Failed to parse or validate Groq response:', parseError.message);
      throw new Error('Invalid JSON response from Groq API');
    }

    return suggestions.map(recipe => ({
      ...recipe,
      source: 'groq',
      confidence: response.data.choices[0].finish_reason === 'stop' ? 'high' : 'medium'
    }));
  } catch (error) {
    console.error('Groq API Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch recipe suggestions from Groq API');
  }
}

module.exports = {
  getRecipeSuggestions
}; 