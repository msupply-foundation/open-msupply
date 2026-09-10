import { describe, expect, it } from 'vitest';
import { dispensingHref, storeHomeHref } from './legacyPaths';

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

  // A list's filter, sort and page live in `?query=…` (list/urlQueryState), so
  // dropping the query answers a link to a filtered list with the whole list.
  it("keeps a filtered list's query state", () => {
    expect(
      dispensingHref('store-1', undefined, {
        search: '?query=%7B%22first%22%3A20%7D',
      })
    ).toBe('/store-1/dispensary/dispensing?query=%7B%22first%22%3A20%7D');
  });

  it('keeps the query state alongside a detail id', () => {
    expect(dispensingHref('store-1', 'inv-1', { search: '?tab=log' })).toBe(
      '/store-1/dispensary/dispensing/inv-1?tab=log'
    );
  });

  it('keeps a fragment, and keeps it after the query', () => {
    expect(
      dispensingHref('store-1', undefined, { search: '?tab=log', hash: '#top' })
    ).toBe('/store-1/dispensary/dispensing?tab=log#top');
  });

  it('adds no separator when the address carried neither', () => {
    expect(dispensingHref('store-1', 'inv-1', { search: '', hash: '' })).toBe(
      '/store-1/dispensary/dispensing/inv-1'
    );
  });
});

// Home's pre-move address (`/{storeId}/dashboard`), answered with the store root.
describe('storeHomeHref', () => {
  it('sends the legacy dashboard address to the store root', () => {
    expect(storeHomeHref('store-1')).toBe('/store-1');
  });

  it('carries the query and fragment across', () => {
    expect(
      storeHomeHref('store-1', { search: '?tab=stock', hash: '#top' })
    ).toBe('/store-1?tab=stock#top');
  });
});
