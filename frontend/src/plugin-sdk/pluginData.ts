/*
 * The plugin-data store (spec/plugins/sdk-contract.md § data access): typed CRUD
 * over the plugin's own server-side records.
 *
 * The plugin's code and the entered store are injected on every call, so a
 * plugin can only ever read and write its own records, in the store the user is
 * in — the two scope fields are absent from the surface rather than trusted to
 * the caller. Types are the generated operation types throughout (no parallel
 * DTOs — kdd/type-safety): `data` is the plugin's own encoded payload (JSON by
 * convention) and the host never looks inside it.
 */
import { graphqlFetch, type GraphqlResult } from '../api/graphql';
import { currentStoreId } from '../store/storeContext';
import {
  PluginDataDelete,
  PluginDataInsert,
  PluginDataList,
  PluginDataUpdate,
  type PluginDataDeleteResult,
  type PluginDataListResult,
  type PluginDataListVariables,
  type PluginDataInsertVariables,
  type PluginDataRowFragment,
} from './pluginData.generated';

/** One stored record. */
export type PluginDataRecord = PluginDataRowFragment;
/** A page of records, with the unpaged total. */
export type PluginDataPage = PluginDataListResult['pluginData'];
/** Filter / sort / pagination, exactly as the wire offers them. */
export type PluginDataQueryOptions = Pick<
  PluginDataListVariables,
  'filter' | 'sort' | 'page'
>;
/** A record to write — the wire input minus the injected scope fields. */
export type PluginDataWrite = Omit<
  PluginDataInsertVariables['input'],
  'pluginCode' | 'storeId'
>;

/**
 * The `dataIdentifier` reserved for a plugin's own settings, edited by its
 * configuration contribution. Convention only — nothing enforces it on the wire.
 */
export const CONFIGURATION_IDENTIFIER = 'configuration';

export interface PluginDataApi {
  list: (
    options?: PluginDataQueryOptions
  ) => Promise<GraphqlResult<PluginDataPage>>;
  insert: (record: PluginDataWrite) => Promise<GraphqlResult<PluginDataRecord>>;
  update: (record: PluginDataWrite) => Promise<GraphqlResult<PluginDataRecord>>;
  remove: (
    id: string
  ) => Promise<GraphqlResult<PluginDataDeleteResult['deletePluginData']>>;
}

// Same contract as the bridge's: a call from outside the store guard is a
// programming error, reported and turned into the ordinary non-success result
// callers already handle.
const noStore = (code: string, operation: string): GraphqlResult<never> => {
  console.error(`pluginData(${code}).${operation}: no store entered`);
  return { kind: 'unexpectedError' };
};

export const pluginData = (code: string): PluginDataApi => ({
  list: async options => {
    const storeId = currentStoreId();
    if (storeId === undefined) return noStore(code, 'list');
    // `background`: a failing read degrades the contribution that wanted it
    // (spec/plugins/rules.md § error isolation), never the app-global error
    // surface. Writes below stay on the default surface — they are
    // user-initiated actions whose failure must be as loud as any host save.
    const result = await graphqlFetch(
      PluginDataList,
      {
        storeId,
        pluginCode: code,
        filter: options?.filter ?? null,
        sort: options?.sort ?? null,
        page: options?.page ?? null,
      },
      { background: true }
    );
    if (result.kind !== 'success') return result;
    return { kind: 'success', data: result.data.pluginData };
  },

  insert: async record => {
    const storeId = currentStoreId();
    if (storeId === undefined) return noStore(code, 'insert');
    const result = await graphqlFetch(PluginDataInsert, {
      storeId,
      input: { ...record, pluginCode: code, storeId },
    });
    if (result.kind !== 'success') return result;
    return { kind: 'success', data: result.data.insertPluginData };
  },

  update: async record => {
    const storeId = currentStoreId();
    if (storeId === undefined) return noStore(code, 'update');
    const result = await graphqlFetch(PluginDataUpdate, {
      storeId,
      input: { ...record, pluginCode: code, storeId },
    });
    if (result.kind !== 'success') return result;
    return { kind: 'success', data: result.data.updatePluginData };
  },

  remove: async id => {
    const storeId = currentStoreId();
    if (storeId === undefined) return noStore(code, 'remove');
    const result = await graphqlFetch(PluginDataDelete, { storeId, id });
    if (result.kind !== 'success') return result;
    return { kind: 'success', data: result.data.deletePluginData };
  },
});
