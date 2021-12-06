import { flattenStocktakeItems } from './../../utils';
import { StocktakeController } from './../../types';
import {
  ConnectorError,
  OmSupplyApi,
  StocktakeQuery,
  StocktakeLineNode,
  StocktakeLineConnector,
  UpdateStocktakeInput,
  UpdateStocktakeLineInput,
  InsertStocktakeLineInput,
  DeleteStocktakeLineInput,
} from '@openmsupply-client/common';
import { StocktakeLine, Stocktake } from '../../types';

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
    return stocktakeLines.nodes;
  }

  if (stocktakeLines.__typename === 'ConnectorError') {
    throw new Error('Error fetching lines for stocktake');
  }

  throw new Error('Unknown');
};

const createUpdateStocktakeInput = (
  patch: StocktakeController
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
  line: StocktakeLine
): UpdateStocktakeLineInput => {
  return {
    ...line,
  };
};

const createInsertStocktakeLineInput =
  (stocktake: StocktakeController) =>
  (line: StocktakeLine): InsertStocktakeLineInput => {
    return {
      stocktakeId: stocktake.id,
      ...line,
    };
  };

const createDeleteStocktakeLineInput = (
  line: StocktakeLine
): DeleteStocktakeLineInput => {
  return {
    ...line,
  };
};

interface Api<ReadType, UpdateType> {
  onRead: (id: string) => Promise<ReadType>;
  onUpdate: (val: UpdateType) => Promise<UpdateType>;
}

export const getStocktakeDetailViewApi = (
  api: OmSupplyApi
): Api<Stocktake, StocktakeController> => ({
  onRead: async (id: string): Promise<Stocktake> => {
    const result = await api.stocktake({ stocktakeId: id });

    const stocktake = stocktakeGuard(result);
    const lines = linesGuard(stocktake.lines);

    return {
      ...stocktake,
      stocktakeDatetime: stocktake.stocktakeDatetime
        ? new Date(stocktake.stocktakeDatetime)
        : null,
      entryDatetime: new Date(stocktake.entryDatetime),

      lines,
    };
  },
  onUpdate: async (
    patch: StocktakeController
  ): Promise<StocktakeController> => {
    const deleteLines = flattenStocktakeItems(patch.lines).filter(
      ({ isDeleted }) => isDeleted
    );
    const insertLines = flattenStocktakeItems(patch.lines).filter(
      ({ isCreated, isDeleted }) => !isDeleted && isCreated
    );
    const updateLines = flattenStocktakeItems(patch.lines).filter(
      ({ isUpdated, isCreated, isDeleted }) =>
        isUpdated && !isCreated && !isDeleted
    );

    const result = await api.upsertStocktake({
      updateStocktakes: [createUpdateStocktakeInput(patch)],
      insertStocktakeLines: insertLines.map(
        createInsertStocktakeLineInput(patch)
      ),
      deleteStocktakeLines: deleteLines.map(createDeleteStocktakeLineInput),
      updateStocktakeLines: updateLines.map(createUpdateStocktakeLineInput),
    });

    const { batchStocktake } = result;

    if (batchStocktake.__typename === 'BatchStocktakeResponse') {
      const { updateStocktakes } = batchStocktake;
      if (
        updateStocktakes?.[0]?.__typename === 'UpdateStocktakeResponseWithId'
      ) {
        return patch;
      }
    }

    throw new Error('Could not update stocktake');
  },
});
