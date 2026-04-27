// history.js - Scan History Module for EcoScan
// Saves every scan to localStorage and provides weekly summary data

const HistoryModule = (() => {
  const STORAGE_KEY = "ecoscan_history";
  const MAX_HISTORY = 200; // cap storage

  // ── Core storage helpers ──────────────────────────────────────────────────

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn("EcoScan: could not save history", e);
    }
  }

  // ── Public: save a scan ───────────────────────────────────────────────────

  function saveScan(product, barcode, scoreData) {
    const history = loadHistory();

    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      barcode: barcode,
      name: product.product_name || "Unknown Product",
      brand: product.brands || "Unknown Brand",
      image: product.image_small_url || product.image_url || null,
      categories: product.categories_tags
        ? product.categories_tags.slice(0, 3)
        : [],
      score: scoreData.sustainability_score,
      grade: scoreData.grade,
      confidence: scoreData.confidence_score,
      flags: scoreData.flags,
    };

    // Avoid duplicate consecutive scans of the same barcode
    if (history.length > 0 && history[0].barcode === barcode) {
      const lastScan = new Date(history[0].timestamp);
      const now = new Date();
      const secondsApart = (now - lastScan) / 1000;
      if (secondsApart < 30) return entry; // skip duplicate within 30s
    }

    history.unshift(entry); // newest first

    // Trim to max
    if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY);

    saveHistory(history);
    return entry;
  }

  // ── Public: get full history ──────────────────────────────────────────────

  function getHistory() {
    return loadHistory();
  }

  // ── Public: clear history ─────────────────────────────────────────────────

  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ── Public: weekly summary ────────────────────────────────────────────────

  function getWeeklySummary() {
    const history = loadHistory();

    // Filter to scans from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekly = history.filter(
      (entry) => new Date(entry.timestamp) >= sevenDaysAgo
    );

    if (weekly.length === 0) {
      return { hasData: false };
    }

    // Average score
    const avgScore =
      Math.round(
        (weekly.reduce((sum, e) => sum + e.score, 0) / weekly.length) * 10
      ) / 10;

    // Grade distribution
    const gradeCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    weekly.forEach((e) => {
      if (gradeCounts[e.grade] !== undefined) gradeCounts[e.grade]++;
    });

    // Flag counts
    const flagCounts = {
      palm_oil: 0,
      ultra_processed: 0,
      plastic_packaging: 0,
      imported: 0,
      high_additives: 0,
    };
    weekly.forEach((e) => {
      if (!e.flags) return;
      Object.keys(flagCounts).forEach((flag) => {
        if (e.flags[flag]) flagCounts[flag]++;
      });
    });

    // Best and worst scans
    const sorted = [...weekly].sort((a, b) => b.score - a.score);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    // Scans per day (for sparkline)
    const dailyCounts = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyCounts[key] = 0;
    }
    weekly.forEach((e) => {
      const key = e.timestamp.slice(0, 10);
      if (dailyCounts[key] !== undefined) dailyCounts[key]++;
    });

    // Trend: compare this week avg to previous week
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const prevWeek = history.filter((e) => {
      const t = new Date(e.timestamp);
      return t >= fourteenDaysAgo && t < sevenDaysAgo;
    });
    let trend = null;
    if (prevWeek.length > 0) {
      const prevAvg =
        prevWeek.reduce((sum, e) => sum + e.score, 0) / prevWeek.length;
      trend = Math.round((avgScore - prevAvg) * 10) / 10;
    }

    return {
      hasData: true,
      totalScans: weekly.length,
      avgScore,
      gradeCounts,
      flagCounts,
      best,
      worst,
      dailyCounts,
      trend,
      recentScans: weekly.slice(0, 5),
    };
  }

  // ── Public: delete a single entry ────────────────────────────────────────

  function deleteEntry(id) {
    const history = loadHistory().filter((e) => e.id !== id);
    saveHistory(history);
  }

  return {
    saveScan,
    getHistory,
    getWeeklySummary,
    clearHistory,
    deleteEntry,
  };
})();

// ═══════════════════════════════════════════════════════════════════════════
// ShortlistModule — persists a curated list of favourite/saved products
// ═══════════════════════════════════════════════════════════════════════════

const ShortlistModule = (() => {
  const KEY = "ecoscan_shortlist";
  const MAX = 50;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  }

  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); }
    catch (e) { console.warn("ShortlistModule: save failed", e); }
  }

  // Add a product — returns {added: bool, duplicate: bool}
  function addItem(product, barcode, scoreData) {
    const list = load();
    if (list.some(e => e.barcode === barcode)) {
      return { added: false, duplicate: true };
    }
    if (list.length >= MAX) {
      return { added: false, full: true };
    }
    list.unshift({
      id: Date.now(),
      addedAt: new Date().toISOString(),
      barcode,
      name: product.product_name || "Unknown Product",
      brand: product.brands || "Unknown Brand",
      image: product.image_small_url || product.image_url || null,
      score: scoreData.sustainability_score,
      grade: scoreData.grade,
      flags: scoreData.flags,
    });
    save(list);
    return { added: true };
  }

  function removeItem(id) {
    save(load().filter(e => e.id !== id));
  }

  function getList() { return load(); }

  function isShortlisted(barcode) {
    return load().some(e => e.barcode === barcode);
  }

  function clearList() { localStorage.removeItem(KEY); }

  function getCount() { return load().length; }

  // Summary stats for the shortlist
  function getSummary() {
    const list = load();
    if (list.length === 0) return { hasData: false };
    const avg = Math.round((list.reduce((s, e) => s + e.score, 0) / list.length) * 10) / 10;
    const gradeCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    list.forEach(e => { if (gradeCounts[e.grade] !== undefined) gradeCounts[e.grade]++; });
    return { hasData: true, total: list.length, avgScore: avg, gradeCounts };
  }

  return { addItem, removeItem, getList, isShortlisted, clearList, getCount, getSummary };
})();
