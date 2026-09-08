import { describe, expect, it } from 'vitest';
import {
  ASSET_STATUSES,
  CCE_CLASS_ID,
  COLD_ROOM_CATEGORY_ID,
  isColdRoom,
  isNonCatalogue,
  statusLabelKey,
  statusTone,
  type AssetStatus,
} from './equipment';

describe('the register is pinned to one class', () => {
  it('names the cold-chain-equipment class the whole vertical filters by', () => {
    // A migration constant, not a lookup (contract › what this register holds).
    expect(CCE_CLASS_ID).toBe('fad280b6-8384-41af-84cf-c7b6b4526ef0');
  });
});

describe('AC-M1 / AC-M2 only a cold room records a temperature mapping', () => {
  it('recognises the cold-rooms category', () => {
    expect(isColdRoom(COLD_ROOM_CATEGORY_ID)).toBe(true);
  });

  it('does not recognise any other category, or none at all', () => {
    expect(isColdRoom('02cbea92-d5bf-4832-863b-c04e093a7760')).toBe(false);
    expect(isColdRoom(null)).toBe(false);
    expect(isColdRoom(undefined)).toBe(false);
  });
});

describe('the six functional statuses', () => {
  it('offers exactly the six the schema declares', () => {
    expect([...ASSET_STATUSES].sort()).toEqual(
      [
        'DECOMMISSIONED',
        'FUNCTIONING',
        'FUNCTIONING_BUT_NEEDS_ATTENTION',
        'NOT_FUNCTIONING',
        'NOT_IN_USE',
        'UNSERVICEABLE',
      ].sort()
    );
  });

  it('labels and tones every one of them — no status falls through', () => {
    for (const status of ASSET_STATUSES) {
      expect(statusLabelKey(status)).toMatch(/^status\./);
      expect(statusTone(status)).toBeTruthy();
    }
  });

  it('tones the working / needs-attention / broken trio distinctly', () => {
    expect(statusTone('FUNCTIONING')).toBe('success');
    expect(statusTone('FUNCTIONING_BUT_NEEDS_ATTENTION')).toBe('warning');
    expect(statusTone('NOT_FUNCTIONING')).toBe('error');
  });

  it('reads the status names off the catalog, not from enum casing', () => {
    // "Not Functioning" carries a capital F in the catalog; the label key is
    // what carries it, not a client-side transformation of the wire value.
    expect(statusLabelKey('NOT_FUNCTIONING' as AssetStatus)).toBe(
      'status.not-functioning'
    );
  });
});

describe('AC-L10 catalogue vs non-catalogue', () => {
  it('reads an asset with no catalogue item as non-catalogue', () => {
    expect(isNonCatalogue({ catalogueItemId: null })).toBe(true);
    expect(isNonCatalogue({})).toBe(true);
  });

  it('reads one with a catalogue item as a catalogue asset', () => {
    expect(isNonCatalogue({ catalogueItemId: 'abc' })).toBe(false);
  });
});
