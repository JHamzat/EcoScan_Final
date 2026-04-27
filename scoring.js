// scoring.js - Sustainability scoring system for EcoScan

const ScoringSystem = (() => {
  // Helper function to get grade from score
  function getGrade(score) {
    if (score >= 80) return "A";
    if (score >= 65) return "B";
    if (score >= 50) return "C";
    if (score >= 35) return "D";
    return "E";
  }

  // Helper function to get confidence grade
  function getConfidenceGrade(confidence) {
    if (confidence >= 75) return "high";
    if (confidence >= 45) return "medium";
    return "low";
  }

  // FACTOR 1 — NUTRITION (weight: 0.10)
  function calculateNutritionFactor(product) {
    const grade = product.nutrition_grades || product.nutrition_grade_fr;
    if (!grade) return { score: 30, missing: true }; // Missing-data penalty

    const gradeMap = {
      a: 90,
      b: 75,
      c: 60,
      d: 40,
      e: 20,
    };

    const score = gradeMap[grade.toLowerCase()] || 30;
    return { score, missing: false };
  }

  // FACTOR 2 — PROCESSING (weight: 0.20)
  function calculateProcessingFactor(product) {
    const novaGroup = product.nova_group;
    if (!novaGroup) return { score: 30, missing: true }; // Missing-data penalty

    const novaMap = {
      1: 95, // unprocessed
      2: 75, // culinary ingredients
      3: 50, // processed
      4: 15, // ultra-processed
    };

    const score = novaMap[novaGroup] || 30;
    return { score, missing: false, ultra_processed: novaGroup === 4 };
  }

  // FACTOR 3 — PACKAGING (weight: 0.20)
  function calculatePackagingFactor(product) {
    const packaging = product.packaging;
    if (!packaging) return { score: 25, missing: true }; // Missing-data penalty

    let score = 70; // Base score
    let hasPlastic = false;

    // Handle packaging as string or array
    let packagingText = "";
    if (Array.isArray(packaging)) {
      packagingText = packaging.join(" ").toLowerCase();
    } else if (typeof packaging === "string") {
      packagingText = packaging.toLowerCase();
    } else {
      return { score: 25, missing: true };
    }

    // Bonuses (additive)
    if (packagingText.includes("glass")) score += 20;
    if (packagingText.includes("cardboard")) score += 15;
    if (packagingText.includes("paper")) score += 10;
    if (packagingText.includes("recycled")) score += 10;
    if (packagingText.includes("recyclable")) score += 10;

    // Penalties (subtractive)
    if (packagingText.includes("plastic")) {
      score -= 25;
      hasPlastic = true;
    }
    if (packagingText.includes("styrofoam")) score -= 30;
    if (packagingText.includes("film")) score -= 10;
    if (packagingText.includes("sachet")) score -= 10;

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    return { score, missing: false, plastic_packaging: hasPlastic };
  }

  // FACTOR 4 — ORIGIN (weight: 0.25)
  function calculateOriginFactor(product) {
    // Check for carbon footprint data first
    if (
      product.ecoscore_data &&
      product.ecoscore_data.agribalyse &&
      product.ecoscore_data.agribalyse.co2_total !== undefined
    ) {
      const co2Total = product.ecoscore_data.agribalyse.co2_total;
      const score = Math.max(0, Math.min(100, 100 - co2Total * 10));
      return { score, missing: false, imported: false, co2_based: true };
    }

    // Fallback to origin-based scoring
    const origins =
      product.origins ||
      product.manufacturing_places ||
      product.countries_where_sold;
    if (!origins) return { score: 30, missing: true }; // Missing-data penalty

    const originsText = Array.isArray(origins)
      ? origins.join(" ").toLowerCase()
      : origins.toLowerCase();

    // UK-centric proximity tiers
    // Tier 1 — UK domestic (lowest food miles)
    const ukDomestic = [
      "united kingdom",
      "uk",
      "great britain",
      "england",
      "scotland",
      "wales",
      "northern ireland",
      "local",
      "domestic",
    ];
    // Tier 2 — Near Europe (short sea crossing, low transport emissions)
    const nearEurope = [
      "ireland",
      "france",
      "netherlands",
      "belgium",
      "germany",
      "denmark",
      "spain",
      "portugal",
      "italy",
      "luxembourg",
      "switzerland",
      "austria",
      "europe",
    ];
    // Tier 3 — Wider Europe / North Africa (longer but still moderate emissions)
    const widerEurope = [
      "norway",
      "sweden",
      "finland",
      "poland",
      "czech",
      "hungary",
      "greece",
      "turkey",
      "morocco",
      "tunisia",
      "egypt",
      "north africa",
    ];

    let score = 30; // Default for unknown
    let imported = true;

    if (ukDomestic.some((t) => originsText.includes(t))) {
      score = 90; // UK domestic
      imported = false;
    } else if (nearEurope.some((t) => originsText.includes(t))) {
      score = 68; // Near Europe — short sea crossing
    } else if (widerEurope.some((t) => originsText.includes(t))) {
      score = 50; // Wider Europe
    } else if (
      originsText.includes("united states") ||
      originsText.includes("usa") ||
      originsText.includes("canada") ||
      originsText.includes("australia") ||
      originsText.includes("new zealand") ||
      originsText.includes("brazil") ||
      originsText.includes("argentina") ||
      originsText.includes("chile") ||
      originsText.includes("south america") ||
      originsText.includes("north america")
    ) {
      score = 28; // Long-haul intercontinental
    } else if (
      originsText.includes("china") ||
      originsText.includes("india") ||
      originsText.includes("thailand") ||
      originsText.includes("indonesia") ||
      originsText.includes("malaysia") ||
      originsText.includes("vietnam") ||
      originsText.includes("asia")
    ) {
      score = 18; // Long-haul Asia (often associated with palm oil supply chains)
    } else {
      score = 35; // Known but unclassified origin
    }

    return { score, missing: false, imported };
  }

  // FACTOR 5 — INGREDIENT IMPACT (weight: 0.25)
  function calculateIngredientFactor(product) {
    const ingredients = product.ingredients;
    const ingredientsText = product.ingredients_text;
    const additivesTags = product.additives_tags || [];
    const analysisTags = product.ingredients_analysis_tags || [];

    if (!ingredients && !ingredientsText) return { score: 30, missing: true }; // Missing-data penalty

    let score = 80; // Base score
    let palmOil = false;
    let highAdditives = false;

    // Check for palm oil
    if (
      analysisTags.includes("en:palm-oil") ||
      (ingredientsText && ingredientsText.toLowerCase().includes("palm oil"))
    ) {
      score -= 25;
      palmOil = true;
    }

    // Penalize high ingredient count
    let ingredientCount = 0;
    if (ingredients && Array.isArray(ingredients)) {
      ingredientCount = ingredients.length;
    } else if (ingredientsText) {
      // Rough estimate from text (count commas)
      ingredientCount = (ingredientsText.match(/,/g) || []).length + 1;
    }

    if (ingredientCount > 20) {
      score -= 20;
    } else if (ingredientCount > 10) {
      score -= 10;
    }

    // Penalize additives
    const additivePenalty = Math.min(20, additivesTags.length * 3);
    score -= additivePenalty;
    if (additivesTags.length > 5) highAdditives = true;

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      missing: false,
      palm_oil: palmOil,
      high_additives: highAdditives,
    };
  }

  // CONFIDENCE CALCULATION FUNCTIONS

  // Nutrition confidence
  function calculateNutritionConfidence(product) {
    const grade = product.nutrition_grades || product.nutrition_grade_fr;
    return grade ? 1.0 : 0.0;
  }

  // Processing confidence
  function calculateProcessingConfidence(product) {
    return product.nova_group ? 1.0 : 0.0;
  }

  // Packaging confidence
  function calculatePackagingConfidence(product) {
    const packaging = product.packaging;
    if (!packaging) return 0.0;

    // Handle packaging as string or array
    let packagingText = "";
    if (Array.isArray(packaging)) {
      packagingText = packaging.join(" ").toLowerCase();
    } else if (typeof packaging === "string") {
      packagingText = packaging.toLowerCase();
    } else {
      return 0.0;
    }

    // Count distinct materials (rough approximation)
    const materials = [
      "glass",
      "plastic",
      "paper",
      "cardboard",
      "metal",
      "styrofoam",
      "film",
      "sachet",
    ];
    let distinctCount = 0;
    materials.forEach((material) => {
      if (packagingText.includes(material)) distinctCount++;
    });

    if (distinctCount >= 2) return 1.0;
    if (distinctCount === 1) return 0.5;
    return 0.0; // Only vague terms
  }

  // Origin confidence
  function calculateOriginConfidence(product) {
    // Check for carbon footprint data first (highest confidence)
    if (
      product.ecoscore_data &&
      product.ecoscore_data.agribalyse &&
      product.ecoscore_data.agribalyse.co2_total !== undefined
    ) {
      return 1.0; // Hard data
    }

    // Check for specific country data
    const origins =
      product.origins ||
      product.manufacturing_places ||
      product.countries_where_sold;
    if (!origins) return 0.0;

    const originsText = Array.isArray(origins)
      ? origins.join(" ").toLowerCase()
      : origins.toLowerCase();

    // Specific countries — UK-relevant list expanded
    const specificCountries = [
      "united kingdom",
      "uk",
      "great britain",
      "england",
      "scotland",
      "wales",
      "northern ireland",
      "ireland",
      "france",
      "germany",
      "netherlands",
      "belgium",
      "denmark",
      "spain",
      "portugal",
      "italy",
      "switzerland",
      "austria",
      "sweden",
      "norway",
      "finland",
      "poland",
      "turkey",
      "morocco",
      "egypt",
      "united states",
      "usa",
      "canada",
      "china",
      "india",
      "japan",
      "australia",
      "new zealand",
      "brazil",
      "argentina",
    ];
    for (const country of specificCountries) {
      if (originsText.includes(country)) return 0.8;
    }

    // Continent-level only
    const continents = [
      "europe",
      "asia",
      "africa",
      "north america",
      "south america",
      "oceania",
    ];
    for (const continent of continents) {
      if (originsText.includes(continent)) return 0.5;
    }

    return 0.0; // Unknown specificity
  }

  // Ingredient confidence
  function calculateIngredientConfidence(product) {
    const ingredientsText = product.ingredients_text;
    const additivesTags = product.additives_tags;

    const hasIngredientsText =
      ingredientsText && ingredientsText.trim().length > 0;
    const hasAdditivesTags =
      additivesTags && Array.isArray(additivesTags) && additivesTags.length > 0;

    if (hasIngredientsText && hasAdditivesTags) return 1.0;
    if (hasIngredientsText || hasAdditivesTags) return 0.5;
    return 0.0;
  }

  // Calculate overall sustainability score
  function calculateSustainabilityScore(product) {
    const nutrition = calculateNutritionFactor(product);
    const processing = calculateProcessingFactor(product);
    const packaging = calculatePackagingFactor(product);
    const origin = calculateOriginFactor(product);
    const ingredient = calculateIngredientFactor(product);

    // Calculate weighted scores
    const factorScores = {
      nutrition: {
        score: nutrition.score,
        weight: 0.1,
        weighted: Math.round(nutrition.score * 0.1 * 10) / 10,
      },
      processing: {
        score: processing.score,
        weight: 0.2,
        weighted: Math.round(processing.score * 0.2 * 10) / 10,
      },
      packaging: {
        score: packaging.score,
        weight: 0.2,
        weighted: Math.round(packaging.score * 0.2 * 10) / 10,
      },
      origin: {
        score: origin.score,
        weight: 0.25,
        weighted: Math.round(origin.score * 0.25 * 10) / 10,
      },
      ingredient: {
        score: ingredient.score,
        weight: 0.25,
        weighted: Math.round(ingredient.score * 0.25 * 10) / 10,
      },
    };

    // Calculate overall score
    const totalWeightedScore = Object.values(factorScores).reduce(
      (sum, factor) => sum + factor.weighted,
      0,
    );
    const sustainabilityScore = Math.round(totalWeightedScore * 10) / 10;

    // Collect flags
    const flags = {
      palm_oil: ingredient.palm_oil || false,
      ultra_processed: processing.ultra_processed || false,
      plastic_packaging: packaging.plastic_packaging || false,
      imported: origin.imported || false,
      high_additives: ingredient.high_additives || false,
      missing_data: [],
    };

    // Add missing data flags
    if (nutrition.missing) flags.missing_data.push("nutrition");
    if (processing.missing) flags.missing_data.push("processing");
    if (packaging.missing) flags.missing_data.push("packaging");
    if (origin.missing) flags.missing_data.push("origin");
    if (ingredient.missing) flags.missing_data.push("ingredient");

    // Calculate confidence scores
    const confidenceScores = {
      nutrition: calculateNutritionConfidence(product),
      processing: calculateProcessingConfidence(product),
      packaging: calculatePackagingConfidence(product),
      origin: calculateOriginConfidence(product),
      ingredient: calculateIngredientConfidence(product),
    };

    // Calculate overall confidence
    const confidence = Math.round(
      (confidenceScores.nutrition * 0.1 +
        confidenceScores.processing * 0.2 +
        confidenceScores.packaging * 0.2 +
        confidenceScores.origin * 0.25 +
        confidenceScores.ingredient * 0.25) *
        100,
    );

    return {
      sustainability_score: sustainabilityScore,
      grade: getGrade(sustainabilityScore),
      confidence_score: confidence,
      confidence_grade: getConfidenceGrade(confidence),
      factor_confidence: confidenceScores,
      factor_scores: factorScores,
      flags: flags,
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
