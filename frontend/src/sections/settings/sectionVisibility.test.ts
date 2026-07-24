import { describe, expect, it } from 'vitest';
import {
  showBarcodeScannerRows,
  showThemeAndLogoRows,
  visibleSections,
} from './sectionVisibility';

const nonAdmin = { serverAdmin: false, centralServer: false };
const adminRemote = { serverAdmin: true, centralServer: false };
const adminCentral = { serverAdmin: true, centralServer: true };
const nonAdminCentral = { serverAdmin: false, centralServer: true };

// AC-A1 — Section visibility by permission: a signed-in non-Server-Admin sees
// Display settings (language only) and the label-printer half of Devices;
// Synchronisation, Support, the barcode-scanner half, and Configuration are
// not shown.
describe('AC-A1 — section visibility by permission', () => {
  it('shows only Display settings and Devices to a non-Server-Admin', () => {
    expect(visibleSections(nonAdmin)).toEqual(['display-settings', 'devices']);
  });

  it('hides the theme/logo rows from a non-Server-Admin (language only)', () => {
    expect(showThemeAndLogoRows(nonAdmin)).toBe(false);
    expect(showThemeAndLogoRows(adminRemote)).toBe(true);
  });

  it('shows Synchronisation and Support to a Server Admin', () => {
    expect(visibleSections(adminRemote)).toEqual([
      'display-settings',
      'synchronisation',
      'support',
      'devices',
    ]);
  });

  it('keeps the fixed section order with Configuration last', () => {
    expect(visibleSections(adminCentral)).toEqual([
      'display-settings',
      'synchronisation',
      'support',
      'devices',
      'configuration',
    ]);
  });
});

// AC-A2 — Configuration requires central server, not just Server Admin:
// neither alone is enough.
describe('AC-A2 — Configuration requires central server AND Server Admin', () => {
  it('is hidden from a Server Admin on a non-central server', () => {
    expect(visibleSections(adminRemote)).not.toContain('configuration');
  });

  it('is hidden from a non-admin on the central server', () => {
    expect(visibleSections(nonAdminCentral)).not.toContain('configuration');
  });

  it('is shown to a Server Admin on the central server', () => {
    expect(visibleSections(adminCentral)).toContain('configuration');
  });
});

// AC-BS1 — the barcode-scanner half of Devices is Server-Admin-only, strictly
// stricter than the label printer beside it (which AC-A1 above shows to
// everyone via the Devices section itself — AC-LP1's visibility half).
describe('AC-BS1 — barcode-scanner rows are Server-Admin-only', () => {
  it('hides the scanner rows from a non-Server-Admin while Devices stays visible', () => {
    expect(visibleSections(nonAdmin)).toContain('devices');
    expect(showBarcodeScannerRows(nonAdmin)).toBe(false);
  });

  it('shows the scanner rows to a Server Admin', () => {
    expect(showBarcodeScannerRows(adminRemote)).toBe(true);
  });
});
