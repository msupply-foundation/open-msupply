import type {
  InternalOrderLineView,
  InternalOrderView,
} from '../../../plugin-sdk/types';
import type { EditorLine } from './edit-modal/internalOrderLineEdit';
import type {
  InternalOrderInfoFragment,
  InternalOrderLineFragment,
} from './internalOrderDetail.generated';

/*
 * The internal-order slot boundary: host GraphQL data → the SDK's view DTOs
 * (spec/plugins/sdk-contract.md § SDK surface — "slot props are SDK-owned
 * view DTOs, mapped from host data at each slot boundary, never host
 * feature types").
 *
 * This is the ONE sanctioned remap in the vertical (kdd/type-safety says don't
 * map GraphQL-derived types to a parallel one): the DTO is a published contract
 * for out-of-tree code, so it must NOT move when the host's query does. Every
 * other consumer in this folder keeps using the generated fragment.
 *
 * Pure functions over plain data — no reactivity, no Solid — so a plugin's view
 * of a line is unit-testable and identical wherever it is built (the line table
 * here, the line editor's draft in the info-panel slot).
 */

/**
 * Months of stock for a line: available stock ÷ AMC, and 0 when the line has no
 * recorded consumption (the host's MOS column and its sort read the same
 * figure, which is why it lives here rather than being re-derived per caller).
 */
export const lineMonthsOfStock = (line: {
  availableStockOnHand: number;
  averageMonthlyConsumption: number;
}): number =>
  line.averageMonthlyConsumption > 0
    ? line.availableStockOnHand / line.averageMonthlyConsumption
    : 0;

/**
 * One line of the detail screen's line table, as the SDK publishes it.
 *
 * Quantities pass through in the line's own UNITS, unrounded and unformatted —
 * the host's own dose annotations and rounding are presentation, and a plugin
 * formats through the SDK's `formatNumber`. Absent strings arrive as
 * `undefined`, never `''`, so a plugin can tell "no unit name" from "empty".
 */
export const toLineView = (
  line: InternalOrderLineFragment
): InternalOrderLineView => ({
  id: line.id,
  itemId: line.itemId,
  itemCode: line.item.code,
  itemName: line.itemName,
  unitName: line.item.unitName ?? undefined,
  defaultPackSize: line.item.defaultPackSize,
  isVaccine: line.item.isVaccine,
  dosesPerUnit: line.item.doses,
  comment: line.comment ?? undefined,
  requestedQuantity: line.requestedQuantity,
  suggestedQuantity: line.suggestedQuantity,
  availableStockOnHand: line.availableStockOnHand,
  averageMonthlyConsumption: line.averageMonthlyConsumption,
  monthsOfStock: lineMonthsOfStock(line),
  initialStockOnHandUnits: line.initialStockOnHandUnits,
  incomingUnits: line.incomingUnits,
  outgoingUnits: line.outgoingUnits,
  lossInUnits: line.lossInUnits,
  additionInUnits: line.additionInUnits,
  expiringUnits: line.expiringUnits,
  daysOutOfStock: line.daysOutOfStock,
  reason: line.reason?.reason ?? undefined,
});

/**
 * The SAME published line view, built from the LINE EDITOR's working line — so
 * the info-panel slot in the editor (ui-surface § S8) shows a plugin exactly
 * what the line table's column slot shows for the same line.
 *
 * The editor's shape differs from the fragment's only in how it holds absent
 * values: it coalesces an absent comment to `''` before the editor's textarea
 * ever sees it, so an empty comment publishes as `undefined` here — the DTO's
 * "no comment" (the parity test states this). Everything else is a rename.
 *
 * An add-mode DRAFT is a legitimate input: `id` is then the client-generated id
 * the first save will create the line under, and the movement figures are 0
 * because no line exists to have moved yet.
 */
export const toLineViewFromEditor = (
  line: EditorLine
): InternalOrderLineView => ({
  id: line.lineId,
  itemId: line.itemId,
  itemCode: line.itemCode,
  itemName: line.itemName,
  unitName: line.unitName ?? undefined,
  defaultPackSize: line.defaultPackSize,
  isVaccine: line.isVaccine,
  dosesPerUnit: line.doses,
  comment: line.comment === '' ? undefined : line.comment,
  requestedQuantity: line.requestedQuantity,
  suggestedQuantity: line.suggestedQuantity,
  availableStockOnHand: line.availableStockOnHand,
  averageMonthlyConsumption: line.averageMonthlyConsumption,
  monthsOfStock: line.monthsOfStock,
  initialStockOnHandUnits: line.initialStockOnHandUnits,
  incomingUnits: line.incomingUnits,
  outgoingUnits: line.outgoingUnits,
  lossInUnits: line.lossInUnits,
  additionInUnits: line.additionInUnits,
  expiringUnits: line.expiringUnits,
  daysOutOfStock: line.daysOutOfStock,
  reason: line.reason ?? undefined,
});

/**
 * The order a line belongs to, as the SDK publishes it.
 *
 * Flattened and in DOMAIN words: the wire's `RequisitionNodeStatus` becomes one
 * of three lifecycle words (the response-only `NEW` reads as `draft`, as the
 * status trail treats it), the program / order type / period arrive as plain
 * ids and names, and the supplier is named without the wire's "other party"
 * framing. `editable` is the host's own editability gate, passed in rather than
 * re-derived, so a plugin sees the same answer every edit affordance on the
 * screen sees.
 */
export const toInternalOrderView = (
  order: InternalOrderInfoFragment,
  editable: boolean
): InternalOrderView => ({
  id: order.id,
  requisitionNumber: order.requisitionNumber,
  status:
    order.status === 'SENT'
      ? 'sent'
      : order.status === 'FINALISED'
        ? 'finalised'
        : 'draft',
  editable,
  programId: order.program?.id,
  programName: order.program?.name,
  orderType: order.orderType ?? undefined,
  periodId: order.period?.id,
  periodName: order.period?.name,
  minMonthsOfStock: order.minMonthsOfStock,
  maxMonthsOfStock: order.maxMonthsOfStock,
  supplierId: order.otherPartyId,
  supplierName: order.otherPartyName,
});
