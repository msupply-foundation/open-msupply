// Display-settings logic (spec/settings/rules.md § Display settings), pure so
// the theme/logo asymmetry is unit-testable:
//  - theme saves gate on a shallow client-side JSON parse
//    (OMS-REG-SET-01.13); the logo has NO content validation at all
//    (OMS-REG-SET-01.18).
//  - toggling OFF clears immediately with no Save step (OMS-REG-SET-01.17);
//    toggling ON requires an explicit Save.

import type { UpdateDisplaySettingsVariables } from './displaySettings.generated';

export type ThemeParseResult = { ok: true } | { ok: false; message: string };

// The only validation is client-side and shallow: parseable JSON or refuse
// with the JSON error. Nothing checks the parsed shape is a usable theme
// (rules § Display settings, ⚠️ VERIFY carried in the spec).
export const parseThemeJson = (text: string): ThemeParseResult => {
  try {
    JSON.parse(text);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
};

// One field per call — the two rows save independently (contract § Display
// settings). Clearing sends the field as an empty string.
export const themeSaveInput = (
  text: string
): UpdateDisplaySettingsVariables['input'] => ({ customTheme: text });

export const themeClearInput = (): UpdateDisplaySettingsVariables['input'] => ({
  customTheme: '',
});

export const logoSaveInput = (
  text: string
): UpdateDisplaySettingsVariables['input'] => ({ customLogo: text });

export const logoClearInput = (): UpdateDisplaySettingsVariables['input'] => ({
  customLogo: '',
});
