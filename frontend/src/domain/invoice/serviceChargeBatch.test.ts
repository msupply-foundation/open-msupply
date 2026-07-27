import { describe, expect, it } from 'vitest';
import {
  chargeTotalAfterTax,
  splitServiceChargeBatch,
  type ServiceChargeDraft,
} from './serviceChargeBatch';

// The shared service-charges editor's save split (outbound S5 / inbound S6):
// which draft rows become inserts vs updates vs deletes, and the empty-note
// normalisation both verticals' wire inputs expect.

const draft = (over: Partial<ServiceChargeDraft>): ServiceChargeDraft => ({
  id: 'c1',
  isNew: false,
  deleted: false,
  itemId: 'svc',
  name: 'Freight',
  totalBeforeTax: 10,
  taxPercentage: 5,
  note: 'note',
  ...over,
});

describe('splitServiceChargeBatch', () => {
  it('routes new-kept → inserts, existing-kept → updates, existing-deleted → deletes', () => {
    const batch = splitServiceChargeBatch([
      draft({ id: 'new', isNew: true }),
      draft({ id: 'kept' }),
      draft({ id: 'gone', deleted: true }),
    ]);
    expect(batch.inserts.map(w => w.id)).toEqual(['new']);
    expect(batch.updates.map(w => w.id)).toEqual(['kept']);
    expect(batch.deletes).toEqual([{ id: 'gone' }]);
  });

  it('a new row deleted before saving is sent nowhere', () => {
    const batch = splitServiceChargeBatch([
      draft({ id: 'ghost', isNew: true, deleted: true }),
    ]);
    expect(batch).toEqual({ inserts: [], updates: [], deletes: [] });
  });

  it('an empty note goes on the wire as null, a blank tax stays null', () => {
    const [insert] = splitServiceChargeBatch([
      draft({ isNew: true, note: '', taxPercentage: null }),
    ]).inserts;
    expect(insert?.note).toBeNull();
    expect(insert?.taxPercentage).toBeNull();
  });
});

describe('chargeTotalAfterTax', () => {
  it('applies the rate; a null rate means no tax', () => {
    expect(
      chargeTotalAfterTax({ totalBeforeTax: 100, taxPercentage: 15 })
    ).toBeCloseTo(115);
    expect(
      chargeTotalAfterTax({ totalBeforeTax: 100, taxPercentage: null })
    ).toBe(100);
  });
});
