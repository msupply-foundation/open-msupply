// Section/row visibility (spec/settings/rules.md § Access) — pure, so the
// non-uniform gating is unit-testable (OMS-REG-SET-01.14, -02.11, -03.14,
// -05.20, -05.23, -05.24).
// Visibility is a UX convenience, never the only guard: every write is
// independently checked server-side (rules § Access), and Configuration's
// actions carry finer permissions past this section-level gate
// (OMS-REG-SET-05.24, -05.25).

export type SettingsAccess = {
  serverAdmin: boolean;
  centralServer: boolean;
};

export type SettingsSectionKey =
  | 'display-settings'
  | 'synchronisation'
  | 'support'
  | 'devices'
  | 'configuration';

// Fixed order (spec/settings/ui-surface.md § Layout); hidden sections are
// omitted, not shown disabled.
export const visibleSections = (
  access: SettingsAccess
): SettingsSectionKey[] => {
  const sections: SettingsSectionKey[] = ['display-settings'];
  if (access.serverAdmin) sections.push('synchronisation', 'support');
  sections.push('devices');
  // Configuration needs BOTH: central server and Server Admin — neither alone
  // is enough (OMS-REG-SET-05.24).
  if (access.centralServer && access.serverAdmin)
    sections.push('configuration');
  return sections;
};

// Within Display settings: Language is always usable; the Custom theme and
// Custom logo rows are Server Admin only (rules § Display settings).
export const showThemeAndLogoRows = (access: SettingsAccess): boolean =>
  access.serverAdmin;

// Within Devices: the label-printer half is for any signed-in user
// (OMS-REG-SET-05.20 — deliberately NO Server Admin requirement); the
// barcode-scanner half is Server Admin only, strictly stricter
// (OMS-REG-SET-05.23).
export const showBarcodeScannerRows = (access: SettingsAccess): boolean =>
  access.serverAdmin;

// Also within Devices, and gated on the platform rather than permission: the
// Print via USB row is absent on Android (OMS-REG-SET-05.41). The USB route
// needs a local print service on the device, which that platform has no way to
// run, so offering the choice there could only ever fail.
export const showPrintViaUsbRow = (isAndroidDevice: boolean): boolean =>
  !isAndroidDevice;
