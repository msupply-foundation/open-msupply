import { RelatedRecordNodeType, UpdatePluginDataInput } from '@common/types';
import { getSdk } from './operations.generated';
import { FnUtils } from '@common/utils';

export type Sdk = ReturnType<typeof getSdk>;

export type PluginData = { id?: string; data: string; stockLineId: string };

const pluginParsers = {
  toUpdate: (input: PluginData): UpdatePluginDataInput => ({
    id: input.id ?? '',
    data: input.data,
    pluginName: 'StockDonor',
    relatedRecordId: input.stockLineId,
    relatedRecordType: RelatedRecordNodeType.StockLine,
  }),
};

export const getPluginQueries = (sdk: Sdk, storeId: string) => ({
  get: {
    pluginData: async (stockLineIds: string[]) => {
      const result = await sdk.pluginData({
        storeId,
        stockLineIds,
      });

      const { pluginData } = result;

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
        input: pluginParsers.toUpdate(input),
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
        pluginName: 'StockDonor',
        relatedRecordId: input.stockLineId,
        relatedRecordType: RelatedRecordNodeType.StockLine,
      },
    });

    const { insertPluginData } = result;

    if (insertPluginData?.__typename === 'PluginDataNode') {
      return input;
    }

    throw new Error('Unable to insert plugin data');
  },
});
