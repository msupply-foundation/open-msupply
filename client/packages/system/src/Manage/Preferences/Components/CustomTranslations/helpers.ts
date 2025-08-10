import { LocaleKey, TypedTFunction } from '@common/intl';
import { TranslationOption } from './TranslationSearchInput';

export interface Translation {
  id: string;
  key: string;
  default: string;
  custom: string;
  isNew?: boolean;
  isInvalid?: boolean;
}

export const mapTranslationsToArray = (
  translations: Record<string, string>,
  t: TypedTFunction<LocaleKey>
): Translation[] => {
  return Object.entries(translations)
    .filter(([key]) => t(key as LocaleKey) !== '')
    .map(([key, custom]) => ({
      id: key,
      key,
      default: t(key as LocaleKey),
      custom,
    }));
};

export const mapTranslationsToObject = (
  translations: Translation[]
): Record<string, string> => {
  const asObject = translations
    // Sort alphabetically by key on save
    .sort((a, b) => a.key.localeCompare(b.key))
    .reduce<Record<string, string>>((acc, tr) => {
      // Remove entries where no custom translation is set
      if (tr.custom === tr.default || tr.custom === '') return acc;
      acc[tr.key] = tr.custom;
      return acc;
    }, {});
  return asObject;
};

export const findMatchingPluralisationKeys = (
  option: TranslationOption,
  allOptions: TranslationOption[]
): TranslationOption[] => {
  const underscoreIndex = option.key.indexOf('_');
  if (underscoreIndex > 0) {
    const prefix = option.key.substring(0, underscoreIndex);
    // Find all options with keys starting with the same prefix
    const matchingOptions = allOptions.filter(o =>
      o.key.startsWith(prefix + '_')
    );
    return matchingOptions;
  }
  return [option];
};

const validVariable = /{{\s*[^{}]+\s*}}/g;
export const hasInvalidBrackets = (str?: string): boolean => {
  if (!str) return false;
  // Remove all valid {{...}} pairs
  const cleaned = str.replace(validVariable, '');
  // If any unmatched brackets remain, it's invalid
  return /[{}]/.test(cleaned);
};

// Extract values inside {{}} for both default and custom strings
export const extractVariables = (str?: string): string[] => {
  if (!str) return [];
  // If the string has invalid brackets, don't extract any variables
  if (hasInvalidBrackets(str)) return [];
  // Only match non-nested, non-empty variables inside {{ }}
  const matches = str.match(validVariable) || [];
  // Filter out empty or whitespace-only variable names
  return matches.map(m => m.slice(2, -2).trim()).filter(v => v.length > 0);
};

export const checkInvalidVariables = (input: Partial<Translation>): boolean => {
  // Check for invalid bracket pairs first
  if (hasInvalidBrackets(input.custom)) return true;
  const defaultVariables = extractVariables(input.default);
  const customVariables = extractVariables(input.custom);
  // All custom variables must exist in default variables, but custom can use a default var multiple times
  for (const v of customVariables) {
    if (!defaultVariables.includes(v)) return true;
  }
  // If customVariables contains more unique variables than defaultVariables, it's invalid
  if (new Set(customVariables).size > new Set(defaultVariables).size)
    return true;
  return false;
};
