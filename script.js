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

  // Calculate a mock sustainability score (for demo)
  const mockScore = Math.floor(Math.random() * 40) + 50; // 50-90

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
          <p style="font-size: 14px; color: #666;">Sustainability Score (Demo)</p>
          <p style="font-size: 32px; font-weight: bold; color: #2196F3;">${mockScore}/100</p>
          <p style="font-size: 12px; color: #888;">
            ${mockScore >= 75 ? "🌟 Great choice!" : mockScore >= 60 ? "👍 Good option" : "⚠️ Consider alternatives"}
          </p>
        </div>
        
        <p style="font-size: 11px; color: #999; margin-top: 10px;">
          <em>This is a prototype. Full environmental analysis would include carbon footprint, packaging, certifications, etc.</em>
        </p>
      </div>
    `;

    addScanAgainButton();
  }
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
