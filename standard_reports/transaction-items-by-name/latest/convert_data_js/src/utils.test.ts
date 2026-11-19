import { crosstab } from "./utils";
import { ItemByName } from "./types";

const row = (overrides: Partial<ItemByName>): ItemByName => ({
  item_id: "paracetamol",
  item_code: "P1",
  item_name: "Paracetamol",
  unit: "Tablet",
  name_id: "clinic-b",
  name_code: "CB",
  name_name: "Clinic B",
  quantity: 10,
  value: 1,
  ...overrides,
});

const rows = [
  row({}),
  row({
    name_id: "clinic-a",
    name_code: "CA",
    name_name: "Clinic A",
    quantity: 5,
    value: 0.5,
  }),
  row({
    item_id: "amoxicillin",
    item_code: "A1",
    item_name: "Amoxicillin",
    unit: null,
    quantity: 20,
    value: 4,
  }),
];

describe("crosstab", () => {
  it("puts items in rows and other parties in columns, each sorted by name (OMS-REG-RPT-13.1, .2)", () => {
    const result = crosstab(rows);
    expect(result.columns.map((column) => column.name)).toEqual([
      "Clinic A",
      "Clinic B",
    ]);
    expect(result.rows.map((item) => item.name)).toEqual([
      "Amoxicillin",
      "Paracetamol",
    ]);
  });

  it("leaves a cell empty where the item had nothing with that name (OMS-REG-RPT-13.3)", () => {
    const [amoxicillin, paracetamol] = crosstab(rows).rows;
    expect(amoxicillin.cells).toEqual([null, { quantity: 20, value: 4 }]);
    expect(paracetamol.cells).toEqual([
      { quantity: 5, value: 0.5 },
      { quantity: 10, value: 1 },
    ]);
  });

  it("totals each row, each column and the whole grid (OMS-REG-RPT-13.5)", () => {
    const result = crosstab(rows);
    expect(result.rows.map((item) => item.total)).toEqual([
      { quantity: 20, value: 4 },
      { quantity: 15, value: 1.5 },
    ]);
    expect(result.columnTotals).toEqual([
      { quantity: 5, value: 0.5 },
      { quantity: 30, value: 5 },
    ]);
    expect(result.total).toEqual({ quantity: 35, value: 5.5 });
  });

  it("shows an item without a unit as a blank unit (OMS-REG-RPT-13.1)", () => {
    expect(crosstab(rows).rows[0].unit).toBe("");
  });

  it("shows quantity by default, and value or both when asked (OMS-REG-RPT-13.4, .6)", () => {
    expect(crosstab(rows)).toMatchObject({
      showQuantity: true,
      showValue: false,
    });
    expect(crosstab(rows, "VALUE")).toMatchObject({
      showQuantity: false,
      showValue: true,
    });
    expect(crosstab(rows, "BOTH")).toMatchObject({
      showQuantity: true,
      showValue: true,
    });
  });

  it("gives an empty grid when nothing matches", () => {
    expect(crosstab([])).toMatchObject({
      columns: [],
      rows: [],
      total: { quantity: 0, value: 0 },
    });
  });
});
