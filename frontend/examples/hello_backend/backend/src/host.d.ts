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

declare global {
  /**
   * Run a read query.
   *
   * NOT "returns a row per result row, keyed by column". The host deserialises
   * each row as `JsonRawRow { json_row }`, so the statement MUST project a
   * single column named `json_row` holding a JSON object — anything else fails
   * with `DIESEL_DESERIALIZATION_ERROR ("Column `json_row` was not present in
   * query")`, from inside the method, at runtime. Wrap with `jsonRows` below.
   * (The host has a TODO to do this wrapping itself; until it does, it is the
   * caller's job.)
   */
  function sql(query: string): Record<string, unknown>[];
  /** Which dialect the datafile is — the JSON function's name differs. */
  function sql_type(): 'postgres' | 'sqlite';
  /** Write to the server log — the only observability inside the engine. */
  function log(message: unknown): void;
}

export {};
