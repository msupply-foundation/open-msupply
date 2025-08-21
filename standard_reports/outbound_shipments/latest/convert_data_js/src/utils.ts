import { InvoiceConnector, Lines, Output } from "./types";

export const processInvoiceLines = (
  invoices: InvoiceConnector | undefined,
): Output => {
  if (!invoices) {
    return { data: undefined };
  }

  const itemTotals = new Map<string, number>();
  const itemCount = new Map<string, number>();

  invoices.nodes.forEach((invoice) => {
    invoice.lines.nodes.forEach((line) => {
      const itemCode = line.item.code;
      itemTotals.set(
        itemCode,
        (itemTotals.get(itemCode) || 0) + line.totalBeforeTax
      );
      itemCount.set(itemCode, (itemCount.get(itemCode) || 0) + 1);
    });
  });

  const result: Lines = [];
  const itemOccurrences = new Map<string, number>();

  invoices.nodes.forEach((invoice) => {
    invoice.lines.nodes.forEach((line) => {
      const itemCode = line.item.code;
      const current = (itemOccurrences.get(itemCode) || 0) + 1;
      itemOccurrences.set(itemCode, current);
      const isLast = current === itemCount.get(itemCode);

      result.push({
        id: line.id,
        itemCode: line.item.code,
        itemName: line.item.name,
        batch: line.batch,
        expiryDate: line.expiryDate,
        packSize: line.packSize,
        numberOfPacks: line.numberOfPacks,
        numberOfUnits: line.numberOfPacks * line.packSize,
        costPricePerPack: line.costPricePerPack,
        totalCost: isLast ? itemTotals.get(itemCode)! : "-",
        otherPartyName: invoice.otherPartyName,
      });
    });
  });

  const sortedResult = result.sort((a, b) =>
    a.itemName.localeCompare(b.itemName) || a.otherPartyName.localeCompare(b.otherPartyName)
  );

  return {
    data: {
      lines: sortedResult,
    },
  };
};
