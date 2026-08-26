// The new-stock modal's entry gating (spec/stock S3), extracted pure so the
// exact conditions that unlock Save are pinned in node without a DOM. The
// server remains the guard — these mirror its rules for pre-validation.
//
// Anchors: spec/stock/cases/OMS-REG-SMV-02.
//   .34 — a pack size below 1, or a negative pack count, is rejected
//   .37 — confirm is unavailable until item, pack size, and pack quantity are set
//   .36 — with active positive reasons configured, a reason is required

// Pack size must be at least 1 (spec/stock rules — introducing new stock).
export const packSizeValid = (packSize: number | null | undefined): boolean =>
  (packSize ?? 0) >= 1;

// A pack count must be present and not negative. Zero is a legitimate entry;
// absent is not, which is why this is not a truthiness check.
export const packsValid = (numberOfPacks: number | null | undefined): boolean =>
  numberOfPacks != null && numberOfPacks >= 0;

export const canConfirmNewStock = (entry: {
  hasItem: boolean;
  packSize: number | null | undefined;
  numberOfPacks: number | null | undefined;
  positiveReasonsRequired: boolean;
  hasReason: boolean;
}): boolean =>
  entry.hasItem &&
  packSizeValid(entry.packSize) &&
  packsValid(entry.numberOfPacks) &&
  (!entry.positiveReasonsRequired || entry.hasReason);
