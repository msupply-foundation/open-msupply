import type { InternalOrderLineView } from '../../../plugin-sdk/types';
import type { InternalOrderLineFragment } from './internalOrderDetail.generated';

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
