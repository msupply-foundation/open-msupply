/*
 * The host functions BoaJS binds as GLOBALS before calling a method — declared
 * here because this reference plugin builds in this repo, where open-msupply's
 * `@common/types` is not available. An out-of-tree plugin imports that package
 * instead of restating anything; this file exists so the example compiles and
 * so a reader can see the shape without a second checkout.
 *
 * Only what this plugin uses. The full set the server binds (in
 * server/service/src/boajs/call_method.rs) also includes `sql_type`,
 * `get_store_preferences`, `get_plugin_data`, `use_repository`, `use_graphql`,
 * `get_active_stores_on_site`, `fetch` and `enqueue_email`.
 *
 * They are bound AFTER the module is evaluated, so they may only be called
 * from inside an exported method — never at module top level.
 */

/**
 * A value one `$name` stands for, and the map of them `sql` takes.
 *
 * Scalars only — the host's contract is report SQL's, and a report passes
 * scalars. Module-scoped rather than declared in the `declare global` block
 * below: a global type alias would collide with the identical one in
 * `plugins/cook_islands/backend/src/host.d.ts`, which is in the same TS
 * program. Out of tree these are `SqlScalar` / `SqlParams` from
 * `@common/types`.
 */
type SqlScalar = string | number | boolean | null;
type SqlParams = Record<string, SqlScalar>;

declare global {
  /**
   * Run a read query, its values kept OUT of the text.
   *
   * This is the executor the repo's REPORT SQL runs through, and it adds
   * nothing to what a report gets: placeholders are NAMED — `$storeId`,
   * `$from` — exactly as a report writes `$storeId`. Never interpolate a
   * caller's value: name it, and pass it in `params`.
   *
   *     sql('SELECT id FROM item WHERE code = $code AND is_active = $active',
   *         { code: 'A', active: true });
   *
   * On sqlite rusqlite binds each value; on postgres each one is rendered as
   * a typed SQL literal (a string with its own quotes doubled, a number,
   * boolean or null bare) inside a read-only transaction — so postgres types
   * a value from its context as it would any literal, and either way a
   * caller's string cannot become SQL. Values are SCALARS: a datetime is a
   * `YYYY-MM-DD HH:MM:SS` string, and there is no array. An `IN` list and a
   * `Date` are conveniences of `sqlQuery` in `@common/utils`, which expands
   * the one into a scalar per element and renders the other before calling
   * this. With `params` given, every `$name` needs a key and a positional
   * `$1` does not work; a key the text does not use is fine. Omit `params`
   * entirely and the text is passed through as it is, which is how a bundle
   * written before parameters existed keeps working.
   *
   * Rows come back keyed by column, for any SELECT. A statement that projects
   * a single `json_row` column works too — the host unwraps it — so the
   * `jsonRows` wrapper below is no longer required, only a way of also
   * running against a server that predates this.
   */
  function sql(query: string, params?: SqlParams): Record<string, unknown>[];
  /** Which dialect the datafile is — the JSON function's name differs. */
  function sql_type(): 'postgres' | 'sqlite';
  /** Write to the server log — the only observability inside the engine. */
  function log(message: unknown): void;
}

export {};
