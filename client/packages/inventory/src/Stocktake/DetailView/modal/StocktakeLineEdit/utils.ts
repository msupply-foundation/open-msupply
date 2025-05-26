import { FnUtils } from '@openmsupply-client/common';
import { StockLineFragment } from '@openmsupply-client/system';
import { StocktakeLineFragment } from './../../../api';

// A DraftStocktakeLine represents a stocktake line with additional state flags:
//   - countThisLine: Indicates whether the user wants to count the line in the stocktake.
//     The backend determines this by the `countedNumberOfPacks` field being `null`, but this flag
//     makes it explicit.
//   - isCreated: Indicates whether the line is a new line. Determines the mutation type when saved.
//   - isUpdated: Indicates whether the line has been updated. Determines the
//     mutation type when saved.
export type DraftStocktakeLine = Omit<StocktakeLineFragment, '__typename'> & {
  countThisLine: boolean;
  isCreated?: boolean;
  isUpdated?: boolean;
};

export const DraftLine = {
  fromItem: (
    stocktakeId: string,
    item: StocktakeLineFragment['item']
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
      packSize: item.defaultPackSize,
      location: null,
      itemName: item.name,
      item: {
        __typename: 'ItemNode',
        id: item.id,
        code: item.code,
        unitName: item.unitName,
        name: item.name,
        isVaccine: item.isVaccine,
        doses: item.doses,
        defaultPackSize: item.defaultPackSize,
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
      itemVariantId: stockLine.itemVariantId,
      itemVariant: stockLine.itemVariant,
      donorId: stockLine.donor?.id,
      item: {
        __typename: 'ItemNode',
        id: stockLine.itemId,
        code: stockLine.item.code,
        unitName: stockLine.item.unitName,
        name: stockLine.item.name,
        isVaccine: stockLine.item.isVaccine,
        doses: stockLine.item.doses,
        defaultPackSize: stockLine.item.defaultPackSize,
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
