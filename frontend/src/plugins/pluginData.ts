/*
 * The plugin-data store, as the SDK hands it to a plugin
 * (spec/plugins/rules.md § plugin data, contract.md § plugin data).
 *
 * The host owns these calls so a plugin never reaches past the SDK: the
 * plugin's `code` and the entered store are injected here, not passed in, which
 * is what makes "a plugin reads and writes its own" structurally true rather
 * than a convention. The plugin supplies only its identifier, its optional
 * related-record link, and the opaque `data` string.
 *
 * Reads/writes follow the house data shape (kdd/state-management,
 * kdd/graphql-client): one never-throwing query method returning a
 * discriminated result. No cache, no keys — a caller that needs fresh rows
 * calls again.
 */
import { graphqlFetch } from '../api/graphql';
import { generateUUID } from '../uuid';
import {
  PluginData,
  InsertPluginData,
  UpdatePluginData,
  type PluginDataResult,
} from './pluginApi.generated';

/** One stored row, as the SDK exposes it. */
export type PluginDataRow = PluginDataResult['pluginData']['nodes'][number];

/** What a plugin asks for when reading its own rows. */
export interface PluginDataQuery {
  /** The plugin's own identifier for this kind of record. */
  dataIdentifier: string;
  /** Narrow to rows linked to one host record (e.g. a prescription id). */
  relatedRecordId?: string;
}

/** What a plugin writes. `id` absent = insert; present = update in place. */
export interface PluginDataWrite {
  id?: string;
  dataIdentifier: string;
  relatedRecordId?: string;
  /** Opaque to the host — JSON by convention, encoded by the plugin. */
  data: string;
}

export type PluginDataOutcome =
  { kind: 'saved'; id: string } | { kind: 'failed' };

/**
 * The per-plugin, per-store data surface. Built by the loader for each
 * registered plugin, so the `code` a row is stamped with is always the code the
 * bundle was installed under.
 */
export interface PluginDataStore {
  /** The plugin's rows matching `query`; empty on any failure. */
  read: (query: PluginDataQuery) => Promise<PluginDataRow[]>;
  /** Insert or update in place. Mints the row id on insert (UUID v7). */
  write: (write: PluginDataWrite) => Promise<PluginDataOutcome>;
}

export const createPluginDataStore = (
  pluginCode: string,
  storeId: () => string
): PluginDataStore => ({
  read: async query => {
    const result = await graphqlFetch(PluginData, {
      storeId: storeId(),
      pluginCode,
      filter: {
        dataIdentifier: { equalTo: query.dataIdentifier },
        ...(query.relatedRecordId === undefined
          ? {}
          : { relatedRecordId: { equalTo: query.relatedRecordId } }),
      },
    });
    return result.kind === 'success' ? result.data.pluginData.nodes : [];
  },

  write: async write => {
    // Both writes union to PluginDataNode alone — there is no typed error
    // branch on the wire, so the only failure a caller can see is a transport
    // /GraphQL one, which graphqlFetch has already surfaced globally.
    const input = {
      id: write.id ?? generateUUID(),
      storeId: storeId(),
      pluginCode,
      dataIdentifier: write.dataIdentifier,
      relatedRecordId: write.relatedRecordId,
      data: write.data,
    };
    const result = write.id
      ? await graphqlFetch(UpdatePluginData, { storeId: storeId(), input })
      : await graphqlFetch(InsertPluginData, { storeId: storeId(), input });
    return result.kind === 'success'
      ? { kind: 'saved', id: input.id }
      : { kind: 'failed' };
  },
});
