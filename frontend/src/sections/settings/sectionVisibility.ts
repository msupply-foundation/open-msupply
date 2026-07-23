// Section/row visibility (spec/settings/rules.md § Access) — pure, so the
// non-uniform gating is unit-testable (AC-A1, AC-A2, AC-LP1, AC-BS1).
// Visibility is a UX convenience, never the only guard: every write is
// independently checked server-side (AC-A3), and Configuration's actions carry
// finer permissions past this section-level gate (AC-A4).

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
  // is enough (AC-A2).
  if (access.centralServer && access.serverAdmin)
    sections.push('configuration');
  return sections;
};

// Within Display settings: Language is always usable; the Custom theme and
// Custom logo rows are Server Admin only (rules § Display settings).
export const showThemeAndLogoRows = (access: SettingsAccess): boolean =>
  access.serverAdmin;

// Within Devices: the label-printer half is for any signed-in user (AC-LP1 —
// deliberately NO Server Admin requirement); the barcode-scanner half is
// Server Admin only, strictly stricter (AC-BS1).
export const showBarcodeScannerRows = (access: SettingsAccess): boolean =>
  access.serverAdmin;
