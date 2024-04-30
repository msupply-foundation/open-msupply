import { FnUtils } from '@openmsupply-client/common';
import { ItemRowFragment, StockLineFragment } from '@openmsupply-client/system';
import { StocktakeLineFragment } from './../../../api';

// A DraftLine is just a copy of a stocktake line, with some extra state flags.
// for:
// countThisLine - determines whether the user wants to count the line in the stocktake.
//                 the backend actually determines this by the countedNumberOfPacks field
//                 being `null` - but.. explicit is better than implicit.
// isCreated - determines whether the line is a new line, or an existing line and will determine
//             what mutation the line is sent with when saved.
// isUpdated - The same as isCreated but is sent with the update mutation.
//
export type DraftStocktakeLine = Omit<StocktakeLineFragment, '__typename'> & {
  countThisLine: boolean;
  isCreated?: boolean;
  isUpdated?: boolean;
};

export const DraftLine = {
  fromItem: (
    stocktakeId: string,
    item: ItemRowFragment,
    defaultPackSize: number
  ): DraftStocktakeLine => {
    return {
      stocktakeId,
      snapshotNumberOfPacks: 0,
      countThisLine: true,
      isCreated: true,
      isUpdated: false,
      id: FnUtils.generateUUID(),
      expiryDate: null,
      itemId: item.id,
      sellPricePerPack: 0,
      costPricePerPack: 0,
      packSize: defaultPackSize,
      location: null,
      itemName: item.name,
      item: {
        __typename: 'ItemNode',
        id: item.id,
        code: item.code,
        unitName: item.unitName,
        name: item.name,
      },
    };
  },
  fromStockLine: (
    stocktakeId: string,
    stockLine: StockLineFragment,
    countThisLine = false
  ): DraftStocktakeLine => {
    return {
      stocktakeId,
      isCreated: true,
      isUpdated: false,
      countThisLine,
      stockLine,
      ...stockLine,
      snapshotNumberOfPacks: stockLine.totalNumberOfPacks,
      expiryDate: stockLine.expiryDate ? stockLine.expiryDate : null,
      id: FnUtils.generateUUID(),
      itemName: stockLine.item.name,
      item: {
        __typename: 'ItemNode',
        id: stockLine.itemId,
        code: stockLine.item.code,
        unitName: stockLine.item.unitName,
        name: stockLine.item.name,
      },
    };
  },
  fromStocktakeLine: (
    stocktakeId: string,
    line: StocktakeLineFragment
  ): DraftStocktakeLine => {
    return {
      isCreated: false,
      isUpdated: false,
      countThisLine: true,
      ...line,
      stocktakeId,
    };
  },
};

export const get = {
  draftLinesFromStocktakeLines: (id: string, lines: StocktakeLineFragment[]) =>
    lines?.map(line => DraftLine.fromStocktakeLine(id, line)),
  draftLinesFromStockLines: (
    id: string,
    stockLines: StockLineFragment[],
    stocktakeLines: StocktakeLineFragment[]
  ) => {
    // Filter out any stock lines that already have a matching stocktake line.
    // as they're already being counted.
    const uncountedLines =
      stockLines.filter(
        ({ id }) =>
          !stocktakeLines?.some(({ stockLine }) => stockLine?.id === id)
      ) ?? [];

    // Default countThisLine to true when first adding an item to the stocktake.
    // I.e. when there are no stocktake lines for the item.
    return uncountedLines.map(line =>
      DraftLine.fromStockLine(id, line, !stocktakeLines?.length)
    );
  },
};
