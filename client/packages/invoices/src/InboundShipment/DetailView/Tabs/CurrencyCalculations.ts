export interface CurrencyCalculationInput {
  /** Exchange rate: number of home (local) currency units per one foreign currency unit.
   *  e.g. if home is AUD and foreign is EUR, rate ≈ 1.33 (1 EUR = 1.33 AUD) */
  currencyRate: number;
  /** Charges in PO (foreign) currency (A) */
  chargesInForeignCurrency: number;
  /** Charges in local currency (B) */
  chargesInLocalCurrency: number;
  /** Total goods value in PO (foreign) currency */
  totalGoodsForeignCurrency: number;
}

export interface CurrencyCalculationResult {
  /** Charges (A) converted from foreign to local currency */
  chargesConvertedToLocal: number;
  /** Total goods converted from foreign to local currency */
  totalGoodsLocal: number;
  /** Total charges = A converted to local + B */
  totalCharges: number;
  /** Cost adjustment percentage = totalCharges / totalGoodsLocal * 100 */
  costAdjustmentPercent: number;
}

/**
 * Calculates currency conversion values for the inbound shipment currency tab.
 *
 * The exchange rate represents the number of home (local) currency units per
 * one foreign currency unit. For example, if the home currency is AUD and
 * the foreign currency is EUR, the rate would be ~1.33 (1 EUR = 1.33 AUD).
 *
 * To convert foreign to local: foreignAmount * rate
 * To convert local to foreign: localAmount / rate
 */
export const calculateCurrencyValues = (
  input: CurrencyCalculationInput
): CurrencyCalculationResult => {
  const {
    currencyRate,
    chargesInForeignCurrency,
    chargesInLocalCurrency,
    totalGoodsForeignCurrency,
  } = input;

  const safeRate = currencyRate !== 0 ? currencyRate : 1;

  // Convert foreign amounts to local by multiplying by rate
  const chargesConvertedToLocal = chargesInForeignCurrency * safeRate;
  const totalGoodsLocal = totalGoodsForeignCurrency * safeRate;

  // Total charges = A (converted to local) + B (already local)
  const totalCharges = chargesConvertedToLocal + chargesInLocalCurrency;

  // % Cost adjustment = totalCharges / totalGoodsLocal * 100
  const costAdjustmentPercent =
    totalGoodsLocal !== 0 ? (totalCharges / totalGoodsLocal) * 100 : 0;

  return {
    chargesConvertedToLocal,
    totalGoodsLocal,
    totalCharges,
    costAdjustmentPercent,
  };
};
