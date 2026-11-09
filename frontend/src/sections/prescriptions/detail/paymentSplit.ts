/*
 * The payment window's money split (spec/prescriptions/rules.md § insurance and
 * payments; OMS-REG-DIS-04.28) — pure, so the arithmetic is testable without a
 * DOM.
 *
 * Two figures come out of the chosen policy: what insurance covers, and what
 * the patient owes. The wire only wants the first (`insuranceDiscountAmount`),
 * and it is sent as computed. What the PATIENT owes is a different requirement:
 * it is money someone hands over, so it is rounded to the currency's minor
 * units before the subtraction. An unrounded remainder (a 33⅓% discount on
 * 100.00 leaves 66.66666…) can never be settled — a payer can only tender 2dp,
 * so a payment form's "amount outstanding" would never reach zero. The
 * reference client rounds at the same point for the same reason.
 */

import { roundTo } from '../../../intl';

export interface PaymentSplit {
  /** The whole charge, after tax. */
  total: number;
  /** What insurance covers. */
  paidByInsurance: number;
  /** What the patient owes: `total` − `paidByInsurance`. */
  paidByPatient: number;
}

/**
 * Split `total` by a policy's discount percentage. No policy chosen (or 0%)
 * leaves the whole total with the patient.
 *
 * All three figures are rounded, so `paidByInsurance + paidByPatient === total`
 * holds exactly — the split's own documented arithmetic. Rounding `total` too
 * matters because the invoice's raw figure is itself a float sum (a 1.80 total
 * arrives as 1.7999999999999998): leaving it alone would give a consumer two
 * different answers for what the patient owes depending on which fields it
 * subtracted.
 */
export const paymentSplit = (
  total: number,
  discountPercentage: number | undefined,
  decimals: number
): PaymentSplit => {
  const rounded = roundTo(total, decimals);
  const paidByInsurance = roundTo(
    (rounded * (discountPercentage ?? 0)) / 100,
    decimals
  );
  return {
    total: rounded,
    paidByInsurance,
    paidByPatient: roundTo(rounded - paidByInsurance, decimals),
  };
};
