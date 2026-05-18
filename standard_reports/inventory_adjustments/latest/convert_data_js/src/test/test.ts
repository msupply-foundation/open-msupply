import { convert_data } from "../convert_data";
import inputData from "./input.json";
import outputData from "./output.json";
import { describe, expect, it } from "@jest/globals";

describe("convert_data end-to-end", () => {
  it("transforms input data to expected output", () => {
    const result = convert_data(inputData as any);
    expect(result).toEqual(outputData);
  });

  it("returns empty lines for empty invoices", () => {
    const emptyInput = {
      data: {
        invoices: { nodes: [] },
        stocktakes: { nodes: [] },
        store: { id: "store-1", storeName: "Test Store" },
      },
      arguments: {},
    };
    const result = convert_data(emptyInput as any);
    expect(result.data.lines).toEqual([]);
  });

  it("includes date filters in output", () => {
    const inputWithDates = {
      data: {
        invoices: { nodes: [] },
        stocktakes: { nodes: [] },
        store: { id: "store-1", storeName: "Test Store" },
      },
      arguments: {
        adjustmentDateFrom: "2024-01-01T00:00:00Z",
        adjustmentDateTo: "2024-12-31T23:59:59Z",
      },
    };
    const result = convert_data(inputWithDates as any);
    expect(result.data.date.from).toBe("2024-01-01T00:00:00Z");
    expect(result.data.date.to).toBe("2024-12-31T23:59:59Z");
  });

  it("includes store data in output", () => {
    const input = {
      data: {
        invoices: { nodes: [] },
        stocktakes: { nodes: [] },
        store: { id: "store-1", storeName: "My Test Store" },
      },
      arguments: {},
    };
    const result = convert_data(input as any);
    expect(
      result.data.store.__typename === "StoreNode"
        ? result.data.store.storeName
        : undefined
    ).toBe("My Test Store");
  });
});
