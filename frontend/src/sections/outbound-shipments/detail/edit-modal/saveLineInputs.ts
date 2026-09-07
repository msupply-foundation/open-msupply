// The item-set save's line inputs (OMS-REG-DIST-03.20/.21/.22): the full draft
// set, zeros included — the save replaces the item's lines (zero packs removes
// one). The set-save OVERWRITES receivedNumberOfPacks, reasonOptionId,
// vvmStatusId AND supplierComment on every updated line (contract § issuing
// lines / § supplier comment wire traps) — the stored values are echoed back so
// a save never clears what the destination reported, never strips the BATCH's
// VVM status (the update path writes lines[].vvmStatusId onto the stock line
// unconditionally, absent id included), and never drops the item's supplier
// comment.
import type {
  DraftStockOutLinesResult,
  SaveOutboundItemLinesVariables,
} from './outboundLineEdit.generated';

type DraftLine =
  DraftStockOutLinesResult['draftStockOutLines']['draftLines'][number];

export const toSaveLineInputs = (
  lines: readonly Pick<
    DraftLine,
    | 'id'
    | 'numberOfPacks'
    | 'stockLineId'
    | 'receivedNumberOfPacks'
    | 'reasonOption'
    | 'vvmStatus'
  >[],
  // The item's ONE supplier comment, repeated onto every line of the item
  // (OMS-REG-DIST-03.41) — an item's batches can never disagree about the
  // reason. Empty means "no comment": it is sent as null, which clears any
  // stored value, so an untouched comment reaches here as its own seeded text
  // rather than as ''.
  supplierComment = ''
): SaveOutboundItemLinesVariables['input']['lines'] =>
  lines.map(line => ({
    id: line.id,
    numberOfPacks: line.numberOfPacks,
    stockLineId: line.stockLineId,
    receivedNumberOfPacks: line.receivedNumberOfPacks,
    reasonOptionId: line.reasonOption?.id ?? null,
    vvmStatusId: line.vvmStatus?.id ?? null,
    supplierComment: supplierComment || null,
  }));
