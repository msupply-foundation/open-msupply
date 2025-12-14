import { InvoiceNodeType } from "../codegenTypes";
import { Filters } from "./generated-types/arguments";
import {
  AdjustmentLineNode,
  AdjustmentSource,
  AdjustmentType,
  SortDirection,
  SortKey,
  InvoiceNode,
  StocktakeNode,
  StocktakeLineNode,
} from "./types";
import {
  filterByItemCodeOrName,
  filterByMasterListId,
  filterByLocationId,
  filterByZeroedCount,
  filterByAdjustmentType,
  filterByAdjustmentSource,
  filterByReasonOptionId,
} from "./filters";
import { sortByKey } from "./sorting";

type StocktakeMaps = {
  invoiceToStocktake: Map<string, StocktakeNode>;
  stockLineToStocktakeLine: Map<string, StocktakeLineNode>;
};

const buildStocktakeMaps = (stocktakes: StocktakeNode[]): StocktakeMaps => {
  const invoiceToStocktake = new Map<string, StocktakeNode>();
  const stockLineToStocktakeLine = new Map<string, StocktakeLineNode>();

  for (const stocktake of stocktakes) {
    if (!stocktake) continue;
    // Build map of invoice id to stocktake (for linked stocktakes)
    if (stocktake.inventoryAdditionId) {
      invoiceToStocktake.set(stocktake.inventoryAdditionId, stocktake);
    }
    if (stocktake.inventoryReductionId) {
      invoiceToStocktake.set(stocktake.inventoryReductionId, stocktake);
    }

    if (!stocktake?.lines?.nodes) continue;
    // Build map of stockline id to stocktake line (for linked stocktake lines)
    for (const line of stocktake.lines.nodes) {
      if (line?.stockLine?.id) {
        stockLineToStocktakeLine.set(line.stockLine.id, line);
      }
    }
  }

  return { invoiceToStocktake, stockLineToStocktakeLine };
};

const calculateAdjustmentPacks = (
  invoiceType: string,
  numberOfPacks: number | null,
  isFromStocktake: boolean,
  snapshotPacks: number | null,
  countedPacks: number | null
): number => {
  let adjustment: number;

  if (isFromStocktake && !!snapshotPacks && !!countedPacks) {
    adjustment = countedPacks - snapshotPacks;
  } else {
    const packs = numberOfPacks ?? 0;
    adjustment =
      invoiceType === InvoiceNodeType.InventoryAddition ? packs : -packs;
  }

  return adjustment;
};

// Generates adjustment lines with invoice and stocktake context
const getAdjustmentLines = (
  invoices: InvoiceNode[],
  stocktakes: StocktakeNode[]
): AdjustmentLineNode[] => {
  const { invoiceToStocktake, stockLineToStocktakeLine } =
    buildStocktakeMaps(stocktakes);
  const lines: AdjustmentLineNode[] = [];

  for (const invoice of invoices) {
    if (!invoice?.lines?.nodes) continue;

    const linkedStocktake = invoiceToStocktake.get(invoice.id) ?? null;
    const isFromStocktake = linkedStocktake !== null;

    for (const line of invoice.lines.nodes) {
      if (!line) continue;

      // Get corresponding stocktake line if from stocktake
      const stocktakeLine = stockLineToStocktakeLine.get(
        line.stockLine?.id ?? ""
      );
      const snapshotPacks =
        isFromStocktake && stocktakeLine
          ? stocktakeLine.snapshotNumberOfPacks
          : null;

      // Determine counted packs based on source (stocktake or invoice)
      const countedPacks =
        isFromStocktake && stocktakeLine
          ? (stocktakeLine.countedNumberOfPacks ?? 0)
          : null;

      // let adjustmentPacks: number | null;
      // if (isFromStocktake && stocktakeLine) {
      //   adjustmentPacks = calculateDifference(stocktakeLine);
      // } else {
      //   // Format adjustment: positive for addition, negative for reduction
      //   adjustmentPacks =
      //     invoice.type === InvoiceNodeType.InventoryReduction
      //       ? -line.numberOfPacks
      //       : line.numberOfPacks;
      // }

      lines.push({
        ...line,
        invoiceId: invoice.id,
        invoiceType: invoice.type,
        verifiedDatetime: invoice.verifiedDatetime ?? null,
        stocktakeId: linkedStocktake?.id ?? null,
        isFromStocktake,
        snapshotPacks,
        countedPacks,
        adjustmentPacks: calculateAdjustmentPacks(
          invoice.type,
          line.numberOfPacks,
          isFromStocktake,
          snapshotPacks,
          countedPacks
        ),
      });
    }
  }

  return lines;
};

const applyFilter = <T>(
  include: boolean,
  filterValue: T | null | undefined,
  filterFn: (value: NonNullable<T>) => boolean
): boolean => {
  if (!include || filterValue == null) return include;
  return filterFn(filterValue as NonNullable<T>);
};

const shouldIncludeLine = (
  line: AdjustmentLineNode,
  filters: Filters
): boolean => {
  let include = true;

  include = applyFilter(include, filters.itemCodeOrName, (value) =>
    filterByItemCodeOrName(line, value)
  );

  include = applyFilter(include, filters.masterListId, (value) =>
    filterByMasterListId(line, value)
  );

  include = applyFilter(include, filters.locationId, (value) =>
    filterByLocationId(line, value)
  );

  include = applyFilter(include, filters.adjustmentType, (value) =>
    filterByAdjustmentType(line, value as AdjustmentType)
  );

  include = applyFilter(include, filters.reasonOptionId, (value) =>
    filterByReasonOptionId(line, value)
  );

  include = applyFilter(include, filters.adjustmentSource, (value) =>
    filterByAdjustmentSource(line, value as AdjustmentSource)
  );

  if (filters.showZeroedLines !== undefined) {
    include = include && filterByZeroedCount(line, filters.showZeroedLines);
  }

  return include;
};

// Apply all filters to lines
const applyFilters = (
  lines: AdjustmentLineNode[],
  filters: Filters
): AdjustmentLineNode[] => {
  if (!lines?.length) return [];
  return lines.filter((line) => shouldIncludeLine(line, filters));
};

// Process lines: apply filters and sort the result
export const processLines = (
  invoices: InvoiceNode[],
  stocktakes: StocktakeNode[],
  filters: Filters
): AdjustmentLineNode[] => {
  if (!invoices?.length) return [];

  const adjustmentLines = getAdjustmentLines(invoices, stocktakes);
  const filteredLines = applyFilters(adjustmentLines, filters);
  return sortByKey(
    filteredLines,
    filters.sort as SortKey,
    filters.dir as SortDirection
  );
};
