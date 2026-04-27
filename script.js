// Shared Product Module - Product data fetching and display

// Get result container (works in both index.html and scan.html contexts)
const getResultDiv = () => {
  return document.getElementById("result") || ScannerModule?.getResultDiv?.();
};

const resultDiv = getResultDiv();

async function fetchProductData(barcode) {
  try {
    // Call Open Food Facts API
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    if (data.status === 1) {
      // Product found!
      displayProductInfo(data.product, barcode);
    } else {
      // Product not in database
      displayNotFound(barcode);
    }
  } catch (error) {
    console.error("Error fetching product:", error);
    const resultDiv = getResultDiv();
    if (resultDiv) {
      resultDiv.innerHTML = `
        <div class="error">
          <p><strong>Error loading product data</strong></p>
          <p>Barcode: ${barcode}</p>
          <p>${error.message}</p>
        </div>
      `;
      addScanAgainButton();
    }
  }
}

function displayProductInfo(product, barcode) {
  const productName = product.product_name || "Unknown Product";
  const brands = product.brands || "Unknown Brand";
  const imageUrl = product.image_url || "";
  const categories = product.categories || "Not specified";

  // Calculate sustainability score using the new scoring system
  const scoreData = ScoringSystem.calculateSustainabilityScore(product);

  // Save to history
  if (typeof HistoryModule !== "undefined") {
    HistoryModule.saveScan(product, barcode, scoreData);
  }
  const sustainabilityScore = scoreData.sustainability_score;
  const grade = scoreData.grade;
  const confidenceScore = scoreData.confidence_score;
  const confidenceGrade = scoreData.confidence_grade;
  const interpretation = ScoringSystem.getScoreInterpretation(sustainabilityScore);

  // Create tooltip content for confidence details
  const missingData = scoreData.flags.missing_data || [];
  const factorConfidence = scoreData.factor_confidence || {};
  
  let tooltipParts = [];
  
  if (missingData.length > 0) {
    tooltipParts.push(`Missing data: ${missingData.join(', ')}`);
  }
  
  // Check for partial confidence (not 1.0)
  const partialFactors = [];
  Object.entries(factorConfidence).forEach(([factor, confidence]) => {
    if (confidence > 0 && confidence < 1.0) {
      partialFactors.push(factor);
    }
  });
  
  if (partialFactors.length > 0) {
    tooltipParts.push(`Partial data: ${partialFactors.join(', ')}`);
  }
  
  const tooltipText = tooltipParts.length > 0 
    ? tooltipParts.join('. ') 
    : 'High data quality - all factors well-supported';

  const resultDiv = getResultDiv();
  if (resultDiv) {
    resultDiv.innerHTML = `
      <div class="success">
        <h3>📦 Product Found</h3>
        ${imageUrl ? `<img src="${imageUrl}" alt="${productName}" style="max-width: 200px; margin: 15px auto; display: block; border-radius: 8px;">` : ""}
        <p style="font-size: 18px; font-weight: bold; margin: 10px 0;">${productName}</p>
        <p style="color: #666;">${brands}</p>
        <p style="font-size: 12px; color: #888; margin-top: 5px;">Barcode: ${barcode}</p>
        
        <div style="margin: 20px 0; padding: 15px; background: #f0f7ff; border-radius: 8px;">
          <p style="font-size: 14px; color: #666;">Sustainability Score</p>
          <p style="font-size: 32px; font-weight: bold; color: ${interpretation.color};">${sustainabilityScore}/100</p>
          <p style="font-size: 18px; font-weight: bold; color: ${interpretation.color};">Grade: ${grade}</p>
          <p style="font-size: 12px; color: ${interpretation.color};">
            ${interpretation.text}
            <span style="font-size: 10px; color: #888; margin-left: 8px;" title="${tooltipText}">· data confidence: ${confidenceGrade}</span>
          </p>


          ${
            scoreData.flags.missing_data.length > 0
              ? `
            <div style="margin-top: 10px; font-size: 11px; color: #ff6b6b;">
              <p><strong>Missing Data:</strong> ${scoreData.flags.missing_data.join(", ")}</p>
            </div>
          `
              : ""
          }

          ${
            Object.values(scoreData.flags).some((flag) => flag === true)
              ? `
            <div style="margin-top: 10px; font-size: 11px; color: #ff9800;">
              <p><strong>Concerns:</strong> 
                ${scoreData.flags.palm_oil ? "Palm oil, " : ""}
                ${scoreData.flags.ultra_processed ? "Ultra-processed, " : ""}
                ${scoreData.flags.plastic_packaging ? "Plastic packaging, " : ""}
                ${scoreData.flags.imported ? "Imported, " : ""}
                ${scoreData.flags.high_additives ? "High additives" : ""}
              </p>
            </div>
          `
              : ""
          }
        </div>
        
        <div style="margin: 15px 0; padding: 10px; background: #f9f9f9; border-radius: 5px; font-size: 11px; color: #666;">
          <p style="font-weight: bold; margin-bottom: 5px;">Scoring Logic:</p>
          <p><strong>Formula:</strong> (Origin × 0.25) + (Ingredients × 0.25) + (Processing × 0.20) + (Packaging × 0.20) + (Nutrition × 0.10)</p>
          <p><strong>Factors:</strong> Origin (local vs imported), Ingredients (palm oil, additives), Processing (NOVA group), Packaging (materials), Nutrition (Nutri-Score)</p>
          <p><strong>Grades:</strong> A (80-100), B (65-79), C (50-64), D (35-49), E (0-34)</p>
        </div>
      </div>
    `;

    addScanAgainButton();
    addViewHistoryButton();
    // Only show alternatives button if product isn't already grade A
    if (grade !== "A") {
      addAlternativesButton(product, scoreData);
    }
    addShortlistButton(product, barcode, scoreData);
  }
}

function addShortlistButton(product, barcode, scoreData) {
  const resultDiv = getResultDiv();
  if (!resultDiv || typeof ShortlistModule === "undefined") return;

  const alreadySaved = ShortlistModule.isShortlisted(barcode);
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.id = "shortlist-btn";

  function setAdded() {
    btn.textContent = "✅ Saved to Shortlist";
    btn.style.cssText = "display:block;margin:8px auto 0;width:100%;background:linear-gradient(135deg,#546e7a,#37474f);box-shadow:0 4px 15px rgba(84,110,122,0.3);cursor:default;";
    btn.disabled = true;
  }

  function setReady() {
    btn.textContent = "⭐ Add to Shortlist";
    btn.style.cssText = "display:block;margin:8px auto 0;width:100%;background:linear-gradient(135deg,#f57c00,#e65100);box-shadow:0 4px 15px rgba(245,124,0,0.35);cursor:pointer;";
    btn.disabled = false;
  }

  if (alreadySaved) {
    setAdded();
  } else {
    setReady();
    btn.onclick = () => {
      const result = ShortlistModule.addItem(product, barcode, scoreData);
      if (result.added) {
        setAdded();
      } else if (result.duplicate) {
        setAdded(); // already there
      } else if (result.full) {
        btn.textContent = "⚠️ Shortlist full (50 items)";
        btn.disabled = true;
      }
    };
  }

  resultDiv.appendChild(btn);
}

function addAlternativesButton(product, scoreData) {
  const resultDiv = getResultDiv();
  if (!resultDiv) return;
  // Store product data for alternatives page via sessionStorage
  try {
    sessionStorage.setItem("ecoscan_current_product", JSON.stringify(product));
    sessionStorage.setItem("ecoscan_current_score", JSON.stringify(scoreData));
  } catch(e) { console.warn("Could not store product data", e); }

  const btn = document.createElement("a");
  btn.href = "alternatives.html";
  btn.className = "btn";
  btn.style.cssText = "display:block;margin:8px auto 0;background:linear-gradient(135deg,#388e3c,#1b5e20);box-shadow:0 4px 15px rgba(56,142,60,0.35);text-align:center;text-decoration:none;";
  btn.textContent = "🌿 Find Greener Alternatives";
  resultDiv.appendChild(btn);
}

function addViewHistoryButton() {
  const resultDiv = getResultDiv();
  if (!resultDiv) return;
  const btn = document.createElement("a");
  btn.href = "history.html";
  btn.className = "btn";
  btn.style.cssText = "display:block;margin:8px auto 0;background:linear-gradient(135deg,#1565c0,#0d47a1);box-shadow:0 4px 15px rgba(21,101,192,0.3);text-align:center;text-decoration:none;";
  btn.textContent = "📊 View My Weekly Impact";
  resultDiv.appendChild(btn);
}

function displayNotFound(barcode) {
  const resultDiv = getResultDiv();
  if (resultDiv) {
    resultDiv.innerHTML = `
      <div class="error">
        <h3>❌ Product Not Found</h3>
        <p>Barcode <strong>${barcode}</strong> is not in our database.</p>
        <p style="font-size: 12px; margin-top: 10px;">
          This could be a local product or not yet registered in Open Food Facts.
        </p>
      </div>
    `;

    addScanAgainButton();
  }
}

function addScanAgainButton() {
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.textContent = "🔄 Scan Another Product";
  btn.onclick = () => {
    // Try to use scanner module if available, otherwise reset UI
    if (typeof ScannerModule !== "undefined" && ScannerModule.resetScanner) {
      ScannerModule.resetScanner();
    } else {
      // Fallback for other pages
      const resultDiv = getResultDiv();
      const startBtn = document.getElementById("startBtn");
      if (startBtn) startBtn.style.display = "block";
      if (resultDiv) resultDiv.innerHTML = "";
    }
  };
  const resultDiv = getResultDiv();
  if (resultDiv) resultDiv.appendChild(btn);
}
