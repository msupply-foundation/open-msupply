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

/** What a caller sends. */
type Input = { type: 'ping' };

/** What it gets back. */
type Output = {
  type: 'pong';
  storeId: string;
  /** Rows in `item` — a real query, so an empty datafile still answers 0. */
  itemCount: number;
};

/*
 * A `graphql_query` method receives the calling store and the caller's opaque
 * input, and returns the opaque output. Out of tree this signature comes typed
 * from `@common/types`' `BackendPlugins['graphql_query']`; spelled out here so
 * the example needs no import.
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
  const [row] = sql('SELECT count(*) AS count FROM item');
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
const plugins = { graphql_query: graphqlQuery };
/* eslint-enable camelcase */

export { plugins };
