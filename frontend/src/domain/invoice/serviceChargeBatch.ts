// The service-charges draft → batch split (outbound S5 / inbound S6 share the
// editor): new-and-kept rows insert, existing-and-kept rows update, existing-
// and-deleted rows delete. A NEW row deleted before saving never reaches the
// draft's deleted state — the editor removes it outright — but the split
// guards against it anyway (isNew && deleted sends nothing).
export type ServiceChargeDraft = {
  id: string;
  isNew: boolean;
  deleted: boolean;
  /** The chosen SERVICE item (rules § service lines: never free text). */
  itemId: string;
  name: string;
  totalBeforeTax: number;
  taxPercentage: number | null;
  note: string;
};

export type ServiceChargeWrite = {
  id: string;
  itemId: string;
  name: string;
  totalBeforeTax: number;
  taxPercentage: number | null;
  note: string | null;
};

export type ServiceChargeBatch = {
  inserts: ServiceChargeWrite[];
  updates: ServiceChargeWrite[];
  deletes: { id: string }[];
};

const write = (draft: ServiceChargeDraft): ServiceChargeWrite => ({
  id: draft.id,
  itemId: draft.itemId,
  name: draft.name,
  totalBeforeTax: draft.totalBeforeTax,
  taxPercentage: draft.taxPercentage,
  note: draft.note || null,
});

export const splitServiceChargeBatch = (
  drafts: readonly ServiceChargeDraft[]
): ServiceChargeBatch => ({
  inserts: drafts.filter(d => d.isNew && !d.deleted).map(write),
  updates: drafts.filter(d => !d.isNew && !d.deleted).map(write),
  deletes: drafts.filter(d => !d.isNew && d.deleted).map(d => ({ id: d.id })),
});

/** The derived after-tax total shown per row (amount × (1 + tax/100)). */
export const chargeTotalAfterTax = (charge: {
  totalBeforeTax: number;
  taxPercentage: number | null;
}): number => charge.totalBeforeTax * (1 + (charge.taxPercentage ?? 0) / 100);
