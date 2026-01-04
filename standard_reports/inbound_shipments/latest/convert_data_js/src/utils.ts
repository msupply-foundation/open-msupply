import { InvoiceConnector, Lines, Output } from "./types";

export const processInvoiceLines = (
  invoices: InvoiceConnector | undefined
): Output => {
  if (!invoices) {
    return { data: undefined };
  }

  const itemTotals = new Map<string, number>();
  const itemCount = new Map<string, number>();

  invoices.nodes.forEach((invoice) => {
    invoice.lines.nodes.forEach((line) => {
      const groupKey = `${line.item.code}-${invoice.otherPartyName}`;
      itemTotals.set(
        groupKey,
        (itemTotals.get(groupKey) || 0) +
          line.costPricePerPack * line.numberOfPacks
      );
      itemCount.set(groupKey, (itemCount.get(groupKey) || 0) + 1);
    });
  });

  const result: Lines = [];
  const itemOccurrences = new Map<string, number>();

  invoices.nodes.forEach((invoice) => {
    invoice.lines.nodes.forEach((line) => {
      const groupKey = `${line.item.code}-${invoice.otherPartyName}`;
      const current = (itemOccurrences.get(groupKey) || 0) + 1;
      itemOccurrences.set(groupKey, current);
      const isLast = current === itemCount.get(groupKey);

      result.push({
        id: line.id,
        itemCode: line.item.code,
        itemName: line.item.name,
        batch: line.batch,
        expiryDate: line.expiryDate,
        packSize: line.packSize,
        numberOfPacks: line.numberOfPacks,
        numberOfUnits: line.numberOfPacks * line.packSize,
        costPricePerPack: (line.costPricePerPack).toFixed(2),
        totalCost: isLast ? (itemTotals.get(groupKey)!).toFixed(2) : "-",
        otherPartyName: invoice.otherPartyName,
      });
    });
  });

  const sortedResult = result.sort(
    (a, b) =>
      a.itemName.localeCompare(b.itemName) ||
      a.otherPartyName.localeCompare(b.otherPartyName)
  );

  return {
    data: {
      lines: sortedResult,
    },
  };
};