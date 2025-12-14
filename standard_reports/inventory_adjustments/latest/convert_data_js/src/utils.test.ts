import { processLines } from "./utils";
import { InvoiceNode, StocktakeNode, AdjustmentType } from "./types";
import { InvoiceNodeType } from "../codegenTypes";

const createInvoiceLine = (overrides = {}) => ({
  id: "line-1",
  numberOfPacks: 50,
  stockLine: { id: "stock-line-1" },
  inventoryAdjustmentReason: { id: "reason-1", reason: "Stock count" },
  item: {
    id: "item-1",
    code: "ABC123",
    name: "Paracetamol 500mg",
    masterLists: [{ id: "ml-1", name: "Essential" }],
  },
  location: { id: "loc-1", code: "A1", name: "Shelf A1" },
  ...overrides,
});

const createInvoice = (overrides = {}): InvoiceNode =>
  ({
    id: "invoice-1",
    invoiceNumber: 1,
    type: InvoiceNodeType.InventoryAddition,
    verifiedDatetime: "2024-06-15T10:00:00Z",
    lines: { nodes: [createInvoiceLine()] },
    ...overrides,
  }) as unknown as InvoiceNode;

const createStocktakeLine = (overrides = {}) => ({
  id: "st-line-1",
  snapshotNumberOfPacks: 100,
  countedNumberOfPacks: 150,
  stockLine: { id: "stock-line-1" },
  ...overrides,
});

const createStocktake = (overrides = {}): StocktakeNode =>
  ({
    id: "stocktake-1",
    stocktakeNumber: 1,
    inventoryAdditionId: "invoice-1",
    inventoryReductionId: null,
    lines: { nodes: [createStocktakeLine()] },
    ...overrides,
  }) as unknown as StocktakeNode;

describe("processLines", () => {
  describe("Basic Processing", () => {
    it("returns empty array for empty/null invoices", () => {
      expect(processLines([], [], {})).toEqual([]);
      expect(processLines(null as any, [], {})).toEqual([]);
    });

    it("flattens invoice lines with context", () => {
      const result = processLines([createInvoice()], [], {});
      expect(result).toHaveLength(1);
      expect(result[0].invoiceId).toBe("invoice-1");
    });
  });

  describe("Adjustment Calculation", () => {
    it("calculates direct addition: numberOfPacks", () => {
      const invoice = createInvoice({
        id: "inv-99",
        type: InvoiceNodeType.InventoryAddition,
      });
      const result = processLines([invoice], [], {});
      expect(result[0].adjustmentPacks).toBe(50);
      expect(result[0].isFromStocktake).toBe(false);
    });

    it("calculates direct reduction: -numberOfPacks", () => {
      const invoice = createInvoice({
        id: "inv-99",
        type: InvoiceNodeType.InventoryReduction,
      });
      const result = processLines([invoice], [], {});
      expect(result[0].adjustmentPacks).toBe(-50);
    });

    it("calculates stocktake addition: counted - snapshot", () => {
      const invoice = createInvoice({
        id: "invoice-1",
        type: InvoiceNodeType.InventoryAddition,
      });
      const stocktake = createStocktake({
        inventoryAdditionId: "invoice-1",
        lines: {
          nodes: [
            createStocktakeLine({
              snapshotNumberOfPacks: 100,
              countedNumberOfPacks: 150,
            }),
          ],
        },
      });
      const result = processLines([invoice], [stocktake], {});
      expect(result[0].adjustmentPacks).toBe(50); // 150 - 100
      expect(result[0].isFromStocktake).toBe(true);
    });

    it("calculates stocktake reduction: counted - snapshot (negative)", () => {
      const invoice = createInvoice({
        id: "invoice-1",
        type: InvoiceNodeType.InventoryReduction,
      });
      const stocktake = createStocktake({
        inventoryAdditionId: null,
        inventoryReductionId: "invoice-1",
        lines: {
          nodes: [
            createStocktakeLine({
              snapshotNumberOfPacks: 100,
              countedNumberOfPacks: 70,
            }),
          ],
        },
      });
      const result = processLines([invoice], [stocktake], {});
      expect(result[0].adjustmentPacks).toBe(-30); // 70 - 100
    });
  });

  describe("Stocktake Linking", () => {
    it("links via inventoryAdditionId", () => {
      const result = processLines([createInvoice()], [createStocktake()], {});
      expect(result[0].isFromStocktake).toBe(true);
      expect(result[0].snapshotPacks).toBe(100);
      expect(result[0].countedPacks).toBe(150);
    });

    it("links via inventoryReductionId", () => {
      const invoice = createInvoice({
        id: "inv-red",
        type: InvoiceNodeType.InventoryReduction,
      });
      const stocktake = createStocktake({
        inventoryAdditionId: null,
        inventoryReductionId: "inv-red",
      });
      const result = processLines([invoice], [stocktake], {});
      expect(result[0].isFromStocktake).toBe(true);
    });

    it("marks as direct when no stocktake link", () => {
      const invoice = createInvoice({ id: "inv-99" });
      const result = processLines([invoice], [createStocktake()], {});
      expect(result[0].isFromStocktake).toBe(false);
      expect(result[0].snapshotPacks).toBeNull();
      expect(result[0].countedPacks).toBeNull();
    });
  });

  describe("Filters", () => {
    it("filters by item code/name (case insensitive)", () => {
      const invoice = createInvoice({ id: "inv-99" });
      expect(
        processLines([invoice], [], { itemCodeOrName: "para" })
      ).toHaveLength(1);
      expect(
        processLines([invoice], [], { itemCodeOrName: "xyz" })
      ).toHaveLength(0);
    });

    it("filters by adjustment type", () => {
      const invoices = [
        createInvoice({ id: "inv-1", type: InvoiceNodeType.InventoryAddition }),
        createInvoice({
          id: "inv-2",
          type: InvoiceNodeType.InventoryReduction,
        }),
      ];
      expect(
        processLines(invoices, [], { adjustmentType: AdjustmentType.POSITIVE })
      ).toHaveLength(1);
      expect(
        processLines(invoices, [], { adjustmentType: AdjustmentType.NEGATIVE })
      ).toHaveLength(1);
    });

    it("filters by zeroed count - stocktake (countedPacks === 0)", () => {
      const invoice = createInvoice({ id: "invoice-1" });
      const stocktake = createStocktake({
        lines: { nodes: [createStocktakeLine({ countedNumberOfPacks: 0 })] },
      });
      const result = processLines([invoice], [stocktake], {
        zeroedCount: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].countedPacks).toBe(0);
    });

    it("filters by zeroed count - direct adjustment (numberOfPacks === 0)", () => {
      const invoice = createInvoice({
        id: "inv-99",
        lines: { nodes: [createInvoiceLine({ numberOfPacks: 0 })] },
      });
      const result = processLines([invoice], [], { zeroedCount: true });
      expect(result).toHaveLength(1);
    });

    it("includes non-zero when zeroedCount is true", () => {
      const invoice = createInvoice({ id: "inv-99" }); // numberOfPacks: 50
      const result = processLines([invoice], [], { zeroedCount: true });
      expect(result).toHaveLength(1);
    });

    it("filters by location, master list, and reason", () => {
      const invoice = createInvoice({ id: "inv-99" });
      expect(processLines([invoice], [], { locationId: "loc-1" })).toHaveLength(
        1
      );
      expect(
        processLines([invoice], [], { locationId: "loc-999" })
      ).toHaveLength(0);
      expect(
        processLines([invoice], [], { masterListId: "ml-1" })
      ).toHaveLength(1);
      expect(
        processLines([invoice], [], { reasonId: "reason-1" })
      ).toHaveLength(1);
    });
  });

  describe("Sorting", () => {
    it("sorts by item code", () => {
      const invoices = [
        createInvoice({
          id: "inv-1",
          lines: {
            nodes: [
              createInvoiceLine({
                item: { code: "ZZZ", name: "Z", masterLists: [] },
              }),
            ],
          },
        }),
        createInvoice({
          id: "inv-2",
          lines: {
            nodes: [
              createInvoiceLine({
                item: { code: "AAA", name: "A", masterLists: [] },
              }),
            ],
          },
        }),
      ];
      const result = processLines(invoices, [], {
        sort: "item.code",
        dir: "asc",
      });
      expect(result.map((l) => l.item?.code)).toEqual(["AAA", "ZZZ"]);
    });
  });
});
