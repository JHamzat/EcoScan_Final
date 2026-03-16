// scoring.js - Sustainability scoring system for EcoScan

const ScoringSystem = (() => {
  // Nutrition Factor: Based on Open Food Facts nutrition grade
  // A → 90, B → 75, C → 60, D → 40, E → 20
  function calculateNutritionFactor(product) {
    const grade = product.nutrition_grades || product.nutrition_grade_fr;
    if (!grade) return 50; // Default if no grade available

    const gradeMap = {
      a: 90,
      b: 75,
      c: 60,
      d: 40,
      e: 20,
    };

    return gradeMap[grade.toLowerCase()] || 50;
  }

  // Processing Factor: Based on NOVA group
  // NOVA 1 (unprocessed) = 90, NOVA 4 (ultra-processed) = 20
  function calculateProcessingFactor(product) {
    const novaGroup = product.nova_group;
    if (!novaGroup) return 50; // Default if no NOVA data

    const novaMap = {
      1: 90, // Unprocessed or minimally processed
      2: 75, // Processed culinary ingredients
      3: 50, // Processed foods
      4: 20, // Ultra-processed
    };

    return novaMap[novaGroup] || 50;
  }

  // Packaging Factor: Based on material recyclability and weight
  function calculatePackagingFactor(product) {
    const packaging = product.packaging;
    if (!packaging) return 30; // Penalty for missing packaging info

    let score = 50; // Base score

    // Handle packaging as string or array
    let packagingText = "";
    if (Array.isArray(packaging)) {
      packagingText = packaging.join(" ").toLowerCase();
    } else if (typeof packaging === "string") {
      packagingText = packaging.toLowerCase();
    } else {
      return 30; // Penalty for unrecognized format
    }

    // Positive factors
    if (
      packagingText.includes("glass") &&
      packagingText.includes("recyclable")
    ) {
      score += 30;
    } else if (packagingText.includes("glass")) {
      score += 20;
    }

    if (
      packagingText.includes("paper") ||
      packagingText.includes("cardboard")
    ) {
      score += 15;
    }

    if (
      packagingText.includes("metal") &&
      packagingText.includes("recyclable")
    ) {
      score += 20;
    }

    // Negative factors
    if (
      packagingText.includes("plastic") &&
      !packagingText.includes("recyclable")
    ) {
      score -= 20;
    }

    if (
      packagingText.includes("plastic") &&
      packagingText.includes("single-use")
    ) {
      score -= 15;
    }

    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  // Origin Factor: Local vs imported, or carbon footprint
  function calculateOriginFactor(product) {
    // Check for carbon footprint data first
    if (product.ecoscore_data && product.ecoscore_data.agribalyse) {
      const co2Total = product.ecoscore_data.agribalyse.co2_total;
      if (co2Total !== undefined) {
        // Scale carbon footprint: lower CO2 = higher score
        // Assuming typical range 0-50 kg CO2/kg, scale to 0-100
        const scaledScore = Math.max(0, 100 - co2Total * 2);
        return Math.min(100, scaledScore);
      }
    }

    // Fallback to origin-based scoring
    const origins = product.origins;
    if (!origins) return 50; // Default if no origin data

    const originsText = origins.toLowerCase();

    // Simple proxy: if contains "local" or country matches user's presumed location
    // For demo, assume US-based user
    if (
      originsText.includes("united states") ||
      originsText.includes("usa") ||
      originsText.includes("local") ||
      originsText.includes("domestic")
    ) {
      return 80; // Local = higher score
    } else {
      return 40; // Imported = lower score
    }
  }

  // Ingredient Impact Factor: Penalize palm oil, high ingredient count, additives
  function calculateIngredientFactor(product) {
    const ingredients = product.ingredients;
    if (!ingredients) return 50; // Default if no ingredient data

    let score = 100; // Start with perfect score

    // Check for palm oil
    const ingredientsText = JSON.stringify(ingredients).toLowerCase();
    if (
      ingredientsText.includes("palm") ||
      ingredientsText.includes("palm oil")
    ) {
      score -= 30;
    }

    // Penalize high ingredient count
    const ingredientCount = ingredients.length;
    if (ingredientCount > 20) {
      score -= 20;
    } else if (ingredientCount > 10) {
      score -= 10;
    }

    // Check for additives (ingredients with high additive potential)
    let additiveCount = 0;
    ingredients.forEach((ing) => {
      if (
        ing.text &&
        (ing.text.toLowerCase().includes("additive") ||
          ing.text.toLowerCase().includes("preservative") ||
          ing.text.toLowerCase().includes("color") ||
          ing.text.toLowerCase().includes("flavor"))
      ) {
        additiveCount++;
      }
    });

    score -= Math.min(20, additiveCount * 5); // Up to 20 points penalty

    return Math.max(0, score);
  }

  // Calculate overall sustainability score
  function calculateSustainabilityScore(product) {
    const factors = {
      nutrition: calculateNutritionFactor(product),
      processing: calculateProcessingFactor(product),
      packaging: calculatePackagingFactor(product),
      origin: calculateOriginFactor(product),
      ingredients: calculateIngredientFactor(product),
    };

    // Equal weighting for all factors
    const totalScore = Object.values(factors).reduce(
      (sum, score) => sum + score,
      0,
    );
    const averageScore = Math.round(totalScore / Object.keys(factors).length);

    return {
      totalScore: averageScore,
      factors: factors,
    };
  }

  // Get score interpretation
  function getScoreInterpretation(score) {
    if (score >= 80) return { text: "🌟 Excellent choice!", color: "#4CAF50" };
    if (score >= 65) return { text: "👍 Good option", color: "#8BC34A" };
    if (score >= 50) return { text: "⚠️ Moderate impact", color: "#FF9800" };
    return { text: "❌ Consider alternatives", color: "#F44336" };
  }

  return {
    calculateSustainabilityScore,
    getScoreInterpretation,
  };
})();
