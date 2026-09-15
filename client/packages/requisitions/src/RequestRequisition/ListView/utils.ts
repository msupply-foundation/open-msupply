import { RecentStocktakeItemsQuery } from '../api/operations.generated';

/**
 * Calculates the number of unique item IDs across all stocktake lines
 */
export const getUniqueItemCountInStocktakeLines = (
  stocktakeData: RecentStocktakeItemsQuery['stocktakes']['nodes']
): number => {
  const uniqueItemIds = new Set<string>();

  stocktakeData.forEach(stocktake => {
    stocktake.lines.nodes.forEach(line => {
      uniqueItemIds.add(line.itemId);
    });
  });

  return uniqueItemIds.size;
};
