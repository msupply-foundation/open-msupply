import { DraftStocktakeLine } from './../DetailView/modal/StocktakeLineEdit/hooks';
import {
  formatNaiveDate,
  InsertStocktakeLineInput,
  UpdateStocktakeLineInput,
  ConnectorError,
  OmSupplyApi,
  StocktakeQuery,
  StocktakeLineNode,
  StocktakeLineConnector,
  UpdateStocktakeInput,
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

const createUpdateStocktakeLineInput = (
  line: DraftStocktakeLine
): UpdateStocktakeLineInput => {
  return {
    batch: line.batch ?? '',
    costPricePerPack: line.costPricePerPack,
    sellPricePerPack: line.sellPricePerPack,
    id: line.id,
    countedNumPacks: line.countedNumPacks,
    expiryDate: line.expiryDate ? formatNaiveDate(line.expiryDate) : undefined,
  };
};

const createInsertStocktakeLineInput = (
  line: DraftStocktakeLine
): InsertStocktakeLineInput => {
  return {
    batch: line.batch ?? '',
    costPricePerPack: line.costPricePerPack,
    countedNumPacks: line.countedNumPacks,
    id: line.id,
    itemId: line.itemId,
    sellPricePerPack: line.sellPricePerPack,
    stocktakeId: line.stocktakeId,
    expiryDate: line.expiryDate ? formatNaiveDate(line.expiryDate) : undefined,
  };
};

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
            expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
            countThisLine: true,
          })),
        };
      },
  },
  updateLines:
    (api: OmSupplyApi) => async (draftStocktakeLines: DraftStocktakeLine[]) => {
      const input = {
        insertStocktakeLines: draftStocktakeLines
          .filter(({ isCreated }) => isCreated)
          .map(createInsertStocktakeLineInput),
        updateStocktakeLines: draftStocktakeLines
          .filter(({ isCreated, isUpdated }) => !isCreated && isUpdated)
          .map(createUpdateStocktakeLineInput),
      };

      const result = await api.upsertStocktakeLines(input);

      return result;
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
