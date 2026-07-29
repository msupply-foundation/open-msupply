// The item-set save's line inputs (OMS-REG-DIST-03.20/.21/.22): the full draft set, zeros
// included — the save replaces the item's lines (zero packs removes one).
// The set-save OVERWRITES receivedNumberOfPacks, reasonOptionId AND
// vvmStatusId on every updated line (contract § issuing lines wire traps) —
// the stored values are echoed back so a save never clears what the
// destination reported, and never strips the BATCH's VVM status (the update
// path writes lines[].vvmStatusId onto the stock line unconditionally, absent
// id included).
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
  >[]
): SaveOutboundItemLinesVariables['input']['lines'] =>
  lines.map(line => ({
    id: line.id,
    numberOfPacks: line.numberOfPacks,
    stockLineId: line.stockLineId,
    receivedNumberOfPacks: line.receivedNumberOfPacks,
    reasonOptionId: line.reasonOption?.id ?? null,
    vvmStatusId: line.vvmStatus?.id ?? null,
  }));
