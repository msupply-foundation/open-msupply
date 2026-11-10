import { InvoiceConnector, Lines, Output } from "./types";

// Unshipped invoices (null date) sort after shipped ones
const compareDates = (a: string | null, b: string | null) =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a.localeCompare(b);

export const processInvoiceLines = (
  invoices: InvoiceConnector | undefined
): Output => {
  if (!invoices) {
    return { data: undefined };
  }

  const rows = invoices.nodes.flatMap((invoice) =>
    invoice.lines.nodes.map((line) => ({
      line,
      otherPartyName: invoice.otherPartyName,
      invoiceNumber: invoice.invoiceNumber,
      shippedDatetime: invoice.shippedDatetime,
    }))
  );

  rows.sort(
    (a, b) =>
      a.line.item.name.localeCompare(b.line.item.name) ||
      a.line.item.code.localeCompare(b.line.item.code) ||
      a.otherPartyName.localeCompare(b.otherPartyName) ||
      compareDates(a.shippedDatetime, b.shippedDatetime) ||
      a.invoiceNumber - b.invoiceNumber
  );

  // Rows of an item/customer group are now adjacent: the group total goes on its last row
  const groupKey = (row: (typeof rows)[number]) =>
    `${row.line.item.code}-${row.otherPartyName}`;
  let groupTotal = 0;
  const result: Lines = rows.map((row, index) => {
    const { line } = row;
    groupTotal += line.costPricePerPack * line.numberOfPacks;
    const next = rows[index + 1];
    const isLast = !next || groupKey(next) !== groupKey(row);
    const totalCost = isLast ? groupTotal.toFixed(2) : "-";
    if (isLast) groupTotal = 0;

    return {
      id: line.id,
      itemCode: line.item.code,
      itemName: line.item.name,
      batch: line.batch,
      expiryDate: line.expiryDate,
      packSize: line.packSize,
      numberOfPacks: line.numberOfPacks,
      numberOfUnits: line.numberOfPacks * line.packSize,
      costPricePerPack: line.costPricePerPack,
      totalCost,
      otherPartyName: row.otherPartyName,
      invoiceNumber: row.invoiceNumber,
      shippedDatetime: row.shippedDatetime,
    };
  });

  return {
    data: {
      lines: result,
    },
  };
};
