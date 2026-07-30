import { generateUUID } from '../../../../uuid';
import type {
  GenerateCustomerReturnLinesResult,
  UpdateCustomerReturnLinesVariables,
} from '../customerReturnDetail.generated';

// Pure draft logic for the return-items modal (spec/customer-returns/rules.md
// § line rules + ui-surface.md S4). Component-free so the AC-citing tests
// (acceptance.md AC-E1–E3, AC-E5) exercise the semantics directly.

// The wire line input — the generated shape, never remapped (kdd/type-safety).
export type ReturnLineInput =
  UpdateCustomerReturnLinesVariables['input']['customerReturnLines'][number];

type GeneratedConnector = Extract<
  GenerateCustomerReturnLinesResult['generateCustomerReturnLines'],
  { __typename: 'GeneratedCustomerReturnLineConnector' }
>;
export type GeneratedLine = GeneratedConnector['nodes'][number];

// A draft row: the generated line plus client-only bookkeeping. `existing`
// marks a line already persisted on the return — the upsert semantics key off
// it (an existing line saved at zero is a delete the user must confirm; a new
// line at zero simply never persists — rules § line rules).
export type DraftReturnLine = GeneratedLine & {
  existing: boolean;
};

export const seedDrafts = (
  generated: GeneratedLine[],
  existingIds: ReadonlySet<string>
): DraftReturnLine[] =>
  generated.map(line => ({ ...line, existing: existingIds.has(line.id) }));

// The quantity cap: returned ≤ issued where issued is known — a UI-ONLY cap
// (the server accepts more; contract § line rules wire trap). Quantity is
// never negative. AC-E5.
export const clampQuantity = (
  value: number,
  issued: number | null | undefined
): number => {
  const floored = Math.max(0, value);
  return issued != null ? Math.min(floored, issued) : floored;
};

// Step-1 gating (ui-surface S4; the zero-quantity notices — AC-E2, AC-C6's
// UI guard):
// - 'no-quantity'    — nothing to return. Create mode blocks outright; edit
//                      mode warns that existing lines will be removed and
//                      proceeds only on confirmation.
// - 'invalid-pack-size' — a returned line's pack size is below one (rules
//                      § line rules; also server-enforced).
// - 'ok'
export type Step1Verdict = 'ok' | 'no-quantity' | 'invalid-pack-size';

export const validateStep1 = (drafts: DraftReturnLine[]): Step1Verdict => {
  const returned = drafts.filter(d => d.numberOfPacksReturned > 0);
  if (returned.length === 0) return 'no-quantity';
  if (returned.some(d => d.packSize < 1)) return 'invalid-pack-size';
  return 'ok';
};

// Existing (persisted) lines whose quantity is now zero — saving deletes each
// of them server-side (rules § line rules). The UI warns before applying this,
// whether or not OTHER lines in the set still carry quantity: the destructive
// save must be confirmed even in the mixed case, where a zeroed existing line
// would otherwise never reach the reason step and be removed silently (AC-E2).
// New lines at zero are simply dropped, so they never count here.
export const existingLinesBeingRemoved = (
  drafts: DraftReturnLine[]
): DraftReturnLine[] =>
  drafts.filter(d => d.existing && d.numberOfPacksReturned <= 0);

// Only lines with quantity appear on the reason step (ui-surface S4 step 2).
export const reasonStepLines = (drafts: DraftReturnLine[]): DraftReturnLine[] =>
  drafts.filter(d => d.numberOfPacksReturned > 0);

// The whole batch set for one save (rules § line rules — upsert-by-quantity is
// the SERVER's semantics; we send everything):
// - quantity > 0            → sent (insert or update by id)
// - existing, quantity ≤ 0  → sent (the server deletes it)
// - new, quantity ≤ 0       → dropped here (it would be dropped server-side;
//                             omitting it keeps the payload honest)
export const toLineInputs = (drafts: DraftReturnLine[]): ReturnLineInput[] =>
  drafts
    .filter(d => d.existing || d.numberOfPacksReturned > 0)
    .map(d => ({
      id: d.id,
      itemId: d.item.id,
      numberOfPacksReturned: d.numberOfPacksReturned,
      packSize: d.packSize,
      batch: d.batch,
      expiryDate: d.expiryDate,
      reasonId: d.reasonId,
      note: d.note,
      itemVariantId: d.itemVariantId,
      volumePerPack: d.volumePerPack,
    }));

// A blank draft row for "Add batch" (per-item mode) — quantity zero (won't
// persist unless filled in), pack size 1 (the minimum valid).
export const blankDraft = (
  item: GeneratedLine['item'],
  /**
   * The item's display name — carried separately because the generated line's
   * `item` fragment holds only id/code/unitName, and the grid's Name column
   * reads `itemName` (blank would leave a just-added batch row nameless).
   */
  itemName = ''
): DraftReturnLine => ({
  id: generateUUID(),
  existing: false,
  batch: null,
  expiryDate: null,
  packSize: 1,
  numberOfPacksReturned: 0,
  numberOfPacksIssued: null,
  note: null,
  reasonId: null,
  itemVariantId: null,
  volumePerPack: 0,
  itemCode: item.code,
  itemName,
  item,
});
