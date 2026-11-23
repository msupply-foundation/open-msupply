import { getSdk } from './operations.generated';
import { FnUtils } from '@common/utils';
import { name as pluginCode } from '../../../package.json';

export type Sdk = ReturnType<typeof getSdk>;

export type PluginData = { id?: string; data: string; stockLineId: string };

const DATA_IDENTIFIER = 'donor';

export const getPluginQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    pluginData: async (stockLineIds: string[]) => {
      const result = await sdk.pluginData({
        storeId,
        stockLineIds,
        pluginCode,
        dataIdentifier: DATA_IDENTIFIER,
      });

      const { pluginData } = result;
      console.log(pluginData);
      if (pluginData?.__typename === 'PluginDataConnector') {
        return pluginData.nodes;
      }
      return undefined;
    },
  },
  update: async (input: PluginData) => {
    const result =
      (await sdk.updatePluginData({
        storeId,
        input: {
          data: input.data,
          id: input.id || '', // TODO not types safe
          relatedRecordId: input.stockLineId,
          storeId,
          pluginCode,
          dataIdentifier: DATA_IDENTIFIER,
        },
      })) || {};

    const { updatePluginData } = result;

    if (updatePluginData?.__typename === 'PluginDataNode') {
      return input;
    }

    throw new Error('Unable to update plugin data');
  },
  insert: async (input: PluginData) => {
    const result = await sdk.insertPluginData({
      storeId,
      input: {
        data: input.data,
        id: FnUtils.generateUUID(),
        relatedRecordId: input.stockLineId,
        storeId,
        pluginCode,
        dataIdentifier: DATA_IDENTIFIER,
      },
    });

    const { insertPluginData } = result;

    if (insertPluginData?.__typename === 'PluginDataNode') {
      return input;
    }

    throw new Error('Unable to insert plugin data');
  },
});
