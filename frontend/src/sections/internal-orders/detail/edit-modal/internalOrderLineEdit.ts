import { graphqlFetch } from '../../../../api/graphql';
import { t, tPlural } from '../../../../intl';
import { formatNumber, round } from '../../../../intl/formatNumber';
import {
  InternalOrderItemStats,
  AddInternalOrderLine,
  UpdateInternalOrderLine,
} from './internalOrderLineEdit.generated';
import type { InternalOrderLineFragment } from '../internalOrderDetail.generated';

// Line-editor domain logic (spec/internal-orders S4): the entry-mode
// re-expression (AC-LN12/LN17/LN19), the add-mode suggestion preview (AC-LN4),
// and the two save paths (AC-LN3/LN11).

// The quantity entry mode (AC-LN12): stored values are always UNITS; the mode
// only re-expresses the display.
export type EntryMode = 'units' | 'packs' | 'doses';

// One course-and-demographic group of a line's stored population forecast —
// the shape the server serialises into RequisitionLineNode.vaccineCourses
// (contract › Population-based forecasting), consumed by the editor's
// calculation display (AC-PF7). The client parses this; it never writes it.
export type VaccineCourse = {
  /** Pre-formatted "<course> (<demographic>)"; empty parens for a demographic-less course. */
  courseTitle: string;
  numberOfDoses: number;
  coverageRate: number;
  targetPopulation: number;
  wastageRate: number;
  lossFactor: number;
  annualTargetDoses: number;
  bufferStockMonths: number;
  supplyPeriodMonths: number;
  dosesPerUnit: number;
  forecastDoses: number;
  forecastUnits: number;
};

// Parse a line's stored vaccineCourses JSON into its per-course breakdown. A
// null, empty, or unparseable string yields no courses (the display then falls
// back to the ordinary charts).
export const parseVaccineCourses = (json: string | null): VaccineCourse[] => {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as VaccineCourse[]) : [];
  } catch {
    return [];
  }
};

// One arithmetic step of the calculation display: its figures substituted into
// the formula, then the emphasised result (AC-PF7). The step's title and
// formula wording are static locale keys held by the display component; this
// pure function owns only the arithmetic so it can be tested against the AC's
// exact figures. Rounding mirrors the reference: the loss factor to 3 dp, the
// two dose totals to 2 dp, the units result the ceil of the stored total.
export type ForecastStep = { substitution: string; result: string };

export const forecastSteps = (
  course: VaccineCourse
): [ForecastStep, ForecastStep, ForecastStep] => [
  {
    // 1. Annual target doses = target population × doses × (coverage/100) × loss factor.
    substitution: `${formatNumber(course.targetPopulation)} × ${formatNumber(course.numberOfDoses)} × (${formatNumber(course.coverageRate)} / 100) × ${round(course.lossFactor, 3)}`,
    result: `= ${round(course.annualTargetDoses, 2)} ${t('label.doses-per-year')}`,
  },
  {
    // 2. Forecast doses = annual/12 × (supply period + buffer stock months).
    substitution: `(${round(course.annualTargetDoses, 2)} / 12) × (${formatNumber(course.supplyPeriodMonths)} + ${formatNumber(course.bufferStockMonths)})`,
    result: `= ${round(course.forecastDoses, 2)} ${t('label.doses').toLowerCase()}`,
  },
  {
    // 3. Forecast units = forecast doses ÷ doses per unit (result rounded up).
    substitution: `${round(course.forecastDoses, 2)} / ${formatNumber(course.dosesPerUnit)}`,
    result: `= ${formatNumber(Math.ceil(course.forecastUnits))} ${t('label.units').toLowerCase()}`,
  },
];

// The editor's working line — the same shape whether it comes from an existing
// line (edit mode: the stored figures) or an add-mode item preview (the item's
// current figures + a client-previewed suggestion). Statistics are all in
// UNITS; the entry mode re-expresses them at display time.
export type EditorLine = {
  /** Existing line id (edit) or the client-generated id that will create it (add). */
  lineId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitName: string | null;
  defaultPackSize: number;
  doses: number;
  isVaccine: boolean;
  // Statistics (units).
  availableStockOnHand: number;
  averageMonthlyConsumption: number;
  monthsOfStock: number;
  suggestedQuantity: number;
  forecastTotalUnits: number | null;
  forecastTotalDoses: number | null;
  /** The forecast's per-course breakdown (AC-PF7); empty on a forecast-less line. */
  vaccineCourses: VaccineCourse[];
  pricePerUnit: number | null;
  // Extended movements (edit mode on a customer-statistics program order).
  initialStockOnHandUnits: number;
  incomingUnits: number;
  outgoingUnits: number;
  lossInUnits: number;
  additionInUnits: number;
  expiringUnits: number;
  daysOutOfStock: number;
  // The editable draft.
  requestedQuantity: number;
  comment: string;
  reasonId: string | null;
  /**
   * The stored variance reason's TEXT (the id above is what the editor writes).
   * Carried so the line's published plugin view can be built from the editor's
   * own draft — see `toLineViewFromEditor` (detail/pluginViews.ts).
   */
  reason: string | null;
  /** True in add mode — no line exists on the wire until the first save. */
  isNew: boolean;
};

// --- Entry-mode re-expression (AC-LN12/LN17/LN19) ---------------------------

// A stored unit value → the display value in the active mode: ÷ pack size for
// packs (two decimals, AC-LN17), × doses-per-unit for doses.
export const unitsToMode = (
  units: number,
  mode: EntryMode,
  packSize: number,
  doses: number
): number => {
  if (mode === 'packs') return packSize > 0 ? units / packSize : units;
  if (mode === 'doses') return units * doses;
  return units;
};

// A display value in the active mode → the stored units (AC-LN12): packs ×
// pack size; doses ÷ doses-per-unit, rounded UP (a part-unit of doses still
// consumes a whole unit).
export const modeToUnits = (
  value: number,
  mode: EntryMode,
  packSize: number,
  doses: number
): number => {
  if (mode === 'packs') return value * packSize;
  if (mode === 'doses') return doses > 0 ? Math.ceil(value / doses) : value;
  return value;
};

// A statistic re-expressed in the active mode for display (AC-LN19): rounded to
// a whole number, AMC and Suggested rounding UP, everything else to nearest; an
// absent value shows 0. Time quantities never pass through here.
export const statInMode = (
  units: number,
  mode: EntryMode,
  packSize: number,
  doses: number,
  roundUp = false
): number => {
  const raw = unitsToMode(units, mode, packSize, doses);
  return roundUp ? Math.ceil(raw) : Math.round(raw);
};

// The active mode's measure word — the item's unit name (falling back to
// "unit") / "pack" / "dose", pluralised for the dose word.
export const modeWord = (
  mode: EntryMode,
  unitName: string | null,
  count = 2
): string => {
  if (mode === 'packs') return t('label.packs');
  if (mode === 'doses') return tPlural('label.doses-plural', count);
  return unitName ?? t('label.unit');
};

// The store's default entry mode (AC-LN18): packs where the store orders in
// packs (unconditionally — it does not check the item's pack size), else doses
// for a dose-managed vaccine with a positive doses-per-unit, else units.
export const defaultEntryMode = (
  orderInPacks: boolean,
  manageVaccinesInDoses: boolean,
  isVaccine: boolean,
  doses: number
): EntryMode => {
  if (orderInPacks) return 'packs';
  if (manageVaccinesInDoses && isVaccine && doses > 0) return 'doses';
  return 'units';
};

// --- Add-mode suggestion preview (AC-LN4) -----------------------------------

// The suggested quantity previewed from an item's figures before its line
// exists: zero without consumption, zero when the target months are zero, zero
// when months-of-stock exceeds the reorder threshold (the target months stand
// in when the threshold is Not set); otherwise (target − months of stock) ×
// AMC, rounded up. The real suggestion is the server's, taken at save; this is
// the draft preview only. (The population-forecast override, AC-PF4, is not
// previewed — a forecast is captured server-side at line creation.)
export const previewSuggestion = (
  amc: number,
  monthsOfStock: number,
  minMonths: number,
  maxMonths: number
): number => {
  if (amc <= 0 || maxMonths <= 0) return 0;
  const threshold = minMonths > 0 ? minMonths : maxMonths;
  if (monthsOfStock > threshold) return 0;
  return Math.ceil((maxMonths - monthsOfStock) * amc);
};

// --- Add-mode item preview read ---------------------------------------------

export const buildAddPreview = async (
  storeId: string,
  itemId: string,
  minMonths: number,
  maxMonths: number,
  lineId: string
): Promise<EditorLine | undefined> => {
  const result = await graphqlFetch(InternalOrderItemStats, {
    storeId,
    itemId,
  });
  if (result.kind !== 'success') return undefined;
  const node = result.data.items.nodes[0];
  if (!node) return undefined;
  const { stats } = node;
  const monthsOfStock =
    stats.availableMonthsOfStockOnHand ??
    (stats.averageMonthlyConsumption > 0
      ? stats.availableStockOnHand / stats.averageMonthlyConsumption
      : 0);
  return {
    lineId,
    itemId: node.id,
    itemCode: node.code,
    itemName: node.name,
    unitName: node.unitName,
    defaultPackSize: node.defaultPackSize,
    doses: node.doses,
    isVaccine: node.isVaccine,
    availableStockOnHand: stats.availableStockOnHand,
    averageMonthlyConsumption: stats.averageMonthlyConsumption,
    monthsOfStock,
    suggestedQuantity: previewSuggestion(
      stats.averageMonthlyConsumption,
      monthsOfStock,
      minMonths,
      maxMonths
    ),
    forecastTotalUnits: null,
    forecastTotalDoses: null,
    vaccineCourses: [],
    pricePerUnit: null,
    initialStockOnHandUnits: 0,
    incomingUnits: 0,
    outgoingUnits: 0,
    lossInUnits: 0,
    additionInUnits: 0,
    expiringUnits: 0,
    daysOutOfStock: 0,
    requestedQuantity: 0,
    comment: '',
    reasonId: null,
    reason: null,
    isNew: true,
  };
};

// An existing line → the editor's working shape (edit mode). Months of stock is
// derived from the stored figures the same way the line table derives it.
export const editorLineFromLine = (
  line: InternalOrderLineFragment
): EditorLine => ({
  lineId: line.id,
  itemId: line.itemId,
  itemCode: line.item.code,
  itemName: line.itemName,
  unitName: line.item.unitName,
  defaultPackSize: line.item.defaultPackSize,
  doses: line.item.doses,
  isVaccine: line.item.isVaccine,
  availableStockOnHand: line.availableStockOnHand,
  averageMonthlyConsumption: line.averageMonthlyConsumption,
  monthsOfStock:
    line.averageMonthlyConsumption > 0
      ? line.availableStockOnHand / line.averageMonthlyConsumption
      : 0,
  suggestedQuantity: line.suggestedQuantity,
  forecastTotalUnits: line.forecastTotalUnits,
  forecastTotalDoses: line.forecastTotalDoses,
  vaccineCourses: parseVaccineCourses(line.vaccineCourses),
  pricePerUnit: line.pricePerUnit,
  initialStockOnHandUnits: line.initialStockOnHandUnits,
  incomingUnits: line.incomingUnits,
  outgoingUnits: line.outgoingUnits,
  lossInUnits: line.lossInUnits,
  additionInUnits: line.additionInUnits,
  expiringUnits: line.expiringUnits,
  daysOutOfStock: line.daysOutOfStock,
  requestedQuantity: line.requestedQuantity,
  comment: line.comment ?? '',
  reasonId: line.optionId,
  reason: line.reason?.reason ?? null,
  isNew: false,
});

// --- Save (AC-LN3/LN11) -----------------------------------------------------

export type SaveLineResult =
  { kind: 'saved' } | { kind: 'error'; message: string } | { kind: 'failed' };

// Map the update union's typed errors to copy (contract › editing lines). Only
// the reasons refusal and cannot-edit are reachable from the editor; the rest
// fall back to their description.
const mapUpdateError = (typename: string, description: string): string => {
  switch (typename) {
    case 'RecordNotFound':
      return t('messages.record-not-found');
    case 'CannotEditRequisition':
      return t('error.cannot-edit-requisition');
    case 'RequisitionReasonNotProvided':
      return t('error.reasons-not-provided-program-requisition');
    default:
      return description;
  }
};

type Draft = {
  requestedQuantity: number;
  comment: string;
  // Omitted (undefined) where the order has no reason surface; null/string
  // where it does — null clears the stored reason (D30).
  optionId?: string | null;
};

// ADD (AC-LN3): the draft's first save realises the create — insert (server
// generates the snapshot + suggestion + gated captures) then update (the
// drafted quantity / comment / reason), in one batch. A typed insert error
// gets the generic failure surface (contract parity); the update error is
// surfaced inline.
export const saveNewLine = async (
  storeId: string,
  requisitionId: string,
  line: EditorLine,
  draft: Draft
): Promise<SaveLineResult> => {
  const result = await graphqlFetch(AddInternalOrderLine, {
    storeId,
    input: {
      insertRequestRequisitionLines: [
        { id: line.lineId, itemId: line.itemId, requisitionId },
      ],
      updateRequestRequisitionLines: [
        {
          id: line.lineId,
          requestedQuantity: draft.requestedQuantity,
          comment: draft.comment,
          optionId: draft.optionId,
        },
      ],
    },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const batch = result.data.batchRequestRequisition;
  const insert = batch.insertRequestRequisitionLines?.[0];
  if (insert && insert.response.__typename !== 'RequisitionLineNode')
    // A typed insert rejection (duplicate item, cannot-edit, …) — generic
    // failure, matching the reference (no dedicated handling).
    return { kind: 'failed' };
  const update = batch.updateRequestRequisitionLines?.[0];
  if (
    update &&
    update.response.__typename === 'UpdateRequestRequisitionLineError'
  )
    return {
      kind: 'error',
      message: mapUpdateError(
        update.response.error.__typename,
        update.response.error.description
      ),
    };
  return { kind: 'saved' };
};

// EDIT (AC-LN11): a single line update; exactly the changed fields persist.
export const saveExistingLine = async (
  storeId: string,
  line: EditorLine,
  draft: Draft
): Promise<SaveLineResult> => {
  const result = await graphqlFetch(UpdateInternalOrderLine, {
    storeId,
    input: {
      id: line.lineId,
      requestedQuantity: draft.requestedQuantity,
      comment: draft.comment,
      optionId: draft.optionId,
    },
  });
  if (result.kind !== 'success') return { kind: 'failed' };
  const response = result.data.updateRequestRequisitionLine;
  if (response.__typename === 'RequisitionLineNode') return { kind: 'saved' };
  return {
    kind: 'error',
    message: mapUpdateError(
      response.error.__typename,
      response.error.description
    ),
  };
};
