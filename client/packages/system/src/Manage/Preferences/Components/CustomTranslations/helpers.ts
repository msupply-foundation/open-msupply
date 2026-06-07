import {
  DEFAULT_TRANSLATIONS_NAMESPACE,
  LocaleKey,
  TypedTFunction,
} from '@common/intl';
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
  t: TypedTFunction<LocaleKey>,
  // Keys without a default translation (e.g. report/plugin keys not in the
  // bundle) are hidden by default. Pass true to keep them so they aren't
  // dropped on save.
  options?: { includeUnknownKeys?: boolean }
): Translation[] => {
  return Object.entries(translations)
    .filter(
      ([key]) =>
        options?.includeUnknownKeys ||
        t(key as LocaleKey, {
          ns: DEFAULT_TRANSLATIONS_NAMESPACE,
        }) !== ''
    )
    .map(([key, custom]) => ({
      id: key,
      key,
      default: t(key as LocaleKey, {
        ns: DEFAULT_TRANSLATIONS_NAMESPACE,
      }),
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

export type ImportMode = 'replace' | 'keep-existing' | 'overwrite';

export const mergeTranslations = (
  existing: Translation[],
  imported: Translation[],
  mode: ImportMode
): Translation[] => {
  switch (mode) {
    case 'replace':
      return imported;
    case 'keep-existing': {
      const existingKeys = new Set(existing.map(tr => tr.key));
      const newOnly = imported.filter(tr => !existingKeys.has(tr.key));
      return [...existing, ...newOnly];
    }
    case 'overwrite': {
      const importedByKey = new Map(imported.map(tr => [tr.key, tr]));
      const merged = existing.map(tr =>
        importedByKey.has(tr.key)
          ? { ...tr, custom: importedByKey.get(tr.key)!.custom }
          : tr
      );
      const existingKeys = new Set(existing.map(tr => tr.key));
      const brandNew = imported.filter(tr => !existingKeys.has(tr.key));
      return [...merged, ...brandNew];
    }
  }
};

/**
 * v2 custom translations, broken down by language and namespace:
 * `language -> namespace -> key -> value`
 */
export type CustomTranslationsV2 = Record<
  string,
  Record<string, Record<string, string>>
>;

export const DEFAULT_CUSTOM_TRANSLATION_NAMESPACE = 'common';

/** Namespaces available in the editor (e.g. core app vs reports/plugins). */
export const CUSTOM_TRANSLATION_NAMESPACES = ['common', 'report'] as const;

/**
 * Detect whether parsed JSON is the nested v2 structure
 * (`language -> namespace -> key -> value`) rather than a flat
 * (`key -> value`) map. A flat map has string values, the nested structure has
 * object values all the way down.
 */
export const isNestedTranslations = (
  parsed: unknown
): parsed is CustomTranslationsV2 => {
  if (typeof parsed !== 'object' || parsed === null) return false;
  return Object.values(parsed).every(
    langValue =>
      typeof langValue === 'object' &&
      langValue !== null &&
      Object.values(langValue).every(
        nsValue =>
          typeof nsValue === 'object' &&
          nsValue !== null &&
          Object.values(nsValue).every(v => typeof v === 'string')
      )
  );
};

/**
 * Merge nested v2 translations honouring the import mode, per
 * language + namespace + key.
 */
export const mergeNestedTranslations = (
  existing: CustomTranslationsV2,
  imported: CustomTranslationsV2,
  mode: ImportMode
): CustomTranslationsV2 => {
  if (mode === 'replace') return imported;

  const result: CustomTranslationsV2 = structuredClone(existing);
  for (const [lang, namespaces] of Object.entries(imported)) {
    const langResult = (result[lang] ??= {});
    for (const [ns, translations] of Object.entries(namespaces)) {
      const nsResult = (langResult[ns] ??= {});
      for (const [key, value] of Object.entries(translations)) {
        const exists = nsResult[key] !== undefined;
        if (mode === 'keep-existing' && exists) continue;
        nsResult[key] = value; // overwrite
      }
    }
  }
  return result;
};

/** Set a language+namespace's flat translations within the nested structure. */
export const setNamespaceTranslations = (
  nested: CustomTranslationsV2,
  language: string,
  namespace: string,
  translations: Record<string, string>
): CustomTranslationsV2 => {
  const result = structuredClone(nested);
  const langResult = (result[language] ??= {});
  if (Object.keys(translations).length === 0) {
    delete langResult[namespace];
    if (Object.keys(langResult).length === 0) delete result[language];
  } else {
    langResult[namespace] = translations;
  }
  return result;
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
