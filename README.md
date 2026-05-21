# 🌱 EcoScan

> **Scan. Learn. Choose Better.**  
> An MVP web app that helps consumers make environmentally conscious purchasing decisions — instantly.

[![Live Demo](https://img.shields.io/badge/🌍%20Live%20Demo-eco--scan--final--puce.vercel.app-4CAF50?style=for-the-badge)](https://eco-scan-final-puce.vercel.app/)
[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
![HTML](https://img.shields.io/badge/HTML-68.6%25-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-31.4%25-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel)

---

## 📖 About

Every purchase has an environmental cost you can't see. **EcoScan** makes that cost visible.

Scan a product barcode and receive instant feedback on its carbon footprint, supply chain sustainability, and packaging impact — powered by publicly available environmental databases and a bespoke sustainability scoring algorithm.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📷 **Barcode Scanner** | Scan any product barcode using your device camera |
| 📊 **Sustainability Score** | A custom eco-rating score built from environmental databases |
| 🌿 **Eco Alternatives** | Discover greener alternatives to scanned products |
| 🎯 **Personalised Goals** | Set and track your own sustainability targets over time |
| 🔁 **Scan History** | Review your previous scans and compare product impacts |
| 👥 **Community Feedback** | Community-driven accountability for brands |

---

## 🚀 How It Works

```
1. Open EcoScan on your phone or browser
2. Navigate to the Scan page
3. Point your camera at any product barcode
4. Receive an instant environmental impact report
5. Explore eco-friendly alternatives
```

---

## 🛠 Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Barcode Scanning:** Camera API / barcode detection
- **Scoring Engine:** Custom sustainability algorithm (`scoring.js`)
- **Data:** Publicly available environmental & supply chain databases
- **Deployment:** [Vercel](https://vercel.com)

---

## 📁 Project Structure

```
EcoScan_Final/
├── index.html          # Landing page
├── scan.html           # Barcode scanner interface
├── alternatives.html   # Eco alternatives page
├── history.html        # Scan history page
├── script.js           # Core app logic
├── scoring.js          # Sustainability scoring algorithm
├── alternatives.js     # Alternatives logic
└── history.js          # History management
```

---

## 🖥 Running Locally

```bash
# Clone the repository
git clone https://github.com/JHamzat/EcoScan_Final.git

# Navigate into the project
cd EcoScan_Final

# Open in your browser (no build step required)
open index.html
```

> ⚠️ Camera access requires serving over HTTPS or `localhost`. For best results, use a local server:
> ```bash
> npx serve .
> # or
> python3 -m http.server 8080
> ```

---

## 🌍 Mission

EcoScan analyses data from publicly available environmental databases, supply chain information, and product metadata. The mission is to raise awareness and promote responsible consumption through technology and data transparency.

*Every purchase has an environmental impact. EcoScan empowers you to understand it.*

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📬 Contact

Built by [@JHamzat](https://github.com/JHamzat) — feel free to reach out with feedback, ideas, or collaboration interest.

---

<p align="center">🌱 <em>Making sustainability simple, one scan at a time.</em></p>
