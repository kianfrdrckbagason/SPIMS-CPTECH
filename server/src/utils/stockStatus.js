/**
 * stockStatus.js — single source of truth for movement-classification thresholds.
 *
 * Rules (per business spec):
 *
 *   Classification | Normal (≥) | Low Stock      | Out of Stock
 *   ─────────────────────────────────────────────────────────────
 *   fast  (Fast Moving)   |  10  |  qty 1–9   (≤ 9)  |  qty = 0
 *   medium (Med Moving)   |   5  |  qty 1–4   (≤ 4)  |  qty = 0
 *   low   (Slow Moving)   |   2  |  qty 1     (≤ 1)  |  qty = 0
 *
 * "Low Stock"    : quantity > 0  AND  quantity <= thresholds.low
 * "Out of Stock" : quantity === 0  (all classifications)
 * "Normal"       : quantity >= thresholds.normal
 */

export const MOVEMENT_THRESHOLDS = {
  fast:   { normal: 10, low: 9,  out: 0 },
  medium: { normal: 5,  low: 4,  out: 0 },
  low:    { normal: 2,  low: 1,  out: 0 },
};

// Fallback when movementClassification is absent / null / unrecognised
const DEFAULT_CLASS = "medium";

/**
 * Resolve the threshold object for a given classification string.
 * Falls back to medium for null / undefined / unrecognised values.
 */
export const getThresholds = (movementClassification) =>
  MOVEMENT_THRESHOLDS[movementClassification] ||
  MOVEMENT_THRESHOLDS[DEFAULT_CLASS];

/**
 * Return the stock colour-code for a quantity + classification combination.
 *
 *   "red"    → Out of Stock  (qty === 0)
 *   "orange" → Low Stock     (0 < qty <= thresholds.low)
 *   "green"  → Normal        (qty >= thresholds.normal)
 *
 * @param {number} quantity
 * @param {string} [movementClassification]
 * @returns {"red"|"orange"|"green"}
 */
export const getStockStatus = (quantity, movementClassification) => {
  const t = getThresholds(movementClassification);
  if (quantity <= t.out)  return "red";
  if (quantity <= t.low)  return "orange";
  return "green";
};

/**
 * Return a human-readable stock status label.
 *
 * @param {number} quantity
 * @param {string} [movementClassification]
 * @returns {"Out of Stock"|"Low Stock"|"Normal"}
 */
export const getStockStatusLabel = (quantity, movementClassification) => {
  const status = getStockStatus(quantity, movementClassification);
  if (status === "red")    return "Out of Stock";
  if (status === "orange") return "Low Stock";
  return "Normal";
};

/**
 * Build the MongoDB $or condition that identifies "Low Stock" documents.
 * Used in countDocuments() and find() calls.
 *
 * Low Stock = quantity > 0 AND quantity <= thresholds.low for that classification.
 *
 * @param {string} [statusField="status"]   field name for the lifecycle status
 * @returns {object}  a MongoDB filter object
 */
export const buildLowStockFilter = (statusField = "status") => ({
  [statusField]: "active",
  $or: [
    // fast:   qty 1–9
    { movementClassification: "fast",   quantity: { $gt: 0, $lte: MOVEMENT_THRESHOLDS.fast.low   } },
    // medium: qty 1–4
    { movementClassification: "medium", quantity: { $gt: 0, $lte: MOVEMENT_THRESHOLDS.medium.low } },
    // low:    qty 1
    { movementClassification: "low",    quantity: { $gt: 0, $lte: MOVEMENT_THRESHOLDS.low.low    } },
    // null / missing → treated as medium: qty 1–4
    { movementClassification: { $exists: false }, quantity: { $gt: 0, $lte: MOVEMENT_THRESHOLDS.medium.low } },
    { movementClassification: null,               quantity: { $gt: 0, $lte: MOVEMENT_THRESHOLDS.medium.low } },
  ],
});

/**
 * Build the MongoDB filter that identifies "Out of Stock" documents.
 */
export const buildOutOfStockFilter = (statusField = "status") => ({
  [statusField]: "active",
  quantity: 0,
});
