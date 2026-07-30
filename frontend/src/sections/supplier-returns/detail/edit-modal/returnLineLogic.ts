import type {
  GenerateSupplierReturnLinesResult,
  UpdateSupplierReturnLinesVariables,
} from '../supplierReturnDetail.generated';

// Pure draft logic for the return-items modal (spec/supplier-returns/rules.md
// § line rules + ui-surface.md S4). Component-free so the behaviour-citing
// tests (OMS-FUN-SRN-001 .2/.7/.9, OMS-REG-REPL-06 .29/.31/.32) exercise the
// semantics directly.

// The wire line input — the generated shape, never remapped (kdd/type-safety).
export type ReturnLineInput =
  UpdateSupplierReturnLinesVariables['input']['supplierReturnLines'][number];

type GeneratedConnector = Extract<
  GenerateSupplierReturnLinesResult['generateSupplierReturnLines'],
  { __typename: 'SupplierReturnLineConnector' }
>;
export type GeneratedLine = GeneratedConnector['nodes'][number];

// A draft row: the generated line plus client-only bookkeeping. `existing`
// marks a line already persisted on the return — the upsert semantics key off
// it (an existing line saved at zero is a delete the user must confirm; a new
// line at zero simply never persists — rules § line rules). A supplier-return
// line is ALWAYS an existing stock line, so there is no blank/add-batch draft
// (ui-surface S4 — "no Add-batch action").
export type DraftReturnLine = GeneratedLine & {
  existing: boolean;
};

export const seedDrafts = (
  generated: GeneratedLine[],
  existingIds: ReadonlySet<string>
): DraftReturnLine[] =>
  generated.map(line => ({ ...line, existing: existingIds.has(line.id) }));

// The quantity cap: returned ≤ quantity-available-for-return — a UI-ONLY cap
// (the server accepts more; contract § line rules wire trap). Quantity is never
// negative. OMS-FUN-SRN-001 .2.
export const clampQuantity = (
  value: number,
  available: number | null | undefined
): number => {
  const floored = Math.max(0, value);
  return available != null ? Math.min(floored, available) : floored;
};

// Step-1 gating (ui-surface S4; the zero-quantity notices — REPL-06 .29):
// - 'no-quantity' — nothing to return. Create/add mode blocks outright; an
//                   existing-line edit set to all-zero warns that the lines
//                   will be removed and proceeds only on confirmation.
// - 'ok'
// Pack size is fixed to the stock line and always valid, so there is no
// pack-size gate (contrast customer returns' invented batches).
export type Step1Verdict = 'ok' | 'no-quantity';

export const validateStep1 = (drafts: DraftReturnLine[]): Step1Verdict =>
  drafts.some(d => d.numberOfPacksToReturn > 0) ? 'ok' : 'no-quantity';

// Existing (persisted) lines whose quantity is now zero — saving deletes each
// of them server-side (rules § line rules). The UI warns before applying this,
// whether or not OTHER lines in the set still carry quantity: the destructive
// save must be confirmed even in the mixed case, where a zeroed existing line
// would otherwise never reach the reason step and be removed silently (REPL-06
// .32). New lines at zero are simply dropped, so they never count here.
export const existingLinesBeingRemoved = (
  drafts: DraftReturnLine[]
): DraftReturnLine[] =>
  drafts.filter(d => d.existing && d.numberOfPacksToReturn <= 0);

// Only lines with quantity appear on the reason step (ui-surface S4 step 2).
export const reasonStepLines = (drafts: DraftReturnLine[]): DraftReturnLine[] =>
  drafts.filter(d => d.numberOfPacksToReturn > 0);

// The whole batch set for one save (rules § line rules — upsert-by-quantity is
// the SERVER's semantics; we send everything):
// - quantity > 0            → sent (insert or update by id)
// - existing, quantity ≤ 0  → sent (the server deletes it)
// - new, quantity ≤ 0       → dropped here (it would be dropped server-side;
//                             omitting it keeps the payload honest)
export const toLineInputs = (drafts: DraftReturnLine[]): ReturnLineInput[] =>
  drafts
    .filter(d => d.existing || d.numberOfPacksToReturn > 0)
    .map(d => ({
      id: d.id,
      stockLineId: d.stockLineId,
      numberOfPacksToReturn: d.numberOfPacksToReturn,
      reasonId: d.reasonId,
      note: d.note,
    }));
