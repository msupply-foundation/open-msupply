// S3 — the argument schema interpreter (spec/reports "Arguments", AC-R1/R3).
//
// PURE logic, no SolidJS / no DOM — every branch is unit-testable in node
// (schema.test.ts). This is the "one parse module" half of the bounded
// in-house interpreter recorded in kdd/report-argument-forms: the server's
// argument schema is render-from-config by wire contract, so the
// explicit-composition anti-default (kdd/explicit-composition) can't apply in
// its usual form. What we CAN do is keep the interpretation closed and
// traceable — normalise the two wire schemas into a discriminated ParsedField
// union here, then let ArgumentsModal switch over it into explicit library
// components. New server control types surface as `unsupported`, never a crash.
//
// Wire shapes handled (from live probing of the real backend). Both arrive as
// JSON objects; a JSON string is also accepted (parsed) defensively.
//
// jsonSchema — JSON-Schema draft-07. Top-level is either `{ properties }` or
// `{ allOf: [{ $ref: '#/definitions/X' }], definitions: { X: { properties }}}`;
// we resolve ONE level of local $ref. Property shapes seen: `{ type: 'string' |
// ['string','null'] }`, `{ type: 'boolean' | ['boolean','null'], default? }`,
// `{ enum: [...], type: [...] }`, `{ format: 'SortToggle', enum: [...] }`,
// `{ type: 'number', readOnly? }` (the preference thresholds), and strings
// with `format: 'date' | 'date-time'`. A `required: [keys]` list may sit at
// the top level or inside a definition. That is the CLOSED vocabulary the
// form honours (spec/reports rules "Arguments", AC-R4–R8) — anything else
// passes through un-enforced.
//
// uiSchema — `{ elements: [{ type, label, scope: '#/properties/<key>',
// options? }] }`. `options`: `{ invert: true }` on boolean Controls, `{ show:
// [[value, label], ...] }` on enum Controls, `{ useDebounce }` (ignored).
//
// Labels arrive pre-translated (AC-R2) and are used verbatim.

/** One option for an enum select: raw schema value + its display label. */
export interface EnumOption {
  value: string;
  label: string;
}

// The normalised form field. A discriminated union keyed on `kind` so the
// modal's switch is exhaustive and each branch knows exactly which extra data
// it carries. `key` is the jsonSchema property name (the argument key written
// on submit); `label` is the pre-translated element label.
export type ParsedField =
  | {
      kind: 'text';
      key: string;
      label: string;
      nullable: boolean;
      readOnly: boolean;
      required: boolean;
      default?: unknown;
    }
  | {
      kind: 'number';
      key: string;
      label: string;
      nullable: boolean;
      /** Shown disabled with its seeded value, still submitted (AC-R6). */
      readOnly: boolean;
      required: boolean;
      default?: unknown;
    }
  | {
      kind: 'boolean';
      key: string;
      label: string;
      nullable: boolean;
      /** Display-invert: schema key `isActive` shown as "Include inactive". */
      invert: boolean;
      readOnly: boolean;
      default?: unknown;
    }
  | {
      kind: 'enum';
      key: string;
      label: string;
      nullable: boolean;
      options: EnumOption[];
      readOnly: boolean;
      required: boolean;
      default?: unknown;
    }
  | {
      kind: 'date';
      key: string;
      label: string;
      nullable: boolean;
      readOnly: boolean;
      required: boolean;
      /**
       * True for `format: 'date-time'` — rendered as the date & time input;
       * the stored/submitted value is a UTC RFC3339 instant (AC-R5), unlike
       * plain dates ('YYYY-MM-DD').
       */
      dateTime: boolean;
    }
  | {
      kind: 'sortToggle';
      key: string;
      label: string;
      nullable: boolean;
      default?: unknown;
    }
  | { kind: 'dateRange'; key: string; label: string; nullable: boolean }
  | { kind: 'masterList'; key: string; label: string; nullable: boolean }
  | { kind: 'location'; key: string; label: string; nullable: boolean }
  /**
   * The patient-program picker: options are the store's program-enrolment
   * registries; the submitted value is the program's CONTEXT id (AC-R10).
   * Carries `required` — report schemas mark the program mandatory.
   */
  | {
      kind: 'program';
      key: string;
      label: string;
      nullable: boolean;
      required: boolean;
    }
  // Any control the interpreter doesn't render — an unknown element type, or a
  // Control whose jsonSchema property is missing. The original element type is
  // preserved so the modal can show it (and so the degradation is diagnosable).
  | { kind: 'unsupported'; key: string; label: string; elementType: string };

/** The argument object flowing to generation — opaque to the server. */
export type ReportArgs = Record<string, unknown>;

/** The subset of store preferences the client seeds argument defaults from. */
export interface SeedPreferences {
  monthsOverstock?: number;
  monthsUnderstock?: number;
  monthsItemsExpire?: number;
  monthlyConsumptionLookBackPeriod?: number;
}

// --- small structural guards (the wire is typed `unknown`) -------------------

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

// Accept a JSON object as-is, or a JSON string (parse it). Anything else →
// none.
const normalize = (raw: unknown): Record<string, unknown> | undefined => {
  if (typeof raw === 'string') {
    try {
      return asRecord(JSON.parse(raw));
    } catch {
      return undefined;
    }
  }
  return asRecord(raw);
};

const DEFINITIONS_PREFIX = '#/definitions/';
const PROPERTIES_MARKER = '/properties/';

// Resolve the property map and required-key set from a jsonSchema, flattening
// one level of local $ref: merge top-level `properties` (and `required`), plus
// each `allOf` entry's own and any `#/definitions/X` it $refs. Later entries
// win on key collision.
const resolveSchema = (
  schema: Record<string, unknown> | undefined
): { properties: Record<string, unknown>; required: Set<string> } => {
  const props: Record<string, unknown> = {};
  const required = new Set<string>();
  if (!schema) return { properties: props, required };
  const definitions = asRecord(schema.definitions) ?? {};

  const merge = (node: unknown): void => {
    const record = asRecord(node);
    if (!record) return;
    Object.assign(props, asRecord(record.properties) ?? {});
    if (Array.isArray(record.required))
      for (const key of record.required)
        if (typeof key === 'string') required.add(key);
    const ref = typeof record.$ref === 'string' ? record.$ref : undefined;
    if (ref?.startsWith(DEFINITIONS_PREFIX)) {
      merge(definitions[ref.slice(DEFINITIONS_PREFIX.length)]);
    }
  };

  merge(schema); // plain `{ properties }`
  const allOf = Array.isArray(schema.allOf) ? schema.allOf : [];
  for (const entry of allOf) merge(entry);
  return { properties: props, required };
};

// `#/properties/<key>` → `<key>`.
const scopeKey = (scope: unknown): string | undefined => {
  if (typeof scope !== 'string') return undefined;
  const at = scope.lastIndexOf(PROPERTIES_MARKER);
  return at >= 0 ? scope.slice(at + PROPERTIES_MARKER.length) : undefined;
};

// A property's `type` may be a string or a `[..., 'null']` array.
const typeList = (prop: Record<string, unknown>): string[] => {
  const type = prop.type;
  if (typeof type === 'string') return [type];
  if (Array.isArray(type))
    return type.filter((t): t is string => typeof t === 'string');
  return [];
};

const isNullable = (prop: Record<string, unknown>): boolean =>
  typeList(prop).includes('null');

const hasType = (prop: Record<string, unknown>, name: string): boolean =>
  typeList(prop).includes(name);

// Enum display options: `options.show` gives explicit [value, label] pairs;
// otherwise fall back to the raw enum values as their own labels.
const enumOptions = (
  prop: Record<string, unknown>,
  options: Record<string, unknown> | undefined
): EnumOption[] => {
  const show = options?.show;
  if (Array.isArray(show)) {
    return show
      .filter(
        (pair): pair is [unknown, unknown] =>
          Array.isArray(pair) && pair.length >= 2
      )
      .map(([value, label]) => ({
        value: String(value),
        label: String(label),
      }));
  }
  const values = Array.isArray(prop.enum) ? prop.enum : [];
  return values.map(value => ({ value: String(value), label: String(value) }));
};

/**
 * Parse a report's argument schema into an ordered list of ParsedFields —
 * uiSchema element order preserved, each joined to its jsonSchema property by
 * scope key. Unknown element types and Controls with no matching property
 * degrade to `unsupported` (elementType preserved) rather than throwing.
 */
export const parseArgumentSchema = (raw: {
  jsonSchema: unknown;
  uiSchema: unknown;
}): ParsedField[] => {
  const jsonSchema = normalize(raw.jsonSchema);
  const uiSchema = normalize(raw.uiSchema);
  const { properties, required } = resolveSchema(jsonSchema);
  const elements = Array.isArray(uiSchema?.elements) ? uiSchema.elements : [];

  const fields: ParsedField[] = [];
  for (const element of elements) {
    const el = asRecord(element);
    if (!el) continue;
    const type = typeof el.type === 'string' ? el.type : '';
    const label = typeof el.label === 'string' ? el.label : '';
    const key = scopeKey(el.scope) ?? '';
    const options = asRecord(el.options);
    const prop = asRecord(properties[key]);
    const nullable = prop ? isNullable(prop) : false;
    const readOnly = prop?.readOnly === true;
    const isRequired = required.has(key);

    switch (type) {
      case 'Control': {
        // A Control renders by its jsonSchema property type. A missing property
        // means the schema is inconsistent — degrade rather than guess.
        if (!prop) {
          fields.push({ kind: 'unsupported', key, label, elementType: type });
          break;
        }
        if (Array.isArray(prop.enum)) {
          fields.push({
            kind: 'enum',
            key,
            label,
            nullable,
            options: enumOptions(prop, options),
            readOnly,
            required: isRequired,
            default: prop.default,
          });
        } else if (hasType(prop, 'boolean')) {
          fields.push({
            kind: 'boolean',
            key,
            label,
            nullable,
            invert: options?.invert === true,
            readOnly,
            default: prop.default,
          });
        } else if (hasType(prop, 'number') || hasType(prop, 'integer')) {
          fields.push({
            kind: 'number',
            key,
            label,
            nullable,
            readOnly,
            required: isRequired,
            default: prop.default,
          });
        } else if (
          hasType(prop, 'string') &&
          (prop.format === 'date' || prop.format === 'date-time')
        ) {
          fields.push({
            kind: 'date',
            key,
            label,
            nullable,
            readOnly,
            required: isRequired,
            dateTime: prop.format === 'date-time',
          });
        } else if (hasType(prop, 'string')) {
          fields.push({
            kind: 'text',
            key,
            label,
            nullable,
            readOnly,
            required: isRequired,
            default: prop.default,
          });
        } else {
          fields.push({ kind: 'unsupported', key, label, elementType: type });
        }
        break;
      }
      case 'SortToggle':
        fields.push({
          kind: 'sortToggle',
          key,
          label,
          nullable,
          default: prop?.default,
        });
        break;
      case 'DateRange':
        fields.push({ kind: 'dateRange', key, label, nullable });
        break;
      case 'MasterListSearch':
        fields.push({ kind: 'masterList', key, label, nullable });
        break;
      case 'LocationSearch':
        fields.push({ kind: 'location', key, label, nullable });
        break;
      case 'PatientProgramSearch':
        fields.push({
          kind: 'program',
          key,
          label,
          nullable,
          required: isRequired,
        });
        break;
      // NameSearch, ItemSearch, ReasonOptionSearch, ScheduleForm,
      // ProgramSearch, PeriodSearch, and any future type are not yet
      // rendered — their picker roles are backlog registry rows
      // (spec/reports S3). Preserve the type name for the unsupported control.
      default:
        fields.push({ kind: 'unsupported', key, label, elementType: type });
    }
  }
  return fields;
};

/**
 * Seed the form's initial argument values: the store-preference seed the real
 * app sends (look-back / overstock / understock / expiring months + the user's
 * IANA timezone), then each field's own jsonSchema default. Only the four
 * preference keys are seeded from prefs — schema fields without a default are
 * left absent (never invented).
 */
export const seedDefaults = (
  fields: ParsedField[],
  prefs: SeedPreferences
): ReportArgs => {
  const seed: ReportArgs = {};

  // Preference seed — the exact keys observed in the real app's URL arguments.
  if (prefs.monthlyConsumptionLookBackPeriod !== undefined)
    seed.monthlyConsumptionLookBackPeriod =
      prefs.monthlyConsumptionLookBackPeriod;
  if (prefs.monthsOverstock !== undefined)
    seed.monthsOverstock = prefs.monthsOverstock;
  if (prefs.monthsUnderstock !== undefined)
    seed.monthsUnderstock = prefs.monthsUnderstock;
  if (prefs.monthsItemsExpire !== undefined)
    seed.monthsItemsExpire = prefs.monthsItemsExpire;
  seed.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Schema-declared defaults (raw value; display transforms like `invert` are a
  // render concern, not stored here).
  for (const field of fields) {
    if ('default' in field && field.default !== undefined) {
      seed[field.key] = field.default;
    }
  }
  return seed;
};

/**
 * Map a date-range field's editing shape (`{ start, end }`, each a 'yyyy-mm-dd'
 * calendar date or '') to the wire shape the server binds it to: a GraphQL
 * `DatetimeFilterInput` — `{ afterOrEqualTo, beforeOrEqualTo }` of RFC3339
 * datetimes (spec/reports contract "arguments — DateRange"). Confirmed live
 * against the Pending Encounters report: the uiSchema `DateRange` control scopes
 * ONE property, whose value is this object, passed verbatim into the report's
 * `startDatetime: DatetimeFilterInput` query variable.
 *
 * Each calendar date is widened to a full instant in the viewer's local zone —
 * start at 00:00:00, end at 23:59:59.999 (an inclusive day, matching the real
 * app's end-of-day handling) — because a bare 'yyyy-mm-dd' is not a valid
 * `DateTime` scalar. An empty end (or start) is simply omitted; both empty
 * means the field was already dropped upstream (the modal stores undefined).
 */
const toDatetimeFilter = (value: unknown): ReportArgs | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const { start, end } = value as { start?: unknown; end?: unknown };
  const filter: ReportArgs = {};
  if (typeof start === 'string' && start !== '')
    filter.afterOrEqualTo = new Date(`${start}T00:00:00`).toISOString();
  if (typeof end === 'string' && end !== '')
    filter.beforeOrEqualTo = new Date(`${end}T23:59:59.999`).toISOString();
  return Object.keys(filter).length > 0 ? filter : undefined;
};

/**
 * The submit transform (AC-R8): strip empty values — absent and '' filter
 * differently server-side — coerce number-field entries typed as text back to
 * JSON numbers (so a numeric argument never leaves as a string; an unparseable
 * leftover like a lone '.' is dropped like an empty), and widen each date-range
 * field to its `DatetimeFilterInput` wire shape (see `toDatetimeFilter`).
 */
export const cleanArguments = (
  fields: ParsedField[],
  raw: ReportArgs
): ReportArgs => {
  const numberKeys = new Set(
    fields.filter(field => field.kind === 'number').map(field => field.key)
  );
  const dateRangeKeys = new Set(
    fields.filter(field => field.kind === 'dateRange').map(field => field.key)
  );
  const cleaned: ReportArgs = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === '' || value === undefined || value === null) continue;
    if (dateRangeKeys.has(key)) {
      const filter = toDatetimeFilter(value);
      if (filter) cleaned[key] = filter;
      continue;
    }
    if (numberKeys.has(key) && typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) cleaned[key] = parsed;
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
};
