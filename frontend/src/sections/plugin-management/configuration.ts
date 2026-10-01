import { generateUUID } from '@/uuid';
import { CONFIGURATION_IDENTIFIER } from '@/plugin-sdk/pluginData';
import type {
  InsertPluginConfigurationVariables,
  PluginConfigurationResult,
  UpdatePluginConfigurationVariables,
} from './plugins.generated';

/*
 * A plugin's configuration record (spec/plugin-management/rules.md ›
 * configuring a plugin; contract.md › configuring a plugin): one store-less
 * record per code under the reserved identifier, holding the whole value as
 * JSON. The host owns it — the plugin's editor only edits the value.
 */

type PluginDataAnswer = PluginConfigurationResult['pluginData'];
export type ConfigurationRecord = PluginDataAnswer['nodes'][number];

/**
 * The installation-wide record: the first store-less one. The read also
 * answers the signed-in store's own rows of the identifier, which are not the
 * configuration (contract › configuring a plugin).
 */
export const pickConfigurationRecord = (
  answer: PluginDataAnswer
): ConfigurationRecord | undefined =>
  answer.nodes.find(node => node.storeId === null);

/** What the editor opens on, and which record a Save writes to. */
export interface LoadedConfiguration {
  /** The stored record to update, or undefined to create one. */
  recordId: string | undefined;
  value: unknown;
}

/**
 * The editor's starting value. Nothing stored → the plugin's default. A stored
 * value that is not readable JSON is treated as absent — the default again —
 * but its record is kept, so a Save replaces it rather than adding a second.
 */
export const loadConfiguration = (
  record: ConfigurationRecord | undefined,
  defaultConfig: unknown
): LoadedConfiguration => {
  if (!record) return { recordId: undefined, value: defaultConfig };
  try {
    const parsed: unknown = JSON.parse(record.data);
    return { recordId: record.id, value: parsed };
  } catch {
    return { recordId: record.id, value: defaultConfig };
  }
};

export type ConfigurationWrite =
  | { kind: 'insert'; variables: InsertPluginConfigurationVariables }
  | { kind: 'update'; variables: UpdatePluginConfigurationVariables };

/**
 * The write a Save sends: the whole value, serialised. `input.storeId` is left
 * out on purpose — that is what makes the record store-less; the top-level
 * `storeId` only authorises the call.
 */
export const configurationWrite = (
  storeId: string,
  pluginCode: string,
  recordId: string | undefined,
  value: unknown
): ConfigurationWrite => {
  const data = JSON.stringify(value ?? null);
  return recordId === undefined
    ? {
        kind: 'insert',
        variables: {
          storeId,
          input: {
            id: generateUUID(),
            pluginCode,
            dataIdentifier: CONFIGURATION_IDENTIFIER,
            data,
          },
        },
      }
    : {
        kind: 'update',
        variables: {
          storeId,
          input: {
            id: recordId,
            pluginCode,
            dataIdentifier: CONFIGURATION_IDENTIFIER,
            data,
          },
        },
      };
};
