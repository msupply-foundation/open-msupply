import { describe, expect, it } from 'vitest';
import { pageTitle, screenTitleKey } from './documentTitle';
import { setDictionaries, setLocale } from './intl/intl';
import commonEn from './intl/locales/en/common.json';
import commonFr from './intl/locales/fr/common.json';

// The tab title is derived, so these cases are about what a URL is called
// (spec/chrome § document title; OMS-REG-FTR-02.27/.28).
setDictionaries({ en: commonEn, fr: commonFr });

describe('screenTitleKey', () => {
  it('names the destination the path points at', () => {
    expect(screenTitleKey('inventory/stocktakes')).toBe('stocktakes');
  });

  it('names a section landing page', () => {
    expect(screenTitleKey('inventory')).toBe('inventory');
  });

  it('names the store root Home', () => {
    // The store root resolves through the `dashboard` ROUTE, and the registry
    // labels that destination Home (CK-1.7) — the tab title follows the label,
    // not the path.
    expect(screenTitleKey('')).toBe('home');
  });

  it('keeps a record screen on the list it was reached from', () => {
    // The bug this guards: matching destinations exactly left every detail
    // screen titled "Not found".
    expect(screenTitleKey('inventory/stocktakes/abc123')).toBe('stocktakes');
    expect(screenTitleKey('distribution/outbound-shipment/7/lines')).toBe(
      'outbound-shipment'
    );
  });

  it('names nothing for a path that is no destination', () => {
    expect(screenTitleKey('nowhere/at/all')).toBeUndefined();
  });
});

describe('pageTitle', () => {
  it('is the app name alone for a screen with no name of its own', () => {
    setLocale('en');
    expect(pageTitle(screenTitleKey('nowhere/at/all'))).toBe('Open mSupply');
  });

  it('puts the screen before the app name', () => {
    setLocale('en');
    expect(pageTitle(screenTitleKey('distribution/customer-requisition'))).toBe(
      'Requisitions | Open mSupply'
    );
  });

  it('translates the screen name with the active locale', () => {
    setLocale('fr');
    expect(pageTitle(screenTitleKey('inventory/stocktakes'))).toBe(
      `${commonFr['stocktakes']} | Open mSupply`
    );
    setLocale('en');
  });
});
