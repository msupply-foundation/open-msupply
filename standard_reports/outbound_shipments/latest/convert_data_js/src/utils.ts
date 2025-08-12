import { InvoiceConnector, Output } from "./types";

export const processInvoiceLines = (
  invoices: InvoiceConnector | undefined,
): Output => {
  if (!invoices) {
    return { data: [] };
  }

  const itemTotals = new Map<string, number>();
  const itemCount = new Map<string, number>();
  
  invoices.nodes.forEach((invoice) => {
    invoice.lines.nodes.forEach((line) => {
      const itemCode = line.item.code;
      itemTotals.set(itemCode, (itemTotals.get(itemCode) || 0) + line.totalBeforeTax);
      itemCount.set(itemCode, (itemCount.get(itemCode) || 0) + 1);
    });
  });

  const result: Output = { data: [] };
  const itemOccurrences = new Map<string, number>();

  invoices.nodes.forEach((invoice) => {
    invoice.lines.nodes.forEach((line) => {
      const itemCode = line.item.code;
      const current = (itemOccurrences.get(itemCode) || 0) + 1;
      itemOccurrences.set(itemCode, current);
      const isLast = current === itemCount.get(itemCode);
      
      result.data.push({
        id: line.id,
        otherPartyName: invoice.otherPartyName,
        itemCode: line.item.code,
        itemName: line.item.name,
        batch: line.batch,
        expiryDate: line.expiryDate,
        packSize: line.packSize,
        numberOfPacks: line.numberOfPacks,
        numberOfUnits: line.numberOfPacks * line.packSize,
        costPricePerPack: line.costPricePerPack,
        totalCost: isLast ? itemTotals.get(itemCode)! : '-',
      });
    });
  });

  const sortedResult = result.data.sort((a, b) => a.itemName.localeCompare(b.itemName));

  return { data: sortedResult };
};