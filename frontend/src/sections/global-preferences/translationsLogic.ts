// Pure logic for the custom-translations editor
// (spec/global-preferences/rules.md § The custom-translations editor): row
// mapping and pruning, variable validation, import/export and its three merge
// modes, and the namespace bookkeeping. No Solid, no fetching — the modal
// composes these.

/** The v2 store: `language → namespace → key → value`
 *  (contract § The custom-translations editor). */
export type CustomTranslationsV2 = Record<
  string,
  Record<string, Record<string, string>>
>;

/** One editor row. `isNew` marks a just-added row; `isInvalid` a row whose
 *  custom text fails variable validation. */
export interface TranslationRow {
  id: string;
  key: string;
  default: string;
  custom: string;
  isNew?: boolean;
  isInvalid?: boolean;
}

/** One addable key, with the default text it would seed. */
export interface TranslationOption {
  key: string;
  default: string;
}

export const DEFAULT_NAMESPACE = 'common';
/** The bundled namespaces, always offered (rules § The custom-translations
 *  editor). */
export const BASE_NAMESPACES = ['common', 'desktop'] as const;
/** The reserved pseudo-namespace viewing/editing the legacy v1 flat map. */
export const LEGACY_NAMESPACE = 'legacy';
/** The reserved key carrying the legacy map in JSON export/import — language
 *  codes never start with `_`, so it can't collide. */
export const LEGACY_V1_EXPORT_KEY = '_v1';

// ---------------------------------------------------------------------------
// Wire coercions (both stores arrive as untyped JSON)

export const asFlatMap = (value: unknown): Record<string, string> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>))
    if (typeof entry === 'string') out[key] = entry;
  return out;
};

/** Whether parsed JSON is the nested v2 shape (object values all the way
 *  down to string leaves) rather than a flat `key → value` map. */
export const isNestedTranslations = (
  parsed: unknown
): parsed is CustomTranslationsV2 => {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    return false;
  return Object.values(parsed).every(
    language =>
      typeof language === 'object' &&
      language !== null &&
      !Array.isArray(language) &&
      Object.values(language).every(
        namespace =>
          typeof namespace === 'object' &&
          namespace !== null &&
          !Array.isArray(namespace) &&
          Object.values(namespace).every(leaf => typeof leaf === 'string')
      )
  );
};

export const asV2 = (value: unknown): CustomTranslationsV2 =>
  isNestedTranslations(value) ? value : {};

// ---------------------------------------------------------------------------
// Rows (rules: key · default · custom · delete)

/** A stored map as editor rows, defaults resolved by the caller per
 *  namespace. Every stored key is kept — unknown keys included, so they
 *  aren't dropped on save. */
export const mapToRows = (
  translations: Record<string, string>,
  getDefault: (key: string) => string
): TranslationRow[] =>
  Object.entries(translations).map(([key, custom]) => ({
    id: key,
    key,
    default: getDefault(key),
    custom,
  }));

/*
 * Rows back to a namespace map: a row whose custom text is empty or equal to
 * its default is dropped rather than stored (OMS-REG-GPREF-01.19); keys sorted
 * for a stable stored order.
 */
export const rowsToNamespaceMap = (
  rows: TranslationRow[]
): Record<string, string> =>
  [...rows]
    .sort((a, b) => a.key.localeCompare(b.key))
    .reduce<Record<string, string>>((acc, row) => {
      if (row.custom === row.default || row.custom === '') return acc;
      acc[row.key] = row.custom;
      return acc;
    }, {});

/*
 * Rows back to the legacy flat map: only EMPTY rows are dropped — a value
 * equal to one language's default is kept, because the map is
 * language-agnostic (rules § The custom-translations editor).
 */
export const rowsToFlatMap = (rows: TranslationRow[]): Record<string, string> =>
  [...rows]
    .sort((a, b) => a.key.localeCompare(b.key))
    .reduce<Record<string, string>>((acc, row) => {
      if (row.custom !== '') acc[row.key] = row.custom;
      return acc;
    }, {});

/** Rows narrowed by the editor's filter box — key, default, or custom text. */
export const filterRows = (
  rows: TranslationRow[],
  term: string
): TranslationRow[] => {
  const search = term.trim().toLowerCase();
  if (!search) return rows;
  return rows.filter(
    row =>
      row.key.toLowerCase().includes(search) ||
      row.default.toLowerCase().includes(search) ||
      row.custom.toLowerCase().includes(search)
  );
};

/*
 * Adding one variant of a pluralisation family adds the whole family
 * (OMS-REG-GPREF-01.17): keys sharing the `prefix_` stem before the first
 * underscore-suffix (`label.item_one`, `label.item_other`, …).
 */
export const pluralisationFamily = (
  option: TranslationOption,
  options: TranslationOption[]
): TranslationOption[] => {
  const underscoreIndex = option.key.indexOf('_');
  if (underscoreIndex <= 0) return [option];
  const prefix = option.key.substring(0, underscoreIndex);
  return options.filter(o => o.key.startsWith(`${prefix}_`));
};

// ---------------------------------------------------------------------------
// Variable validation (rules: only the default's {{variables}}, balanced)

const VALID_VARIABLE = /\{\{\s*[^{}]+\s*\}\}/g;

export const hasInvalidBrackets = (text: string): boolean => {
  const cleaned = text.replace(VALID_VARIABLE, '');
  return /[{}]/.test(cleaned);
};

export const extractVariables = (text: string): string[] => {
  if (hasInvalidBrackets(text)) return [];
  const matches = text.match(VALID_VARIABLE) ?? [];
  return matches.map(m => m.slice(2, -2).trim()).filter(v => v.length > 0);
};

/*
 * A custom text may use only the variable placeholders present in its default
 * (each as often as it likes); unbalanced braces are invalid
 * (OMS-REG-GPREF-01.18).
 */
export const isInvalidCustom = (
  defaultText: string,
  customText: string
): boolean => {
  if (hasInvalidBrackets(customText)) return true;
  const allowed = new Set(extractVariables(defaultText));
  return extractVariables(customText).some(variable => !allowed.has(variable));
};

// ---------------------------------------------------------------------------
// Import / export (rules; OMS-REG-GPREF-01.22–.25)

export type ImportMode = 'keep-existing' | 'overwrite' | 'replace';

/** Merge imported rows into the current view per the mode. */
export const mergeRows = (
  existing: TranslationRow[],
  imported: TranslationRow[],
  mode: ImportMode
): TranslationRow[] => {
  switch (mode) {
    case 'replace':
      return imported;
    case 'keep-existing': {
      const existingKeys = new Set(existing.map(row => row.key));
      return [
        ...existing,
        ...imported.filter(row => !existingKeys.has(row.key)),
      ];
    }
    case 'overwrite': {
      const importedByKey = new Map(imported.map(row => [row.key, row]));
      const merged = existing.map(row => {
        const incoming = importedByKey.get(row.key);
        return incoming ? { ...row, custom: incoming.custom } : row;
      });
      const existingKeys = new Set(existing.map(row => row.key));
      return [...merged, ...imported.filter(row => !existingKeys.has(row.key))];
    }
  }
};

/** Merge two flat maps per the mode (the legacy half of a structured file). */
export const mergeFlatMaps = (
  existing: Record<string, string>,
  imported: Record<string, string>,
  mode: ImportMode
): Record<string, string> => {
  if (mode === 'replace') return { ...imported };
  const result = { ...existing };
  for (const [key, value] of Object.entries(imported)) {
    if (mode === 'keep-existing' && result[key] !== undefined) continue;
    result[key] = value;
  }
  return result;
};

/** Merge nested v2 structures per the mode, per language + namespace + key. */
export const mergeNestedTranslations = (
  existing: CustomTranslationsV2,
  imported: CustomTranslationsV2,
  mode: ImportMode
): CustomTranslationsV2 => {
  if (mode === 'replace') return imported;
  const result: CustomTranslationsV2 = structuredClone(existing);
  for (const [language, namespaces] of Object.entries(imported)) {
    const languageResult = (result[language] ??= {});
    for (const [namespace, translations] of Object.entries(namespaces)) {
      const namespaceResult = (languageResult[namespace] ??= {});
      for (const [key, value] of Object.entries(translations)) {
        if (mode === 'keep-existing' && namespaceResult[key] !== undefined)
          continue;
        namespaceResult[key] = value;
      }
    }
  }
  return result;
};

/*
 * Set one language + namespace's map within the structure; an emptied
 * namespace is removed entirely (and an emptied language with it), so a
 * cleared view saves as absent rather than as an empty shell.
 */
export const setNamespaceTranslations = (
  nested: CustomTranslationsV2,
  language: string,
  namespace: string,
  translations: Record<string, string>
): CustomTranslationsV2 => {
  const result: CustomTranslationsV2 = structuredClone(nested);
  const languageResult = (result[language] ??= {});
  if (Object.keys(translations).length === 0) {
    delete languageResult[namespace];
    if (Object.keys(languageResult).length === 0) delete result[language];
  } else {
    languageResult[namespace] = translations;
  }
  return result;
};

/** Every namespace present in the structure, across all languages. */
export const collectNamespaces = (nested: CustomTranslationsV2): string[] => {
  const set = new Set<string>();
  for (const namespaces of Object.values(nested))
    for (const namespace of Object.keys(namespaces)) set.add(namespace);
  return [...set];
};

/*
 * The namespaces the selector offers, in order: the bundled pair, the loaded
 * plugins' codes, any namespace already in the data — deduplicated — and the
 * reserved legacy view only while legacy data exists (OMS-REG-GPREF-01.27).
 */
export const namespaceOptions = (
  nested: CustomTranslationsV2,
  pluginCodes: string[],
  legacyHasData: boolean
): string[] => {
  const set = new Set<string>([
    ...BASE_NAMESPACES,
    ...pluginCodes,
    ...collectNamespaces(nested),
  ]);
  const options = [...set];
  if (legacyHasData) options.push(LEGACY_NAMESPACE);
  return options;
};

/** The JSON export object: the whole v2 structure plus the legacy map under
 *  its reserved key (only when it has data). */
export const buildExportObject = (
  nested: CustomTranslationsV2,
  legacy: Record<string, string>
): Record<string, unknown> => {
  const out: Record<string, unknown> = structuredClone(nested);
  if (Object.keys(legacy).length > 0) out[LEGACY_V1_EXPORT_KEY] = legacy;
  return out;
};

export interface ParsedImport {
  /** true when the file is the structured (nested v2 and/or `_v1`) format. */
  isStructured: boolean;
  v2?: CustomTranslationsV2;
  legacy?: Record<string, string>;
}

/*
 * Split a parsed JSON upload into its v2 part and the reserved legacy map. A
 * plain flat file reports `isStructured: false` so the caller imports it into
 * the current view (OMS-REG-GPREF-01.24).
 */
export const splitImportObject = (
  parsed: Record<string, unknown>
): ParsedImport => {
  const { [LEGACY_V1_EXPORT_KEY]: legacyRaw, ...rest } = parsed;
  const legacyCandidate = asFlatMap(legacyRaw);
  const legacy =
    legacyRaw !== undefined && Object.keys(legacyCandidate).length > 0
      ? legacyCandidate
      : undefined;
  const v2 =
    Object.keys(rest).length > 0 && isNestedTranslations(rest)
      ? rest
      : undefined;
  return { isStructured: !!legacy || !!v2, v2, legacy };
};

/** Whether a flat file's values are all strings (importable). */
export const isValidFlatImport = (
  parsed: unknown
): parsed is Record<string, string> =>
  typeof parsed === 'object' &&
  parsed !== null &&
  !Array.isArray(parsed) &&
  Object.values(parsed).every(value => typeof value === 'string');
