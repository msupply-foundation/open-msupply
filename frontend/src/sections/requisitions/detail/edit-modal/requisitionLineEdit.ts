import { graphqlFetch } from '../../../../api/graphql';
import { getPlural, t, tPlural } from '../../../../intl';
import {
  parseVaccineCourses,
  type VaccineCourse,
} from '../../../../domain/forecast';
import {
  RequisitionItemStats,
  InsertRequisitionLine,
  UpdateRequisitionLine,
  ResponseLineStats,
  type ResponseLineStatsResult,
} from './requisitionLineEdit.generated';
import type { RequisitionDetailLineFragment } from '../requisitionDetail.generated';

// Line-editor domain logic (spec/requisitions S4): the units/packs
// re-expression, the add-mode item preview, and the two save paths. Unlike the
// internal-order editor there is NO dose entry mode — the representation
// select offers only the unit name and pack (spec S4 § supply entry); doses
// appear only as the equivalent caption under the doses preference.

// The quantity representation: stored values are always UNITS; the mode only
// re-expresses the display (a pack entry stores units × pack size).
export type EntryMode = 'units' | 'packs';

// The editor's working line — the same shape whether it comes from an existing
// line (edit mode: the stored figures) or an add-mode item preview. All stock
// quantities in UNITS; the entry mode re-expresses them at display time.
export type EditorLine = {
  /** Existing line id (edit) or the client-generated id that will create it. */
  lineId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitName: string | null;
  defaultPackSize: number;
  doses: number;
  isVaccine: boolean;
  // Read-only figures (units).
  ourStockOnHand: number;
  suggestedQuantity: number;
  approvedQuantity: number;
  remainingQuantityToSupply: number;
  alreadyIssued: number;
  forecastTotalUnits: number | null;
  /** The forecast's per-course breakdown (AC-LE13); empty on a forecast-less
   *  line. */
  vaccineCourses: VaccineCourse[];
  /** The customer's volume snapshot on a storage-restricted transferred line
   *  (rules › volume guidance); null on a manual line. */
  availableVolumeAtLocationType: RequisitionDetailLineFragment['availableVolumeAtLocationType'];
  // The editable draft's seed values.
  supplyQuantity: number;
  requestedQuantity: number;
  /** The customer's available stock (label.customer-soh; wire stockOnHand). */
  availableStockOnHand: number;
  averageMonthlyConsumption: number;
  initialStockOnHandUnits: number;
  incomingUnits: number;
  outgoingUnits: number;
  lossInUnits: number;
  additionInUnits: number;
  expiringUnits: number;
  daysOutOfStock: number;
  comment: string;
  reasonId: string | null;
  /** True in add mode — no line exists on the wire until the first save. */
  isNew: boolean;
};

// --- Representation re-expression (spec S4 § layout) -------------------------

// A stored unit value → the display value in the active mode (÷ pack size in
// packs mode).
export const unitsToMode = (
  units: number,
  mode: EntryMode,
  packSize: number
): number =>
  mode === 'packs' && packSize > 0 ? units / packSize : units;

// A display value in the active mode → the stored units (× pack size).
export const modeToUnits = (
  value: number,
  mode: EntryMode,
  packSize: number
): number => (mode === 'packs' ? value * packSize : value);

// A read-only figure re-expressed in the active mode: rounded UP to a whole
// number (spec S4 § layout — the same rounding as the stats-tab charts, so a
// figure never disagrees with its bar). Time quantities never pass through.
export const figureInMode = (
  units: number,
  mode: EntryMode,
  packSize: number
): number => Math.ceil(unitsToMode(units, mode, packSize));

// The active mode's measure word — the item's unit name (falling back to
// "unit") or "pack", inflected for the count it suffixes (the same shape as
// the internal-order editor's modeWord). An item's own unit name inflects via
// getPlural (reference-app parity — English only; other languages pass
// through unchanged).
export const modeWord = (
  mode: EntryMode,
  unitName: string | null,
  count = 2
): string => {
  if (mode === 'packs') return tPlural('label.packs-plural', count);
  return unitName
    ? getPlural(unitName, count)
    : tPlural('label.units-plural', count);
};

// --- Add-mode item preview ----------------------------------------------------

// A picked item's preview line (D75 — nothing persists until the first Save).
// The customer-demand figures of a manually added line are genuinely zero (the
// customer never asked), so only the item facts and our stock are read.
export const buildAddPreview = async (
  storeId: string,
  itemId: string,
  lineId: string
): Promise<EditorLine | undefined> => {
  const result = await graphqlFetch(RequisitionItemStats, { storeId, itemId });
  if (result.kind !== 'success') return undefined;
  const node = result.data.items.nodes[0];
  if (!node) return undefined;
  return {
    lineId,
    itemId: node.id,
    itemCode: node.code,
    itemName: node.name,
    unitName: node.unitName,
    defaultPackSize: node.defaultPackSize,
    doses: node.doses,
    isVaccine: node.isVaccine,
    ourStockOnHand: node.stats.availableStockOnHand,
    suggestedQuantity: 0,
    approvedQuantity: 0,
    remainingQuantityToSupply: 0,
    alreadyIssued: 0,
    forecastTotalUnits: null,
    vaccineCourses: [],
    availableVolumeAtLocationType: null,
    supplyQuantity: 0,
    requestedQuantity: 0,
    availableStockOnHand: 0,
    averageMonthlyConsumption: 0,
    initialStockOnHandUnits: 0,
    incomingUnits: 0,
    outgoingUnits: 0,
    lossInUnits: 0,
    additionInUnits: 0,
    expiringUnits: 0,
    daysOutOfStock: 0,
    comment: '',
    reasonId: null,
    isNew: true,
  };
};

// An existing line → the editor's working shape (edit mode).
export const editorLineFromLine = (
  line: RequisitionDetailLineFragment
): EditorLine => ({
  lineId: line.id,
  itemId: line.itemId,
  itemCode: line.item.code,
  itemName: line.itemName,
  unitName: line.item.unitName,
  defaultPackSize: line.item.defaultPackSize,
  doses: line.item.doses,
  isVaccine: line.item.isVaccine,
  ourStockOnHand: line.itemStats.stockOnHand,
  suggestedQuantity: line.suggestedQuantity,
  approvedQuantity: line.approvedQuantity,
  remainingQuantityToSupply: line.remainingQuantityToSupply,
  alreadyIssued: line.alreadyIssued,
  forecastTotalUnits: line.forecastTotalUnits,
  vaccineCourses: parseVaccineCourses(line.vaccineCourses),
  availableVolumeAtLocationType: line.availableVolumeAtLocationType,
  supplyQuantity: line.supplyQuantity,
  requestedQuantity: line.requestedQuantity,
  availableStockOnHand: line.availableStockOnHand,
  averageMonthlyConsumption: line.averageMonthlyConsumption,
  initialStockOnHandUnits: line.initialStockOnHandUnits,
  incomingUnits: line.incomingUnits,
  outgoingUnits: line.outgoingUnits,
  lossInUnits: line.lossInUnits,
  additionInUnits: line.additionInUnits,
  expiringUnits: line.expiringUnits,
  daysOutOfStock: line.daysOutOfStock,
  comment: line.comment ?? '',
  reasonId: line.optionId,
  isNew: false,
});

// --- Save ---------------------------------------------------------------------

export type SaveLineResult =
  | { kind: 'saved' }
  | { kind: 'error'; message: string; reasonRejected?: boolean }
  | { kind: 'failed' };

// The whole draft, sent on EVERY save (contract › line editing: an omitted —
// or null — optionId clears the stored reason, so the draft always carries
// it; the other fields resend their current values for uniformity).
export type LineDraft = {
  supplyQuantity: number;
  requestedQuantity: number;
  stockOnHand: number;
  initialStockOnHand: number;
  averageMonthlyConsumption: number;
  incomingUnits: number;
  outgoingUnits: number;
  lossInUnits: number;
  additionInUnits: number;
  expiringUnits: number;
  daysOutOfStock: number;
  comment: string;
  optionId: string | null;
};

// Map the update union's typed errors to copy (contract › line editing). Only
// the reasons refusal and cannot-edit are reachable from the editor; the rest
// fall back to their description.
const mapUpdateError = (
  typename: string,
  description: string
): SaveLineResult => {
  switch (typename) {
    case 'RecordNotFound':
      return { kind: 'error', message: t('messages.record-not-found') };
    case 'CannotEditRequisition':
      return { kind: 'error', message: t('error.cannot-edit-requisition') };
    case 'RequisitionReasonNotProvided':
      // The variance-reason guard (AC-LE8) — the editor flags the Reason field.
      return {
        kind: 'error',
        message: t('error.provide-reason-requisition'),
        reasonRejected: true,
      };
    default:
      return { kind: 'error', message: description };
  }
};

const updateLine = async (
  storeId: string,
  lineId: string,
  draft: LineDraft
): Promise<SaveLineResult> => {
  const result = await graphqlFetch(UpdateRequisitionLine, {
    storeId,
    input: { id: lineId, ...draft },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.updateResponseRequisitionLine;
  if (response.__typename === 'RequisitionLineNode') return { kind: 'saved' };
  return mapUpdateError(
    response.error.__typename,
    response.error.description
  );
};

// ADD: the draft's first save realises the create — insert (the server births
// the line at zero quantities, capturing the gated indicative price) then
// update with the whole draft. Two sequential mutations: unlike the request
// side, BatchResponseRequisitionInput carries only deletes (contract › line
// editing), so there is no one-call batch. A typed insert error gets the
// generic failure surface (the picker loads an existing item's line rather
// than inserting a duplicate — D74 — so it is not normally reachable).
export const saveNewLine = async (
  storeId: string,
  requisitionId: string,
  line: EditorLine,
  draft: LineDraft
): Promise<SaveLineResult> => {
  const result = await graphqlFetch(InsertRequisitionLine, {
    storeId,
    input: { id: line.lineId, itemId: line.itemId, requisitionId },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  if (
    result.data.insertResponseRequisitionLine.__typename !==
    'RequisitionLineNode'
  )
    return { kind: 'failed' };
  return updateLine(storeId, line.lineId, draft);
};

// EDIT: a single whole-draft update.
export const saveExistingLine = (
  storeId: string,
  line: EditorLine,
  draft: LineDraft
): Promise<SaveLineResult> => updateLine(storeId, line.lineId, draft);

// --- Stats tabs (spec S4 § stats tabs) -----------------------------------------

// Both summaries, computed server-side from the SAVED line. Keyed on the line
// id — a not-yet-saved add-mode item has none (D75), and the tabs sit in
// their empty state. An error answer (or a transport failure) reads the same
// as no stats.
export type LineStats = Extract<
  ResponseLineStatsResult['responseRequisitionStats'],
  { __typename: 'ResponseRequisitionStatsNode' }
>;

export const fetchLineStats = async (
  storeId: string,
  requisitionLineId: string
): Promise<LineStats | undefined> => {
  const result = await graphqlFetch(ResponseLineStats, {
    storeId,
    requisitionLineId,
  });
  if (result.kind !== 'success') return undefined;
  const response = result.data.responseRequisitionStats;
  return response.__typename === 'ResponseRequisitionStatsNode'
    ? response
    : undefined;
};
