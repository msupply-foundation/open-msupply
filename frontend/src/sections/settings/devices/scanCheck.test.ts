import { describe, expect, it, vi } from 'vitest';
import { readText } from '@/domain/barcode';
import type { ItemOption } from '@/domain/item';
import {
  findItem,
  itemMatchOf,
  scanCheckOf,
  type ScanCheckLookups,
} from './scanCheck';

// The Test scanner screen's plain test section (spec/settings/ui-surface.md §
// S2; cases OMS-REG-SET-05.64–.66).

const GS = String.fromCharCode(29);
const today = new Date('2026-09-25');

const readable = (text: string) => {
  const read = readText(text);
  if (read.kind === 'unreadable') throw new Error('unexpected');
  return read;
};

// GTIN, batch, expiry, then quantity — the six a stock screen reads, bar two.
const fullLabel = readable(
  `0109506000134352` + `10ABC123${GS}` + `17270630` + `3024`
);
const batchOnly = readable(`10ABC123${GS}17270630`);

const paracetamol: ItemOption = {
  id: 'item-1',
  code: 'PARA500',
  name: 'Paracetamol 500mg',
  unitName: null,
  availableUnits: 0,
  isService: false,
  isVaccine: false,
  doses: 1,
  defaultPackSize: 1,
  defaultSellPricePerPack: 0,
  volumePerPack: 0,
};

const barcode = {
  __typename: 'BarcodeMatchNode' as const,
  id: 'b1',
  value: 'gtin:09506000134352',
  barcode: '09506000134352',
  itemId: 'item-1',
  packSize: null,
  status: 'PROPOSED' as const,
};

describe('what the label says (SET-05.66)', () => {
  it('shows batch, expiry and quantity read from a label that carries them', () => {
    expect(scanCheckOf(fullLabel, 'web-hid', today)).toMatchObject({
      code: '09506000134352',
      batch: 'ABC123',
      expiryDate: '2027-06-30',
      quantity: 24,
      source: 'web-hid',
      item: { kind: 'checking' },
    });
  });

  it('shows none of them for a plain barcode', () => {
    const check = scanCheckOf(readable('ABC-42'), 'keyboard-wedge', today);
    expect(check.batch).toBeUndefined();
    expect(check.expiryDate).toBeUndefined();
    expect(check.quantity).toBeUndefined();
    expect(check.code).toBe('ABC-42');
  });
});

describe('which item it belongs to (SET-05.65)', () => {
  it('a label with no item number never asks, and says it identifies no item', async () => {
    expect(scanCheckOf(batchOnly, 'camera', today).item).toEqual({
      kind: 'no-code',
    });
    const lookups: ScanCheckLookups = {
      lookUpBarcode: vi.fn(async () => ({ kind: 'no-code' as const })),
      lookUpItemById: vi.fn(),
    };
    expect(await findItem('store', batchOnly, lookups)).toEqual({
      kind: 'no-code',
    });
    expect(lookups.lookUpItemById).not.toHaveBeenCalled();
  });

  it('a known code names the item, looked up as receiving does', async () => {
    const lookups: ScanCheckLookups = {
      lookUpBarcode: vi.fn(async () => ({ kind: 'known' as const, barcode })),
      lookUpItemById: vi.fn(async () => ({
        kind: 'found' as const,
        item: paracetamol,
      })),
    };
    expect(await findItem('store-1', fullLabel, lookups)).toEqual({
      kind: 'item',
      name: 'Paracetamol 500mg',
      code: 'PARA500',
    });
    expect(lookups.lookUpBarcode).toHaveBeenCalledWith(
      'store-1',
      '09506000134352'
    );
    expect(lookups.lookUpItemById).toHaveBeenCalledWith('store-1', 'item-1');
  });

  it('an unknown code is "not linked yet", not a failure', () => {
    expect(itemMatchOf({ kind: 'unknown' })).toEqual({ kind: 'not-linked' });
  });

  it('a known code whose item this store cannot see says so', () => {
    expect(
      itemMatchOf({ kind: 'known', barcode }, { kind: 'missing' })
    ).toEqual({
      kind: 'not-in-store',
    });
  });

  it('a failed request at either step is a failed check', () => {
    expect(itemMatchOf({ kind: 'failed' })).toEqual({ kind: 'failed' });
    expect(itemMatchOf({ kind: 'known', barcode }, { kind: 'failed' })).toEqual(
      {
        kind: 'failed',
      }
    );
  });
});
