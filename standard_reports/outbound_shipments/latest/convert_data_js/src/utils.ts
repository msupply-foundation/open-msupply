import { InvoiceConnector, Output } from "./types";

export const processInvoiceLines = (
  invoices: InvoiceConnector | undefined,
  before?: string,
  after?: string
): Output => {
  if (!invoices) {
    return { data: [] };
  }

  const result: Output = { data: [] };
 
  invoices.nodes.forEach((invoice) => {
    invoice.lines.nodes.forEach((line) => {
        result.data.push({
          id: line.id,
          itemCode: line.item.code,
          itemName: line.item.name,
          batch: line.batch,
          expiryDate: line.expiryDate,
          packSize: line.packSize,
          numberOfPacks: line.numberOfPacks,
          numberOfUnits: line.numberOfPacks * line.packSize,
          costPricePerPack: line.costPricePerPack,
          totalCost: line.totalBeforeTax,
        });
    });
  });

  return result;
};
