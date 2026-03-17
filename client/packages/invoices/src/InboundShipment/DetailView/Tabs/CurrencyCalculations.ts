export interface CurrencyCalculationInput {
  /** Exchange rate: number of foreign currency units per one base (local) currency unit.
   *  e.g. if local is NZD and foreign is USD, rate ≈ 0.6 (1 NZD = 0.6 USD) */
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
 * The exchange rate represents the number of foreign currency units per one
 * base (local) currency unit. For example, if the base currency is NZD and
 * the foreign currency is USD, the rate would be ~0.6 (0.6 USD = 1 NZD).
 *
 * To convert foreign to local: foreignAmount / rate
 * To convert local to foreign: localAmount * rate
 *
 * Note: TabTables.tsx uses `localPrice / currency.rate` which assumes the
 * inverse convention — that may need correcting separately.
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

  // Convert foreign amounts to local by dividing by rate
  const chargesConvertedToLocal = chargesInForeignCurrency / safeRate;
  const totalGoodsLocal = totalGoodsForeignCurrency / safeRate;

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
