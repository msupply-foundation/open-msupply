import { InvoiceNodeType } from "../codegenTypes";
import { AdjustmentLineNode, AdjustmentType, AdjustmentSource } from "./types";

export const filterByItemCodeOrName = (
  line: AdjustmentLineNode,
  itemCodeOrName: string
): boolean => {
  const search = itemCodeOrName.toLowerCase();
  return (
    line.item.code.toLowerCase().includes(search) ||
    line.item.name.toLowerCase().includes(search)
  );
};

// Membership is resolved from the item ids the query fetched for the chosen
// master list, rather than from each line's own master lists - see query.graphql
export const filterByMasterListId = (
  line: AdjustmentLineNode,
  masterListItemIds: Set<string>
): boolean => masterListItemIds.has(line.item?.id);

export const filterByLocationId = (
  line: AdjustmentLineNode,
  locationId: string
): boolean => line.location?.id === locationId;

export const filterByZeroedCount = (
  line: AdjustmentLineNode,
  showZeroedLines: boolean
): boolean => {
  if (showZeroedLines) return true;

  if (line.isFromStocktake) {
    return line.countedPacks !== 0;
  }
  return line.numberOfPacks !== 0;
};

export const filterByAdjustmentType = (
  line: AdjustmentLineNode,
  adjustmentType: AdjustmentType
): boolean => {
  if (adjustmentType === AdjustmentType.POSITIVE) {
    return line.invoiceType === InvoiceNodeType.InventoryAddition;
  }
  if (adjustmentType === AdjustmentType.NEGATIVE) {
    return line.invoiceType === InvoiceNodeType.InventoryReduction;
  }
  return true;
};

export const filterByAdjustmentSource = (
  line: AdjustmentLineNode,
  adjustmentSource: AdjustmentSource
): boolean => {
  if (adjustmentSource === AdjustmentSource.FINALISED_STOCKTAKE) {
    return line.isFromStocktake;
  }
  if (adjustmentSource === AdjustmentSource.INVENTORY_ADJUSTMENT) {
    return !line.isFromStocktake;
  }
  return true;
};

export const filterByReasonOptionId = (
  line: AdjustmentLineNode,
  reasonOptionId: string
): boolean => line.inventoryAdjustmentReason?.id === reasonOptionId;
