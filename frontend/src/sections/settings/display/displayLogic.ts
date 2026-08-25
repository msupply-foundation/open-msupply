// Display-settings logic (spec/settings/rules.md § Display settings), pure so
// the theme/logo asymmetry is unit-testable:
//  - theme saves gate on compiling the document (OMS-REG-SET-01.13); the logo
//    has NO content validation at all (OMS-REG-SET-01.18).
//  - toggling OFF clears immediately with no Save step (OMS-REG-SET-01.17);
//    toggling ON requires an explicit Save.

import { compileTheme } from '../../../ui/branding/customTheme';
import type { UpdateDisplaySettingsVariables } from '../../../api/displaySettings.generated';

export type ThemeCheck = {
  /** Whether the document can be applied at all — the gate on Save. */
  ok: boolean;
  /** Why it could not be applied. Non-empty exactly when `ok` is false. */
  errors: string[];
  /** What was ignored or is worth knowing; never blocks the save. */
  warnings: string[];
};

/*
 * The save gate. Shape-aware, unlike the reference app's bare JSON.parse
 * the document must parse AND leave at least one
 * recognised setting, or saving it would store something that changes
 * nothing. Everything else — unknown keys, unreadable colours, contrast
 * failures — is a warning: we apply what we understood and say what we
 * skipped. Format: src/ui/docs/CUSTOM_THEMES.md.
 */
export const checkTheme = (text: string): ThemeCheck => {
  const { errors, warnings } = compileTheme(text);
  return {
    ok: errors.length === 0,
    errors: errors.map(problem => describe(problem.path, problem.message)),
    warnings: warnings.map(problem => describe(problem.path, problem.message)),
  };
};

const describe = (path: string, message: string): string =>
  path ? `${path}: ${message}` : message;

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
