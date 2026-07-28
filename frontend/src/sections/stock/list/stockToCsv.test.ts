import { describe, it, expect } from 'vitest';
import { stockToCsv } from './stockToCsv';
import type { StockLineRowFragment } from './stock.generated';

// Anchors: spec/stock/cases/OMS-REG-INV-02.
//   .8 — the export produces a CSV containing the stock data
// Covers the CSV builder's column set + the computed units / value columns +
// the blank-supplier fallback. (The export action's all-pages fetch is
// exercised in the e2e/ suites.)

const line = {
  id: 'sl1',
  itemId: 'item1',
  itemName: 'Amoxicillin 500mg',
  batch: 'B-1',
  expiryDate: null,
  manufactureDate: null,
  packSize: 100,
  totalNumberOfPacks: 12,
  availableNumberOfPacks: 10,
  costPricePerPack: 2,
  sellPricePerPack: 3,
  onHold: false,
  supplierName: null, // blank → the fixed "Inventory adjustment" text
  locationName: 'Shelf A',
  volumePerPack: 0,
  totalVolume: 0,
  location: { id: 'loc1', code: 'A1', name: 'Shelf A' },
  vvmStatus: null,
  item: {
    id: 'item1',
    code: 'AMOX500',
    unitName: 'Tablet',
    isVaccine: false,
    doses: 0,
    masterLists: [
      { id: 'ml1', name: 'Essential' },
      { id: 'ml2', name: 'Cold chain' },
    ],
  },
  manufacturer: null,
} as unknown as StockLineRowFragment;

describe('OMS-REG-INV-02.8 — stockToCsv', () => {
  const csv = stockToCsv([line]);
  const rows = csv.trim().split('\r\n');

  it('produces a header row + one row per line', () => {
    expect(rows).toHaveLength(2);
  });
  it('has the full spec/stock S1 column set (19 columns)', () => {
    expect(rows[0].split(',')).toHaveLength(19);
  });
  it('derives units (packs × pack size) and total value (packs × cost)', () => {
    // SOH units = 12 × 100 = 1200; available = 10 × 100 = 1000; total = 12 × 2 = 24.
    expect(csv).toContain('1200');
    expect(csv).toContain('1000');
    expect(csv).toContain('24');
  });
  it("joins the item's master lists", () => {
    expect(csv).toContain('Essential; Cold chain');
  });
  it('renders the inventory-adjustment fallback for a blank supplier', () => {
    expect(csv).toContain('label.inventory-adjustment');
  });
});
