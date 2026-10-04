import { PluginTypes } from './generated/PluginTypes';

export type ArrayElement<T> = T extends (infer U)[] ? U : T;

export type BackendPlugins = {
  average_monthly_consumption?: (
    _: PluginTypes['average_monthly_consumption']['input']
  ) => PluginTypes['average_monthly_consumption']['output'];
  transform_request_requisition_lines?: (
    _: PluginTypes['transform_request_requisition_lines']['input']
  ) => PluginTypes['transform_request_requisition_lines']['output'];
  get_consumption?: (
    _: PluginTypes['get_consumption']['input']
  ) => PluginTypes['get_consumption']['output'];
  graphql_query?: (
    _: PluginTypes['graphql_query']['input']
  ) => PluginTypes['graphql_query']['output'];
  processor?: (
    _: PluginTypes['processor']['input']
  ) => PluginTypes['processor']['output'];
  schedule?: () => PluginTypes['schedule']['output'];
};

/**
 * A single value one `$name` stands for: plain JSON, nothing more.
 *
 * There is no `Date` and no date tag — a datetime is a STRING in
 * `YYYY-MM-DD HH:MM:SS`, the form both engines store and the form
 * `sqlDateTime` renders. (`sqlQuery` in `@common/utils` also takes a `Date`
 * and renders it for you.)
 */
export type SqlScalar = string | number | boolean | null;

/**
 * The values a statement's `$name`s stand for, keyed by name without the `$`.
 *
 * SCALARS ONLY, which is exactly what a report's parameters are — the host
 * knows no other shape. A list is `sqlQuery`'s doing, not the host's: it
 * expands one into a scalar per element before `sql` sees it.
 */
export type SqlParams = Record<string, SqlScalar>;

/**
 * What `sqlQuery` takes: the same, plus a `Date` wherever a scalar goes and an
 * array wherever a list is wanted.
 *
 * Both are conveniences of the helper, not of the host: `sqlQuery` renders
 * every `Date` with `sqlDateTime`, and expands every array into one scalar
 * parameter per element, before `sql` sees either.
 */
export type SqlQueryParams = Record<
  string,
  (SqlScalar | Date) | (SqlScalar | Date)[]
>;

declare global {
  /**
   * Run a read-only statement, its values kept out of the text.
   *
   * This is the executor the repo's REPORT SQL runs through
   * (`server/repository/src/db_diesel/report_query.rs`), and the contract is
   * a report's, with nothing added: placeholders are NAMED — `$storeId`,
   * `$periodStart` — exactly as a report writes `$storeId`. A name used
   * several times is one value. Don't write a `$name` you don't mean, in a
   * string literal or a comment: nothing here promises to spot the
   * difference.
   *
   * On sqlite rusqlite binds each value natively. On postgres each one is
   * rendered as a typed SQL literal — a string quoted with its own quotes
   * doubled, a number, boolean or null bare — inside a read-only transaction,
   * so postgres reads a value's type from its context exactly as it would a
   * literal written by hand, and a caller's string still cannot become SQL.
   *
   * Values are SCALARS: string, number, boolean, null. A datetime goes in as
   * a `YYYY-MM-DD HH:MM:SS` string. There is no array and no `Date` — an `IN`
   * list and a `Date` are conveniences of `sqlQuery` in `@common/utils`,
   * which turns both into scalars before calling this.
   *
   * Rows come back KEYED BY COLUMN — `[{ item_id: 'x', consumption: 12 }]` —
   * for any SELECT. No `json_row` projection is needed; a statement that
   * still writes one keeps working, since the host unwraps a single
   * `json_row` column.
   *
   * When `params` is given (any object, even `{}`) every `$name` in the text
   * must have a key, and a positional `$1`-style placeholder is REFUSED: the
   * two styles cannot be mixed, because naming the parameters renumbers them
   * into `$1`, `$2` … of their own. Name every one. A key the text does not
   * reference is fine — the report path hands this executor a whole bag of
   * variables. When `params` is absent the text is passed through byte for
   * byte, so a bundle built before parameters existed keeps working.
   *
   * Prefer `sqlQuery` from `@common/utils`: it takes `Date` and array values
   * too, and it still works against a server that predates parameters.
   */
  var sql: (query: string, params?: SqlParams) => Record<string, any>[];
  var sql_type: () => 'postgres' | 'sqlite';
  var log: (_: any) => void;
  var get_store_preferences: (
    _: string
  ) => PluginTypes['get_store_preferences'];
  var get_plugin_data: (
    _: PluginTypes['get_plugin_data']['input']
  ) => PluginTypes['get_plugin_data']['output'];
  var use_repository: (
    _: PluginTypes['use_repository']['input']
  ) => PluginTypes['use_repository']['output'];
  var use_graphql: (
    _: PluginTypes['use_graphql']['input']
  ) => PluginTypes['use_graphql']['output'];
  var get_active_stores_on_site: () => PluginTypes['get_active_stores_on_site']['output'];
  // Synchronous http request, similar to browser `fetch` but blocking (boajs has no event loop).
  // Body is returned as text, use `JSON.parse(response.body)` for json responses.
  var fetch: (_: PluginTypes['fetch']['input']) => PluginTypes['fetch']['output'];
  // Adds an email to the queue (the central server's scheduled task sends it).
  // Both html_body and text_body are sent as a multipart/alternative message,
  // so supply both. Returns the id of the queued email row.
  var enqueue_email: (
    _: PluginTypes['enqueue_email']['input']
  ) => PluginTypes['enqueue_email']['output'];
}
