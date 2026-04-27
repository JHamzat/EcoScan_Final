// alternatives.js - Finds greener alternative products using Open Food Facts
// Strategy: search the scanned product's most specific category tag,
// sort by ecoscore_score descending, score each result with our own
// ScoringSystem, and return the top alternatives that beat the original.

const AlternativesModule = (() => {

  // Fields we need from OFF search — keeps response small
  const FIELDS = [
    "product_name", "brands", "image_small_url", "ecoscore_score",
    "nutrition_grades", "nutrition_grade_fr", "nova_group", "packaging",
    "origins", "manufacturing_places", "countries_where_sold",
    "ingredients_text", "ingredients", "additives_tags",
    "ingredients_analysis_tags", "ecoscore_data", "categories_tags"
  ].join(",");

  // Pick the most useful category tag from a product's category list.
  // OFF tags look like "en:biscuits-and-cakes" — we want specific ones,
  // not the root "en:snacks" or "en:sugary-snacks".
  function pickBestCategory(categoriesTags) {
    if (!categoriesTags || categoriesTags.length === 0) return null;

    // Skip very generic root categories
    const blocklist = new Set([
      "en:foods", "en:plant-based-foods", "en:plant-based-foods-and-beverages",
      "en:beverages", "en:groceries", "en:organic-foods", "en:fair-trade-products",
      "en:sweeteners", "en:sugary-snacks", "en:snacks", "en:meals",
      "en:fermented-foods", "en:frozen-foods", "en:canned-foods",
    ]);

    // Prefer English tags and skip blocklisted ones; pick the last (most specific)
    const englishTags = categoriesTags.filter(
      (t) => t.startsWith("en:") && !blocklist.has(t)
    );

    if (englishTags.length === 0) return null;

    // The most specific tag is usually towards the end of the array
    return englishTags[englishTags.length - 1];
  }

  // Fetch alternatives from OFF search API
  async function fetchAlternatives(product, originalScore, maxResults = 4) {
    const category = pickBestCategory(product.categories_tags);
    if (!category) {
      return { alternatives: [], reason: "no_category" };
    }

    const url =
      `https://world.openfoodfacts.org/api/v2/search` +
      `?categories_tags=${encodeURIComponent(category)}` +
      `&sort_by=ecoscore_score` +
      `&page_size=20` +
      `&fields=${encodeURIComponent(FIELDS)}`;

    let products;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      products = data.products || [];
    } catch (err) {
      console.warn("AlternativesModule: fetch failed", err);
      return { alternatives: [], reason: "fetch_error" };
    }

    if (products.length === 0) {
      return { alternatives: [], reason: "no_results", category };
    }

    // Score each candidate with our own ScoringSystem
    const scored = products
      .filter((p) => p.product_name && p.product_name.trim().length > 0)
      .map((p) => {
        const scoreData = ScoringSystem.calculateSustainabilityScore(p);
        return { product: p, scoreData };
      })
      // Only show products that beat the original by at least 5 points
      .filter(({ scoreData }) => scoreData.sustainability_score >= originalScore + 5)
      // Sort best first
      .sort((a, b) => b.scoreData.sustainability_score - a.scoreData.sustainability_score);

    // De-duplicate by brand+name similarity
    const seen = new Set();
    const deduped = scored.filter(({ product }) => {
      const key = `${(product.brands || "").toLowerCase().slice(0, 15)}_${(product.product_name || "").toLowerCase().slice(0, 20)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      alternatives: deduped.slice(0, maxResults),
      category,
      reason: deduped.length > 0 ? "ok" : "none_better",
    };
  }

  return { fetchAlternatives, pickBestCategory };
})();
