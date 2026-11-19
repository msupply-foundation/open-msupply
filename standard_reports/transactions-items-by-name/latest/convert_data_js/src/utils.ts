import { Amount, Column, Crosstab, ItemByName, Row, Show } from "./types";

const byNameThenCode = (
  a: { name: string; code: string },
  b: { name: string; code: string },
) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code);

const add = (total: Amount, amount: Amount) => {
  total.quantity += amount.quantity;
  total.value += amount.value;
};

/**
 * Lays out the item and other party totals as a grid: items in rows, other
 * parties in columns, each sorted by name. A column is only made for a name
 * the item rows reach, as in legacy mSupply's cross-tab.
 */
export const crosstab = (
  rows: ItemByName[],
  show: Show = "QUANTITY",
): Crosstab => {
  const columns = new Map<string, Column>();
  const items = new Map<
    string,
    Omit<Row, "cells"> & { cells: Map<string, Amount> }
  >();

  for (const row of rows) {
    if (!columns.has(row.name_id)) {
      columns.set(row.name_id, {
        id: row.name_id,
        code: row.name_code,
        name: row.name_name,
      });
    }
    let item = items.get(row.item_id);
    if (!item) {
      item = {
        code: row.item_code,
        name: row.item_name,
        unit: row.unit ?? "",
        cells: new Map(),
        total: { quantity: 0, value: 0 },
      };
      items.set(row.item_id, item);
    }
    const amount = { quantity: row.quantity, value: row.value };
    // The query gives one row per item and name, but adding keeps a repeat right
    const cell = item.cells.get(row.name_id);
    if (cell) add(cell, amount);
    else item.cells.set(row.name_id, { ...amount });
    add(item.total, amount);
  }

  const sortedColumns = [...columns.values()].sort(byNameThenCode);
  const columnTotals = sortedColumns.map(() => ({ quantity: 0, value: 0 }));
  const total = { quantity: 0, value: 0 };

  const sortedRows: Row[] = [...items.values()]
    .sort(byNameThenCode)
    .map((item) => {
      const cells = sortedColumns.map((column, index) => {
        const cell = item.cells.get(column.id) ?? null;
        if (cell) add(columnTotals[index], cell);
        return cell;
      });
      add(total, item.total);
      return { ...item, cells };
    });

  return {
    showQuantity: show !== "VALUE",
    showValue: show !== "QUANTITY",
    columns: sortedColumns,
    rows: sortedRows,
    columnTotals,
    total,
  };
};
