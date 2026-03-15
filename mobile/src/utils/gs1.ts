/**
 * Parse a GS1 barcode string and extract the GTIN.
 *
 * GS1 barcodes encode data using Application Identifiers (AIs).
 * The most common for product identification:
 *   AI 01  — GTIN-14 (14 digits)
 *   AI 02  — GTIN of items in a logistic unit (14 digits)
 *
 * The scanner may return the full GS1 element string, e.g.:
 *   "0120000000001025"  →  AI=01, GTIN=20000000001025
 *   "011234567890123410ABC123"  →  AI=01, GTIN=12345678901234, plus AI=10 batch
 *
 * If the string does NOT start with a known AI prefix, it's returned as-is
 * (plain EAN-13, UPC-A, etc.).
 */
export function extractGtin(raw: string): string {
  const s = raw.trim();

  // AI 01 — GTIN-14 (always 14 digits after the AI)
  if (s.startsWith("01") && s.length >= 16) {
    return s.substring(2, 16);
  }

  // AI 02 — GTIN of contained items (14 digits)
  if (s.startsWith("02") && s.length >= 16) {
    return s.substring(2, 16);
  }

  // No recognised AI prefix — return the raw value.
  // This covers plain EAN-13, EAN-8, UPC-A, UPC-E, etc.
  return s;
}
