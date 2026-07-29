import { describe, expect, it } from 'vitest';
import type { InternalOrderLineFragment } from './internalOrderDetail.generated';
import { lineMonthsOfStock, toLineView } from './pluginViews';

// The internal-order slot boundary (plugins sdk-contract § SDK surface):
// host GraphQL data → the SDK's published view DTO. Behaviours cited from
// OMS-REG-REPL-16.4 (a contributed column reads the line's published view).

const line = (
  overrides: Partial<InternalOrderLineFragment> = {}
): InternalOrderLineFragment => ({
  id: 'line-1',
  itemId: 'item-1',
  itemName: 'Amoxicillin 250mg',
  comment: 'short supply',
  item: {
    code: 'AMX250',
    unitName: 'tablet',
    defaultPackSize: 100,
    doses: 0,
    isVaccine: false,
  },
  requestedQuantity: 120,
  suggestedQuantity: 100,
  approvedQuantity: 0,
  approvalComment: null,
  availableStockOnHand: 60,
  averageMonthlyConsumption: 30,
  initialStockOnHandUnits: 50,
  incomingUnits: 20,
  outgoingUnits: 15,
  lossInUnits: 3,
  additionInUnits: 4,
  expiringUnits: 2,
  daysOutOfStock: 7,
  pricePerUnit: null,
  forecastTotalUnits: null,
  forecastTotalDoses: null,
  vaccineCourses: null,
  optionId: null,
  reason: { reason: 'Stock out' },
  ancillaryParents: [],
  ...overrides,
});

describe('lineMonthsOfStock', () => {
  it('is available stock over AMC', () => {
    expect(
      lineMonthsOfStock({
        availableStockOnHand: 60,
        averageMonthlyConsumption: 30,
      })
    ).toBe(2);
  });

  it('is zero when the line has no recorded consumption', () => {
    expect(
      lineMonthsOfStock({
        availableStockOnHand: 60,
        averageMonthlyConsumption: 0,
      })
    ).toBe(0);
  });
});

describe('toLineView (OMS-REG-REPL-16.4)', () => {
  it('publishes the line`s identity, item facts, and movements', () => {
    expect(toLineView(line())).toEqual({
      id: 'line-1',
      itemId: 'item-1',
      itemCode: 'AMX250',
      itemName: 'Amoxicillin 250mg',
      unitName: 'tablet',
      defaultPackSize: 100,
      isVaccine: false,
      dosesPerUnit: 0,
      comment: 'short supply',
      requestedQuantity: 120,
      suggestedQuantity: 100,
      availableStockOnHand: 60,
      averageMonthlyConsumption: 30,
      monthsOfStock: 2,
      initialStockOnHandUnits: 50,
      incomingUnits: 20,
      outgoingUnits: 15,
      lossInUnits: 3,
      additionInUnits: 4,
      expiringUnits: 2,
      daysOutOfStock: 7,
      reason: 'Stock out',
    });
  });

  it('maps every absent string to undefined, never an empty string', () => {
    const view = toLineView(
      line({
        comment: null,
        reason: null,
        item: {
          code: 'X',
          unitName: null,
          defaultPackSize: 1,
          doses: 0,
          isVaccine: false,
        },
      })
    );
    expect(view.comment).toBeUndefined();
    expect(view.reason).toBeUndefined();
    expect(view.unitName).toBeUndefined();
  });

  it('passes quantities through in units, unrounded and unannotated', () => {
    // The host's dose annotation and its rounding are presentation; a plugin
    // formats through the SDK (sdk-contract § internationalisation).
    const view = toLineView(
      line({
        averageMonthlyConsumption: 12.7,
        availableStockOnHand: 33.5,
        item: {
          code: 'VAX',
          unitName: 'vial',
          defaultPackSize: 10,
          doses: 5,
          isVaccine: true,
        },
      })
    );
    expect(view.averageMonthlyConsumption).toBe(12.7);
    expect(view.availableStockOnHand).toBe(33.5);
    expect(view.dosesPerUnit).toBe(5);
    expect(view.isVaccine).toBe(true);
  });
});
