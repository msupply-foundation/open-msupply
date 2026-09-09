import { describe, expect, it } from 'vitest';
import { dispensingHref } from './legacyPaths';

// The dispensing vertical's pre-#551 address, answered with its current one.
describe('dispensingHref', () => {
  it('sends the bare legacy segment to the list', () => {
    expect(dispensingHref('store-1')).toBe('/store-1/dispensary/dispensing');
  });

  it('carries a detail id across, so a link keeps its record', () => {
    expect(dispensingHref('store-1', 'inv-1')).toBe(
      '/store-1/dispensary/dispensing/inv-1'
    );
  });

  it('carries a deeper tail across whole (invoice + line)', () => {
    expect(dispensingHref('store-1', 'inv-1/item-2')).toBe(
      '/store-1/dispensary/dispensing/inv-1/item-2'
    );
  });

  it('treats an empty tail as no tail, not a trailing slash', () => {
    expect(dispensingHref('store-1', '')).toBe(
      '/store-1/dispensary/dispensing'
    );
  });
});
