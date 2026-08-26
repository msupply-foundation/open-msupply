import { describe, expect, it } from 'vitest';
import { visibleTabs } from './itemDetailTabs';

const values = (centralServer: boolean) =>
  visibleTabs(centralServer).map(tab => tab.value);

// OMS-REG-CAT-05.1/.2 — the Variants tab is present on the central server and
// absent everywhere else; every other tab is unaffected by server role.
describe('item detail tab visibility (CAT-05.1/.2)', () => {
  it('includes variants, in order, on the central server', () => {
    expect(values(true)).toEqual([
      'general',
      'store',
      'master-lists',
      'ledger',
      'ancillary',
      'custom-fields',
      'variants',
      'log',
    ]);
  });

  it('omits variants everywhere else', () => {
    expect(values(false)).toEqual([
      'general',
      'store',
      'master-lists',
      'ledger',
      'ancillary',
      'custom-fields',
      'log',
    ]);
  });
});
