import { describe, expect, it } from 'vitest';
import type {
  InternalOrderInfoFragment,
  InternalOrderLineFragment,
} from './internalOrderDetail.generated';
import { editorLineFromLine } from './edit-modal/internalOrderLineEdit';
import {
  lineMonthsOfStock,
  toInternalOrderView,
  toLineView,
  toLineViewFromEditor,
} from './pluginViews';

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

const order = (
  overrides: Partial<InternalOrderInfoFragment> = {}
): InternalOrderInfoFragment => ({
  id: 'req-1',
  requisitionNumber: 42,
  status: 'DRAFT',
  colour: null,
  theirReference: null,
  comment: null,
  otherPartyId: 'name-supplier',
  otherPartyName: 'General Warehouse',
  otherParty: { store: { isDisabled: false } },
  destinationCustomer: null,
  minMonthsOfStock: 1,
  maxMonthsOfStock: 3,
  program: { id: 'prog-1', name: 'Malaria' },
  orderType: 'Monthly',
  period: { id: 'period-1', name: 'Jun 2025' },
  approvalStatus: 'NONE',
  isEmergency: false,
  createdDatetime: '2025-06-01T00:00:00',
  sentDatetime: null,
  finalisedDatetime: null,
  user: null,
  shipments: { nodes: [] },
  createdFromRequisition: null,
  documents: { nodes: [] },
  ancillaryState: { state: 'NONE', count: 0, toAdd: [], toUpdate: [] },
  lines: { totalCount: 0, nodes: [] },
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

describe('toLineViewFromEditor (OMS-REG-REPL-16.7)', () => {
  it('publishes a SAVED line identically to the line-table mapper', () => {
    // The parity that makes the info panel and the column slot agree: the same
    // line, reached two ways, is one DTO.
    const saved = line();
    expect(toLineViewFromEditor(editorLineFromLine(saved))).toEqual(
      toLineView(saved)
    );
  });

  it('keeps parity for an absent comment, unit name, and reason', () => {
    const saved = line({
      comment: null,
      reason: null,
      item: {
        code: 'X',
        unitName: null,
        defaultPackSize: 1,
        doses: 0,
        isVaccine: false,
      },
    });
    expect(toLineViewFromEditor(editorLineFromLine(saved))).toEqual(
      toLineView(saved)
    );
  });

  it('publishes an add-mode draft under the id its first save will create', () => {
    const draft = {
      ...editorLineFromLine(line()),
      lineId: 'client-uuid',
      isNew: true,
      comment: '',
    };
    const view = toLineViewFromEditor(draft);
    expect(view.id).toBe('client-uuid');
    // The editor holds an absent comment as '' — the DTO says "no comment".
    expect(view.comment).toBeUndefined();
  });
});

describe('toInternalOrderView', () => {
  it('publishes the order flattened, in domain words', () => {
    expect(toInternalOrderView(order(), true)).toEqual({
      id: 'req-1',
      requisitionNumber: 42,
      status: 'draft',
      editable: true,
      programId: 'prog-1',
      programName: 'Malaria',
      orderType: 'Monthly',
      periodId: 'period-1',
      periodName: 'Jun 2025',
      minMonthsOfStock: 1,
      maxMonthsOfStock: 3,
      supplierId: 'name-supplier',
      supplierName: 'General Warehouse',
    });
  });

  it('leaves a general order`s program, order type, and period undefined', () => {
    const view = toInternalOrderView(
      order({ program: null, orderType: null, period: null }),
      true
    );
    expect(view.programId).toBeUndefined();
    expect(view.programName).toBeUndefined();
    expect(view.orderType).toBeUndefined();
    expect(view.periodId).toBeUndefined();
    expect(view.periodName).toBeUndefined();
  });

  it('maps each wire status to its lifecycle word, NEW reading as draft', () => {
    expect(toInternalOrderView(order({ status: 'SENT' }), false).status).toBe(
      'sent'
    );
    expect(
      toInternalOrderView(order({ status: 'FINALISED' }), false).status
    ).toBe('finalised');
    // NEW is response-side only; the status trail treats it as the first stage.
    expect(toInternalOrderView(order({ status: 'NEW' }), false).status).toBe(
      'draft'
    );
  });

  it('reports the host`s editability answer, never re-deriving it', () => {
    // A sent order is not editable; the flag is the screen's own gate, so the
    // panel can never disagree with the affordances around it.
    expect(toInternalOrderView(order({ status: 'SENT' }), false).editable).toBe(
      false
    );
    expect(toInternalOrderView(order(), true).editable).toBe(true);
  });
});
