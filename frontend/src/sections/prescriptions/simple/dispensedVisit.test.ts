import { describe, expect, it } from 'vitest';
import { medicinesGiven } from '../list/medicinesGiven';
import {
  afterCancelRead,
  canCancelVisit,
  cannotEditReason,
  printableVisit,
  visitHeading,
  visitLines,
  type DispensedRecord,
} from './dispensedVisit';

describe('printableVisit (spec/prescriptions rules › printing a dispensed visit)', () => {
  const screen = {
    viewing: false,
    openedId: undefined,
    editing: false,
    listed: 0,
    namedId: undefined,
  };

  // OMS-REG-DIS-12.301
  it('prints the visit just dispensed while the message names it', () => {
    expect(printableVisit({ ...screen, namedId: 'rx-1' })).toBe('rx-1');
  });

  // OMS-REG-DIS-12.302
  it('prints the visit open on the screen, once read', () => {
    expect(printableVisit({ ...screen, viewing: true, openedId: 'rx-2' })).toBe(
      'rx-2'
    );
    expect(
      printableVisit({ ...screen, viewing: true, namedId: 'rx-1' })
    ).toBeUndefined();
  });

  // OMS-REG-DIS-12.303
  it('prints nothing with a visit on the list, or with no visit named', () => {
    expect(
      printableVisit({ ...screen, listed: 2, namedId: 'rx-1' })
    ).toBeUndefined();
    expect(printableVisit(screen)).toBeUndefined();
  });

  // OMS-REG-DIS-12.304
  it('prints nothing while a visit is being edited', () => {
    expect(
      printableVisit({ ...screen, editing: true, listed: 2 })
    ).toBeUndefined();
  });
});

type Line = DispensedRecord['lines']['nodes'][number];

const line = (
  itemName: string,
  numberOfPacks: number,
  totalAfterTax: number,
  {
    packSize = 1,
    type = 'STOCK_OUT',
    itemId = itemName,
    unitName = 'Tab',
  }: {
    packSize?: number;
    type?: Line['type'];
    itemId?: string;
    unitName?: string | null;
  } = {}
): Line => ({
  id: `${itemId}-${numberOfPacks}-${totalAfterTax}`,
  type,
  itemId,
  itemName,
  packSize,
  numberOfPacks,
  totalAfterTax,
  sellPricePerPack: totalAfterTax / numberOfPacks,
  stockLine: null,
  item: { id: itemId, unitName },
});

const record = (fields: Partial<DispensedRecord> = {}): DispensedRecord => ({
  __typename: 'InvoiceNode',
  id: 'rx-1',
  status: 'PICKED',
  isCancellation: false,
  createdDatetime: '2026-11-20T09:24:00Z',
  backdatedDatetime: null,
  cancelledDatetime: null,
  patient: { id: 'p1', name: 'Somchai', code: 'NHF0102', isUnnamed: false },
  pricing: { totalAfterTax: 0 },
  lines: { nodes: [] },
  ...fields,
});

describe('visitLines (spec/prescriptions rules › a dispensed visit)', () => {
  // OMS-REG-DIS-12.271
  it('lists each medicine once, with the amount given in its unit and its price, by name', () => {
    expect(
      visitLines([
        line('Paracetamol 500mg', 2, 2000, { packSize: 10 }),
        line('ORS sachet', 2, 1000, { unitName: 'Sachet' }),
      ])
    ).toEqual([
      {
        itemId: 'ORS sachet',
        name: 'ORS sachet',
        unit: 'Sachet',
        units: 2,
        price: 1000,
      },
      {
        itemId: 'Paracetamol 500mg',
        name: 'Paracetamol 500mg',
        unit: 'Tab',
        units: 20,
        price: 2000,
      },
    ]);
  });

  // OMS-REG-DIS-12.271: a medicine given from two batches
  it('adds up a medicine given from two batches, amounts and prices both', () => {
    expect(
      visitLines([
        line('Amoxicillin 250mg', 1.5, 300, { packSize: 10 }),
        line('Amoxicillin 250mg', 0.5, 120, { packSize: 10 }),
      ])
    ).toEqual([expect.objectContaining({ units: 20, price: 420 })]);
  });

  // OMS-REG-DIS-12.271: lines giving nothing are left out, as on Dispensing
  // records
  it('leaves out a placeholder awaiting stock and a line of none', () => {
    expect(
      visitLines([
        line('Zinc 20mg', 3, 0, { type: 'UNALLOCATED_STOCK' }),
        line('ORS sachet', 0, 0),
        line('Paracetamol 500mg', 1, 100),
      ]).map(given => given.name)
    ).toEqual(['Paracetamol 500mg']);
  });

  // OMS-REG-DIS-12.271: a service shows its price and no amount
  it('shows a service with its price and no amount', () => {
    expect(
      visitLines([
        line('Consultation', 1, 10000, { type: 'SERVICE', unitName: null }),
      ])
    ).toEqual([
      {
        itemId: 'Consultation',
        name: 'Consultation',
        unit: null,
        units: undefined,
        price: 10000,
      },
    ]);
  });

  // OMS-REG-DIS-12.271 and .216: the open visit gives the same medicines, in
  // the same order and amounts, as the record's row in Dispensing records.
  it('agrees with Dispensing records on what the record gave', () => {
    const lines = [
      line('Zinc 20mg', 1, 50),
      line('Amoxicillin 250mg', 1.5, 300, { packSize: 10 }),
      line('Consultation', 1, 10000, { type: 'SERVICE', unitName: null }),
      line('Ibuprofen 200mg', 3, 0, { type: 'UNALLOCATED_STOCK' }),
      line('Amoxicillin 250mg', 0.5, 120, { packSize: 10 }),
    ];
    const medicines = visitLines(lines)
      .filter(given => given.units !== undefined)
      .map(given => `${given.name} (${given.units})`)
      .join(', ');
    expect(medicines).toBe(medicinesGiven(lines, String));
  });

  // OMS-REG-DIS-12.271: two items can share a name, and their amounts are in
  // different units.
  it('keeps two medicines that share a name apart', () => {
    expect(
      visitLines([
        line('Paracetamol', 10, 100, { itemId: 'tab' }),
        line('Paracetamol', 60, 600, { itemId: 'syrup', unitName: 'ml' }),
      ]).map(given => [given.itemId, given.units])
    ).toEqual([
      ['tab', 10],
      ['syrup', 60],
    ]);
  });
});

describe('visitHeading (spec/prescriptions rules › a dispensed visit)', () => {
  // OMS-REG-DIS-12.270: the dispensed date and time, as on Dispensing records
  it('says when the visit was dispensed: the backdated time, else created', () => {
    expect(visitHeading(record())).toEqual({
      kind: 'dispensed',
      at: '2026-11-20T09:24:00Z',
    });
    expect(
      visitHeading(record({ backdatedDatetime: '2026-11-19T15:00:00Z' }))
    ).toEqual({ kind: 'dispensed', at: '2026-11-19T15:00:00Z' });
  });

  // OMS-REG-DIS-12.279
  it('says when a cancelled visit was cancelled, as well as dispensed', () => {
    expect(
      visitHeading(
        record({
          status: 'CANCELLED',
          cancelledDatetime: '2026-11-21T08:00:00Z',
        })
      )
    ).toEqual({
      kind: 'cancelled',
      at: '2026-11-20T09:24:00Z',
      cancelledAt: '2026-11-21T08:00:00Z',
    });
  });

  it('says when a record still New was created', () => {
    expect(visitHeading(record({ status: 'NEW' })).kind).toBe('created');
  });
});

describe('cannotEditReason (spec/prescriptions rules › a dispensed visit)', () => {
  // OMS-REG-DIS-12.277, .279
  it('says why a finished, cancelled or New record can’t be edited', () => {
    expect(cannotEditReason(record({ status: 'VERIFIED' }))).toBe(
      'messages.finished-cannot-edit'
    );
    expect(cannotEditReason(record({ status: 'CANCELLED' }))).toBe(
      'messages.cancelled-cannot-edit'
    );
    expect(cannotEditReason(record({ status: 'NEW' }))).toBe(
      'messages.not-dispensed-cannot-edit'
    );
  });

  // OMS-REG-DIS-12.280
  it('says nothing for a Picked visit', () => {
    expect(cannotEditReason(record({ status: 'PICKED' }))).toBeUndefined();
  });
});

describe('canCancelVisit (spec/prescriptions rules › a dispensed visit)', () => {
  // OMS-REG-DIS-12.277
  it('lets a finished visit be cancelled', () => {
    expect(canCancelVisit(record({ status: 'VERIFIED' }))).toBe(true);
  });

  // OMS-REG-DIS-12.279, .280
  it('never offers to cancel a Picked, New or cancelled visit', () => {
    for (const status of ['PICKED', 'NEW', 'CANCELLED'] as const)
      expect(canCancelVisit(record({ status }))).toBe(false);
  });

  it('never offers to cancel a cancellation’s mirror', () => {
    expect(
      canCancelVisit(record({ status: 'VERIFIED', isCancellation: true }))
    ).toBe(false);
  });
});

describe('afterCancelRead (spec/prescriptions rules › a dispensed visit)', () => {
  // OMS-REG-DIS-12.297: the reply was lost, but the cancel went through.
  it('says a record that now reads cancelled was cancelled', () => {
    expect(
      afterCancelRead({ kind: 'read', record: record({ status: 'CANCELLED' }) })
    ).toBe('cancelled');
  });

  // OMS-REG-DIS-12.283
  it('says nothing changed only when the record still reads finished', () => {
    expect(
      afterCancelRead({ kind: 'read', record: record({ status: 'VERIFIED' }) })
    ).toBe('not-cancelled');
  });

  // OMS-REG-DIS-12.297
  it('can’t tell when the record can’t be read', () => {
    expect(afterCancelRead(undefined)).toBe('unknown');
    expect(afterCancelRead({ kind: 'gone' })).toBe('unknown');
  });
});
