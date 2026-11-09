import { SqlParams, SqlQueryParams, SqlScalar } from './types';

/**
 * Project a statement's columns into the single `json_row` column an OLD host
 * deserialises.
 *
 * The current host returns rows keyed by column for any SELECT, so nothing
 * needs wrapping any more — it survives for the two places where a host might
 * still be the old one: the fallback below, and the no-params passthrough,
 * which has to keep giving a caller exactly what it always got. (The new host
 * unwraps a `json_row` column too, so wrapping stays correct on both.)
 * `sql_type()` survives for the same reason — the JSON function is named
 * differently on each engine.
 */
const wrapSql = (fields: string[], sqlStatement: string) => {
  const jsonObjectFunction =
    sql_type() === 'sqlite' ? 'json_object' : 'json_build_object';

  return `
      SELECT ${jsonObjectFunction}(${fields.map(field => `'${field}', inner_statement.${field}`)}) AS json_row 
      FROM (${sqlStatement}) AS inner_statement
  `;
};

/**
 * Run a statement and get its rows back keyed by column.
 *
 * Values go in `params`, referenced from the statement as `$name`, and are
 * kept out of the text — so a caller's string can never be SQL. The host
 * takes SCALARS and nothing else, the same as a report's parameters; two
 * conveniences are this helper's own and happen before the host sees
 * anything. A `Date` is rendered with `sqlDateTime`. An array is expanded
 * into a parenthesised list of one scalar parameter per element, so an `IN`
 * is written `item_id IN $itemIds`, with no brackets of your own. See the
 * `sql` doc comment in `./types`.
 *
 * `fields` types the result and keeps the signature stable; on the current
 * host it no longer projects anything, since rows already arrive keyed by
 * column. It is only written into SQL on the old-host paths, and then as
 * IDENTIFIERS taken from the plugin's own source, never from a caller.
 */
export const sqlQuery = <K extends string>(
  fields: K[],
  sqlStatement: string,
  params?: SqlQueryParams
): Record<K, any>[] => {
  // No params at all: byte-for-byte passthrough, as it always was — which on
  // every host means the wrapped statement.
  if (!params) return sql(wrapSql(fields, sqlStatement)) as Record<K, any>[];

  // Dates first, then lists — so an array of `Date`s expands into rendered
  // datetime strings. Both happen before either branch below, which is what
  // leaves the two of them with nothing but scalars to deal with.
  const expanded = expandLists(sqlStatement, normaliseParams(params));

  if (hostBindsParams()) {
    return sql(expanded.statement, expanded.params) as Record<K, any>[];
  }

  // An old host registered `sql` with one argument, so it would IGNORE the
  // params and — on sqlite, where an unbound `$name` reads as NULL — answer
  // nothing at all, silently. Render the values in ourselves there, and wrap,
  // since that host reads only a `json_row` column.
  const rendered = renderParams(
    wrapSql(fields, expanded.statement),
    expanded.params
  );
  return sql(rendered) as Record<K, any>[];
};

/** The params once dates are rendered, with the arrays still to expand. */
type NormalisedParams = Record<string, SqlScalar | SqlScalar[]>;

/** A `Date` anywhere in the params, as the datetime string the host takes. */
const normaliseParams = (params: SqlQueryParams): NormalisedParams => {
  const normalised: NormalisedParams = {};
  for (const name of Object.keys(params)) {
    const value = params[name] as (SqlScalar | Date) | (SqlScalar | Date)[];
    normalised[name] = Array.isArray(value)
      ? value.map(normaliseScalar)
      : normaliseScalar(value);
  }
  return normalised;
};

const normaliseScalar = (value: SqlScalar | Date): SqlScalar =>
  value instanceof Date ? sqlDateTime(value) : value;

/** A `$name`: the longest identifier after the `$`, so `$a_0` is one name. */
const placeholderPattern = /\$[A-Za-z_][A-Za-z0-9_]*/g;

/**
 * Turn every array parameter into a parenthesised list of scalar ones.
 *
 * The host has no arrays — its contract is a report's, and a report passes
 * scalars. So `item_id IN $itemIds` with `['a', 'b']` goes to the host as
 * `item_id IN ($itemIds_0, $itemIds_1)` with those two keys, and the array
 * key is gone. An empty array becomes `(NULL)` and adds no key: it matches
 * nothing on either engine, where `()` is a syntax error on postgres.
 *
 * Because a `$name` match takes the longest identifier it can, a written
 * `$itemIds_0` is its own name and never a substitution site for `$itemIds`.
 * The pattern is otherwise naive, as `renderParams` is: a `$name` inside a
 * string literal or a comment would be replaced too, which no statement in
 * this repo has. Do not also pass a key spelled `<list>_<index>` — the
 * expansion of `<list>` would overwrite it.
 */
const expandLists = (
  statement: string,
  params: NormalisedParams
): { statement: string; params: SqlParams } => {
  const scalars: SqlParams = {};
  const lists: Record<string, string> = {};

  for (const name of Object.keys(params)) {
    const value = params[name] as SqlScalar | SqlScalar[];
    if (!Array.isArray(value)) {
      scalars[name] = value;
      continue;
    }
    const elements = value.map((element, index) => {
      scalars[`${name}_${index}`] = element;
      return `$${name}_${index}`;
    });
    // An empty list becomes `(NULL)`, so `x IN $empty` matches nothing, which is
    // what an empty list means. Mind the inverse: `x NOT IN (NULL)` is NULL, not
    // true, so it matches nothing either — a `NOT IN` over a list that can be
    // empty needs its own emptiness check in the caller.
    lists[name] = elements.length === 0 ? '(NULL)' : `(${elements.join(', ')})`;
  }

  if (Object.keys(lists).length === 0) return { statement, params: scalars };

  return {
    statement: statement.replace(
      placeholderPattern,
      placeholder => lists[placeholder.slice(1)] ?? placeholder
    ),
    params: scalars,
  };
};

/**
 * Whether the host's `sql` takes parameters: the new one is registered with
 * two arguments, the old one with none.
 *
 * TEMPORARY, with `renderParams` and `wrapSql` above — all three go once no
 * supported server predates the parameterised `sql` (open-msupply#687), at
 * which point the no-params path stops wrapping too.
 */
const hostBindsParams = () => sql.length >= 2;

/**
 * A string as a SQL literal, with any quote of its own doubled.
 *
 * Complete only while Postgres has `standard_conforming_strings` on, or a
 * trailing backslash escapes the closing quote. The new host pins it for the
 * transaction; the old hosts this fallback runs against do not — they rely on
 * the Postgres default, which has been on since 9.1. Another reason the
 * fallback is temporary.
 */
const quoteLiteral = (value: string) => `'${value.replace(/'/g, "''")}'`;

const renderScalar = (value: SqlScalar): string => {
  if (value === null) return 'NULL';
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return quoteLiteral(value);
};

/**
 * Write the parameters into the statement text, for an old host.
 *
 * Scalars only, because `expandLists` has already run: a list reaches here as
 * the `($name_0, $name_1)` it expanded to.
 *
 * TEMPORARY — see `hostBindsParams`. The pattern is naive in the same way
 * `expandLists`' is. A name with no value throws rather than reaching the
 * database as itself.
 */
const renderParams = (statement: string, params: SqlParams) =>
  statement.replace(placeholderPattern, placeholder => {
    const name = placeholder.slice(1);
    if (!(name in params)) {
      throw new Error(`sqlQuery: no value for ${placeholder}`);
    }
    return renderScalar(params[name] as SqlScalar);
  });

export const startOfDay = (date: Date) => {
  const start = new Date(date);
  start.setHours(0);
  start.setMinutes(0);
  start.setSeconds(0);
  return start;
};
export const endOfDay = (date: Date) => {
  const end = new Date(date);
  end.setHours(23);
  end.setMinutes(59);
  end.setSeconds(59);
  return end;
};

export const sqlDateTime = (date: Date) =>
  // toJSON will make it utc
  date.toJSON().replace('T', ' ').split('.')[0];

export const localDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
/**
 * @deprecated Interpolates values into the statement text. Bind them instead:
 * name the list in the statement (`item_id IN $itemIds`) and pass it in
 * `sqlQuery`'s `params`. Kept for bundles that have not migrated; the doubled
 * quote stops a value ending the literal, but it is not the fix.
 */
export const sqlList = (list: string[]) =>
  `('${list.map(value => value.replace(/'/g, "''")).join(`','`)}')`;
export const fromSqlDateTime = (datetime: string) => {
  // Will map '2023-01-01 10:10:10' to UTC '2023-01-01T10:10:10Z'
  // Will also map '2024-09-08 04:12:27.398858' to UTC '2024-09-08T04:12:27Z'
  const withoutMillisecods = datetime.split('.')[0] || datetime;
  return new Date(`${withoutMillisecods.split(' ').join('T')}Z`);
};

export const toNaiveDateTime = (date: Date) => {
  // Removing 'Z' from end of iso date string for naive date time to be recognised
  return date.toISOString().replace('Z', '');
};
