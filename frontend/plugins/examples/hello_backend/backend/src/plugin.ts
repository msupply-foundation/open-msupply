/*
 * The reference BACKEND plugin — the smallest thing the server will load, call
 * and get an answer from.
 *
 * It answers ONE `graphql_query` request: the frontend (or any authenticated
 * caller) sends `{ type: 'ping' }` through `pluginGraphqlQuery` and gets back
 * the store it was called for, the engine's own view of the datafile, and a
 * count read with real SQL — enough to prove the whole channel end to end
 * without depending on any particular data being present.
 *
 * The payload is opaque to the host: `input` and `output` are this plugin's
 * contract with its own callers, so a plugin with two halves declares them in
 * a module both import (`plugins/civ/shared/types.ts` is the worked example).
 */

import { BackendPlugins } from '@common/types';

/** What a caller sends. */
type Input = { type: 'ping' };

/** What it gets back. */
type Output = {
  type: 'pong';
  storeId: string;
  /** Rows in `item` — a real query, so an empty datafile still answers 0. */
  itemCount: number;
};

/**
 * Project a statement's columns into the single `json_row` column the host's
 * `sql` insists on (declared, with the rest of the host globals, in
 * `@common/types`). Out of tree this is `sqlQuery` from `@common/utils`; it is
 * inlined here because the trap it hides is the single most surprising thing
 * about writing a backend plugin — without it the query fails at runtime,
 * inside the engine, with a Diesel error that names a column you never wrote.
 *
 * The JSON function differs by dialect, which is what `sql_type()` is for.
 */
const jsonRows = <K extends string>(
  fields: readonly K[],
  statement: string
): Record<K, unknown>[] => {
  const jsonObject =
    sql_type() === 'sqlite' ? 'json_object' : 'json_build_object';
  const projection = fields
    .map(field => `'${field}', inner_statement.${field}`)
    .join(', ');
  return sql(
    `SELECT ${jsonObject}(${projection}) AS json_row
     FROM (${statement}) AS inner_statement`
  ) as Record<K, unknown>[];
};

/*
 * A `graphql_query` method receives the calling store and the caller's opaque
 * input, and returns the opaque output. The parameter is spelled out rather
 * than taken from `@common/types`' `GraphqlQueryInput` so the shape is visible
 * at the point of use; `BackendPlugins` on the export below is what checks it.
 */
const graphqlQuery = ({
  store_id: storeId,
  input,
}: {
  store_id: string;
  input: unknown;
}): Output => {
  const { type } = input as Input;
  if (type !== 'ping') {
    // Throwing is how a backend method reports a bad request: the server turns
    // it into a GraphQL error rather than a 500.
    throw new Error(`hello_backend: unknown input type "${type}"`);
  }

  /*
   * `sql` is a global, and it is bound only once the module has evaluated —
   * which is why this call lives inside the method and not beside the import.
   * The count comes back as a string on some drivers, so it is parsed rather
   * than trusted.
   */
  const [row] = jsonRows(['count'], 'SELECT count(*) AS count FROM item');
  const itemCount = Number(row?.['count'] ?? 0);

  log(`hello_backend: ping from store ${storeId}, ${itemCount} items`);

  return { type: 'pong', storeId, itemCount };
};

/*
 * THE export. The server resolves a callable at the path
 * `["plugins", "<type>"]` (server/service/src/boajs/call_method.rs), so the
 * key here must be the plugin type named in package.json's
 * `omSupplyPlugin.types`, and the module must export `plugins` under exactly
 * that name — the build fails if it does not.
 */
/* eslint-disable camelcase -- the server's PluginTypes names, not ours. */
const plugins: BackendPlugins = { graphql_query: graphqlQuery };
/* eslint-enable camelcase */

export { plugins };
