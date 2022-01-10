import {
  ConnectorError,
  OmSupplyApi,
  StocktakeQuery,
  StocktakeLineNode,
  StocktakeLineConnector,
  UpdateStocktakeInput,
  //   UpdateStocktakeLineInput,
  //   InsertStocktakeLineInput,
  //   DeleteStocktakeLineInput,
  RecordPatch,
} from '@openmsupply-client/common';
import { Stocktake } from '../../types';

const stocktakeGuard = (stocktakeQuery: StocktakeQuery) => {
  if (stocktakeQuery.stocktake.__typename === 'StocktakeNode') {
    return stocktakeQuery.stocktake;
  }

  throw new Error('Could not find the stocktake');
};

const linesGuard = (
  stocktakeLines: StocktakeLineConnector | ConnectorError
): StocktakeLineNode[] => {
  if (stocktakeLines.__typename === 'StocktakeLineConnector') {
    return stocktakeLines.nodes ?? [];
  }

  if (stocktakeLines.__typename === 'ConnectorError') {
    throw new Error('Error fetching lines for stocktake');
  }

  throw new Error('Unknown');
};

const createUpdateStocktakeInput = (
  patch: RecordPatch<Stocktake>
): UpdateStocktakeInput => {
  return {
    description: patch.description,
    status: patch.status,
    stocktakeDatetime: patch.stocktakeDatetime?.toISOString(),
    comment: patch.comment,
    id: patch.id,
    onHold: !!patch.onHold,
  };
};

// const createUpdateStocktakeLineInput = (
//   line: StocktakeLine
// ): UpdateStocktakeLineInput => {
//   return {
//     ...line,
//   };
// };

// const createInsertStocktakeLineInput =
//   (stocktake: StocktakeController) =>
//   (line: StocktakeLine): InsertStocktakeLineInput => {
//     return {
//       stocktakeId: stocktake.id,
//       ...line,
//     };
//   };

// const createDeleteStocktakeLineInput = (
//   line: StocktakeLine
// ): DeleteStocktakeLineInput => {
//   return {
//     ...line,
//   };
// };

export const StocktakeApi = {
  get: {
    byId:
      (api: OmSupplyApi) =>
      async (id: string): Promise<Stocktake> => {
        const result = await api.stocktake({ stocktakeId: id });

        const stocktake = stocktakeGuard(result);
        const lines = linesGuard(stocktake.lines);

        return {
          ...stocktake,
          stocktakeDatetime: stocktake.stocktakeDatetime
            ? new Date(stocktake.stocktakeDatetime)
            : null,
          entryDatetime: new Date(stocktake.entryDatetime),
          lines: lines.map(line => ({
            ...line,
            countThisLine: true,
          })),
        };
      },
  },
  update:
    (api: OmSupplyApi) =>
    async (patch: RecordPatch<Stocktake>): Promise<UpdateStocktakeInput> => {
      const input = createUpdateStocktakeInput(patch);
      const result = await api.updateStocktake({
        input: createUpdateStocktakeInput(patch),
      });

      const { updateStocktake } = result;

      if (updateStocktake.__typename === 'StocktakeNode') {
        return input;
      }

      throw new Error('Could not update stocktake');
    },
};
