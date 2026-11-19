export type Show = "QUANTITY" | "VALUE" | "BOTH";

/** A row of itemsByName.sql: one item with one other party. */
export type ItemByName = {
  item_id: string;
  item_code: string;
  item_name: string;
  unit: string | null;
  name_id: string;
  name_code: string;
  name_name: string;
  quantity: number;
  value: number;
};

export type Input = {
  arguments?: { show?: Show } & Record<string, unknown>;
  data?: { itemsByName?: ItemByName[] };
};

/** Units and value, as one cell of the grid or a total of several. */
export type Amount = { quantity: number; value: number };

export type Column = { id: string; code: string; name: string };

export type Row = {
  code: string;
  name: string;
  unit: string;
  /** One per column, in column order; null where the item had no transactions with that name. */
  cells: (Amount | null)[];
  total: Amount;
};

export type Crosstab = {
  showQuantity: boolean;
  showValue: boolean;
  columns: Column[];
  rows: Row[];
  /** The total of each column, in column order. */
  columnTotals: Amount[];
  total: Amount;
};

export type Output = {
  arguments?: Input["arguments"];
  data: Crosstab;
};
