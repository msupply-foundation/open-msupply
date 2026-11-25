import { describe, expect, it, vi } from 'vitest';

// The plugin half of "is this a place" is its own unit; here the registry half
// and the walk are under test, so no plugin pages are active.
vi.mock('../plugins/pluginPages', () => ({ activePages: () => [] }));

import { isRegistryPlace, placeAbove } from './placeAbove';

const up = (path: string) => placeAbove(path, isRegistryPlace);

describe('navigate-up without a breadcrumb parent (spec/keyboard KB-X5)', () => {
  it('goes Home from a list — its section is a heading, not a place (OMS-REG-KBD-02.42)', () => {
    expect(up('inventory/stocktakes')).toBe('');
    expect(up('inventory/locations')).toBe('');
    expect(up('distribution/outbound-shipment')).toBe('');
    expect(up('catalogue/items')).toBe('');
  });

  it('goes from a detail to its list while the trail has no parent link (OMS-REG-KBD-02.6)', () => {
    expect(up('inventory/stocktakes/some-id')).toBe('inventory/stocktakes');
  });

  it('passes over path segments that are no screen', () => {
    // `…/patient-id/vaccination-card` is no route; its owner list is the
    // nearest place above a card whose trail has not loaded.
    expect(
      up('dispensary/patients/patient-id/vaccination-card/enrolment-id')
    ).toBe('dispensary/patients');
  });

  it('goes from a top-level destination’s sub-screen to that destination', () => {
    expect(up('settings/records')).toBe('settings');
  });

  it('stays at Home from Home and from a top-level destination', () => {
    expect(up('')).toBe('');
    expect(up('settings')).toBe('');
  });
});

describe('placeAbove', () => {
  it('returns the nearest accepted ancestor, never the path itself', () => {
    const places = new Set(['a', 'a/b']);
    expect(placeAbove('a/b/c/d', p => places.has(p))).toBe('a/b');
    expect(placeAbove('a/b', p => places.has(p))).toBe('a');
  });

  it('falls back to the root when no ancestor is a place', () => {
    expect(placeAbove('x/y/z', () => false)).toBe('');
  });
});

describe('sections are not places (spec/navigation § sections are headings)', () => {
  it('rejects every section prefix and accepts its children', () => {
    expect(isRegistryPlace('inventory')).toBe(false);
    expect(isRegistryPlace('replenishment')).toBe(false);
    expect(isRegistryPlace('inventory/stocktakes')).toBe(true);
  });
});
