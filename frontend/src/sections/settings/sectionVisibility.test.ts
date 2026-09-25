import { describe, expect, it } from 'vitest';
import {
  showBarcodeScannerRows,
  showPrintViaUsbRow,
  showThemeAndLogoRows,
  visibleSections,
} from './sectionVisibility';

const nonAdmin = { serverAdmin: false, centralServer: false };
const adminRemote = { serverAdmin: true, centralServer: false };
const adminCentral = { serverAdmin: true, centralServer: true };
const nonAdminCentral = { serverAdmin: false, centralServer: true };

// OMS-REG-SET-01.14, -02.11, -03.14, -05.20, -05.23 — Section visibility by
// permission: a signed-in non-Server-Admin sees Display settings (language
// only) and the label-printer half of Devices; Synchronisation, Support, the
// barcode-scanner half, and Configuration are not shown.
describe('section visibility by permission (SET-01.14, -02.11, -03.14, -05.20, -05.23)', () => {
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

// OMS-REG-SET-05.24 — Configuration requires central server, not just Server
// Admin: neither alone is enough.
describe('Configuration requires central server AND Server Admin (SET-05.24)', () => {
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

// OMS-REG-SET-05.23 — the barcode-scanner half of Devices is Server-Admin-only,
// strictly stricter than the label printer beside it (which the visibility test
// above shows to everyone via the Devices section — SET-05.20's visibility
// half).
describe('barcode-scanner rows are Server-Admin-only (SET-05.23)', () => {
  it('hides the scanner rows from a non-Server-Admin while Devices stays visible', () => {
    expect(visibleSections(nonAdmin)).toContain('devices');
    expect(showBarcodeScannerRows(nonAdmin)).toBe(false);
  });

  it('shows the scanner rows to a Server Admin', () => {
    expect(showBarcodeScannerRows(adminRemote)).toBe(true);
  });
});

// OMS-REG-SET-05.41 — the Print via USB row is absent on Android, while the
// network address, port and label-size fields remain. Platform-gated, not
// permission-gated, so a non-admin still sees Devices itself.
describe('the Print via USB row is desktop-only (SET-05.41)', () => {
  it('hides the row on Android while Devices stays visible', () => {
    expect(visibleSections(nonAdmin)).toContain('devices');
    expect(showPrintViaUsbRow(true)).toBe(false);
  });

  it('shows the row everywhere else', () => {
    expect(showPrintViaUsbRow(false)).toBe(true);
  });
});
