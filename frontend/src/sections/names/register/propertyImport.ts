import { t } from '@/intl';
import { parseCsv, toCsv } from '@/domain/reportFiles';
import type { NamePropertiesResult } from '../names.generated';
import type { FacilityRow } from './facilityRegisterLogic';

/*
 * Pure logic for the register's BULK PROPERTY IMPORT (spec/names § importing
 * facility properties, S6). Everything the import decides — what the template
 * carries, which file is accepted, how a column finds its property, what makes
 * a row fail, and what document each row writes — lives here, framework-free
 * and unit-testable in node. `ImportPropertiesModal` owns only the steps, the
 * requests, and the banner.
 *
 * Nothing about the import is server-side: there is no bulk operation, no
 * transaction across rows, and no server-side validation of the file. Partial
 * application is therefore the CONTRACT, not a failure mode (contract §
 * importing facility properties).
 */

/**
 * One property definition, as the consumed nameProperties catalogue serves it.
 */
export type PropertyDefinition =
  NamePropertiesResult['nameProperties']['nodes'][number];

/*
 * Rows are applied ten at a time, with no rollback — captured as-is from the
 * current app (README § captured as-is: "the import is not transactional").
 */
export const IMPORT_BATCH_SIZE = 10;

/*
 * A definition's allowed values: ONE comma-separated string on the wire, split
 * client-side. (Kept local rather than imported from the settings vertical's
 * store editor so this lazily-loaded chunk doesn't drag that module in — the
 * same call the store editor makes for the same reason.)
 */
export const allowedValues = (allowed: string | null | undefined): string[] =>
  (allowed ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(value => value !== '');

/*
 * The facility's recorded property document, parsed. The server fabricates
 * "{}" for a facility whose properties were never set and never validates what
 * it stores, so anything that isn't a JSON object reads as "nothing recorded"
 * rather than blowing up the import.
 */
export const parseProperties = (
  json: string | null | undefined
): Record<string, unknown> => {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

/** A recorded value rendered for a template cell (never "[object Object]"). */
const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/*
 * The template (`.12`, `.13`, `.36`): a row for EVERY facility on the server,
 * its columns the facility's code and name followed by one column per
 * configured property, headed by that property's own display name — with each
 * facility's CURRENT values already filled in, so an import is an edit of the
 * current state rather than a blank form.
 */
export const buildTemplateCsv = (
  definitions: readonly PropertyDefinition[],
  facilities: readonly Pick<FacilityRow, 'code' | 'name' | 'properties'>[]
): string => {
  const fields = [
    t('label.code'),
    t('label.name'),
    ...definitions.map(definition => definition.property.name),
  ];
  const rows = facilities.map(facility => {
    const recorded = parseProperties(facility.properties);
    return [
      facility.code,
      facility.name,
      ...definitions.map(definition =>
        cellText(recorded[definition.property.key])
      ),
    ];
  });
  return toCsv(fields, rows);
};

/*
 * Column → property. The first column is the CODE and the second the NAME
 * whatever they are titled; the remaining columns are matched to properties by
 * either the property's KEY or its DISPLAY NAME (rules § importing facility
 * properties). A column matching no property is ignored, and a property with no
 * column is left as it was.
 */
export const matchColumns = (
  header: readonly string[],
  definitions: readonly PropertyDefinition[]
): (PropertyDefinition | undefined)[] =>
  header.map((title, index) => {
    if (index < 2) return undefined;
    const needle = title.trim().toLowerCase();
    return definitions.find(
      definition =>
        definition.property.key.trim().toLowerCase() === needle ||
        definition.property.name.trim().toLowerCase() === needle
    );
  });

/**
 * One parsed row of the uploaded file, matched, validated, and ready to apply.
 */
export interface ImportRow {
  /** The facility code — column 1, whatever it is titled. */
  code: string;
  /** The facility name — column 2, whatever it is titled. */
  name: string;
  /** property key → the value this row offers, coerced to its declared type. */
  values: Record<string, unknown>;
  /** property key → the raw cell text, for the review table's own columns. */
  cells: Record<string, string>;
  /**
   * The matched facility's id — the EMPTY STRING when no facility carries this
   * code. Such a row is still submitted, and the server refuses it with the
   * same RecordNotFound an unknown id gets, which is why an unmatched code is
   * caught at apply time rather than at review (`.39`, contract § wire trap).
   */
  id: string;
  /**
   * The complete document to write: the facility's set with this row over it.
   */
  properties: string;
  /**
   * ALL of this row's reasons, shown together (`.38`). Empty = passes review.
   */
  errors: string[];
}

const isNumericType = (
  valueType: PropertyDefinition['property']['valueType']
) => valueType === 'INTEGER' || valueType === 'FLOAT';

/*
 * Coerce a cell to the value the document should carry. The column is an opaque
 * pass-through server-side, so the declared type only decides how the text is
 * read — an unparseable value has already been rejected by the validation
 * below and never reaches a write.
 */
const coerce = (
  raw: string,
  definition: PropertyDefinition
): string | number | boolean => {
  const text = raw.trim();
  if (isNumericType(definition.property.valueType)) return Number(text);
  if (definition.property.valueType === 'BOOLEAN')
    return text.toLowerCase() === 'true';
  return text;
};

/*
 * Parse and validate the whole file against the definitions and the register's
 * rows. EVERY row is checked before anything is applied (`.38`); a row fails
 * when its code is blank, its name is blank, a value offered for a property
 * with a fixed set of allowed values is not one of them, or a value offered for
 * a numeric property is not a number — and all of a row's reasons are reported
 * together.
 *
 * A row whose code matches no facility is NOT an error here: it passes review
 * and is refused only on apply (`.39`).
 */
export const parseImportFile = (
  text: string,
  definitions: readonly PropertyDefinition[],
  facilities: readonly Pick<FacilityRow, 'id' | 'code' | 'properties'>[]
): ImportRow[] => {
  const table = parseCsv(text);
  if (table.length < 2) return [];
  const [header, ...body] = table;
  const columns = matchColumns(header, definitions);
  // Facilities are matched by CODE, client-side, case-insensitively.
  const byCode = new Map(
    facilities.map(facility => [facility.code.trim().toLowerCase(), facility])
  );

  return body.map(cells => {
    const code = (cells[0] ?? '').trim();
    const name = (cells[1] ?? '').trim();
    const errors: string[] = [];
    if (code === '')
      errors.push(
        t('error.missing-required-field', { fieldName: t('label.code') })
      );
    if (name === '')
      errors.push(
        t('error.missing-required-field', { fieldName: t('label.name') })
      );

    const values: Record<string, unknown> = {};
    const raw: Record<string, string> = {};
    columns.forEach((definition, index) => {
      if (!definition) return;
      const cell = (cells[index] ?? '').trim();
      raw[definition.property.key] = cell;
      // A blank cell offers no value: the property is left as it was, which is
      // also why blank property cells are never a failure reason.
      if (cell === '') return;

      const allowed = allowedValues(definition.property.allowedValues);
      if (allowed.length > 0 && !allowed.includes(cell)) {
        errors.push(
          t('error.invalid-field-value', {
            value: cell,
            field: definition.property.name,
          })
        );
        return;
      }
      if (
        isNumericType(definition.property.valueType) &&
        !isFiniteNumber(cell)
      ) {
        errors.push(
          t('error.invalid-field-value', {
            value: cell,
            field: definition.property.name,
          })
        );
        return;
      }
      values[definition.property.key] = coerce(cell, definition);
    });

    const facility = byCode.get(code.toLowerCase());
    return {
      code,
      name,
      values,
      cells: raw,
      // No match ⇒ an empty id, submitted anyway (see ImportRow.id).
      id: facility?.id ?? '',
      // The write replaces the facility's WHOLE document, so the row's values
      // go over what the facility already holds — a property with no column is
      // left as it was (rules § importing facility properties).
      properties: JSON.stringify({
        ...parseProperties(facility?.properties),
        ...values,
      }),
      errors,
    };
  });
};

/** Whether a cell reads as a finite number (blank and "12abc" do not). */
const isFiniteNumber = (text: string): boolean =>
  text !== '' && Number.isFinite(Number(text));

/** The rows an apply may submit: everything the review did not flag. */
export const applicableRows = (rows: readonly ImportRow[]): ImportRow[] =>
  rows.filter(row => row.errors.length === 0);

/** Split into the batches the apply sends — ten in flight at a time. */
export const batches = <T>(
  items: readonly T[],
  size = IMPORT_BATCH_SIZE
): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
};

/** What one row's write came back as. */
export type RowOutcome =
  | { kind: 'written' }
  /** The server refused it — `reason` is verbatim what it said. */
  | { kind: 'refused'; reason: string };

/*
 * The run's outcome. `failed` rows carry the server's own reason; `written`
 * counts the facilities actually updated. Rows are applied INDEPENDENTLY, so a
 * partly-failed run leaves the successful facilities written (rules § importing
 * facility properties) — which is exactly why the banner must say which run it
 * was (`.42`, DIVERGENCES D97).
 */
export interface ImportOutcome {
  written: number;
  failed: ImportRow[];
  /** Total rows attempted, including the ones the review already flagged. */
  attempted: number;
}

export const summariseOutcome = (
  attempted: readonly ImportRow[],
  outcomes: ReadonlyMap<ImportRow, RowOutcome>
): ImportOutcome => {
  const failed: ImportRow[] = [];
  let written = 0;
  attempted.forEach(row => {
    const outcome = outcomes.get(row);
    if (outcome?.kind === 'written') {
      written++;
      return;
    }
    // Rows the review flagged were never submitted; they keep their own
    // reasons. A submitted row that came back refused takes the server's.
    failed.push(
      outcome?.kind === 'refused' ? { ...row, errors: [outcome.reason] } : row
    );
  });
  return { written, failed, attempted: attempted.length };
};

/*
 * `.42`/`.43` — the outcome MUST state which it is. A run in which ANY row
 * failed reports a failure; only a run in which every row succeeded reports
 * success. (The current app shows the success string in both cases — that is
 * the whole of DIVERGENCES D97.)
 */
export const outcomeSucceeded = (outcome: ImportOutcome): boolean =>
  outcome.failed.length === 0 && outcome.attempted > 0;
