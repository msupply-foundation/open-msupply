import { ConvertData, Data, Result, Arguments } from "./types";
import { processLines } from "./utils";

const extractInvoices = (data: Data) => {
  return data?.invoices?.nodes ?? [];
};

const extractStocktakes = (data: Data) => {
  return data?.stocktakes?.nodes ?? [];
};

const extractMasterListItemIds = (data: Data) =>
  new Set((data?.masterListItems?.nodes ?? []).map((item) => item.id));

const buildResult = (
  data: Data,
  filters: Arguments,
  processedLines: ReturnType<typeof processLines>
): Result => ({
  data: {
    date: {
      from: filters.adjustmentDateFrom,
      to: filters.adjustmentDateTo,
    },
    lines: processedLines,
    store: data?.store,
  },
});

export const convert_data: ConvertData<Data, Arguments, Result> = ({
  data,
  arguments: filters,
}) => {
  const invoices = extractInvoices(data);
  const stocktakes = extractStocktakes(data);
  const masterListItemIds = extractMasterListItemIds(data);
  const processedLines = processLines(
    invoices,
    stocktakes,
    filters,
    masterListItemIds
  );
  return buildResult(data, filters, processedLines);
};
