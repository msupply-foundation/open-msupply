import { describe, expect, it } from 'vitest';
import { roleFilter } from './nameResource';

// The shared party picker's role → `names` filter (spec/outbound-shipments
// AC-C1/AC-C5). The customer role carries the facility/store type restriction:
// patients hold a per-store isCustomer join and would otherwise be offered and
// then rejected on create (issue #657).

describe('roleFilter (AC-C5 — only creatable parties are offered)', () => {
  it('narrows the customer role to facility/store parties', () => {
    expect(roleFilter('customer')).toEqual({
      isCustomer: true,
      type: { equalAny: ['FACILITY', 'STORE'] },
    });
  });

  it('narrows the other roles to their flag alone', () => {
    expect(roleFilter('supplier')).toEqual({ isSupplier: true });
    expect(roleFilter('donor')).toEqual({ isDonor: true });
    expect(roleFilter('manufacturer')).toEqual({ isManufacturer: true });
  });
});
