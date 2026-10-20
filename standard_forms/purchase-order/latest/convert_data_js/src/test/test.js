import { convert_data } from "../convert_data";
import inputData from "./input.json";
import outputData from "./output.json";
import { describe, expect, it } from "@jest/globals";

describe("Test all", () => {
  it("test all", () => {
    const result = convert_data(inputData);
    expect(result).toEqual(outputData);
  });

  // The order from #1589: a 12.50 subtotal and a 40% supplier discount, at an
  // exchange rate of 2
  it("totals the order as the app does", () => {
    const input = JSON.parse(JSON.stringify(inputData));
    Object.assign(input.data.purchaseOrder, {
      orderTotalBeforeDiscount: 12.5,
      supplierDiscountAmount: 5,
      orderTotalAfterDiscount: 7.5,
      foreignExchangeRate: 2,
      lines: {
        nodes: [
          {
            lineNumber: 1,
            requestedNumberOfUnits: 100,
            requestedPackSize: 2,
            lineTotalAfterSupplierDiscount: 7.5,
          },
        ],
      },
    });

    const po = convert_data(input).data.purchaseOrder;

    expect(po.lines.nodes[0].lineCost).toBe("7.50");
    expect(po.lines.nodes[0].requestedNumberOfPacks).toBe(50);
    expect(po.totalCost).toBe(7.5);
    expect(po.estimatedCost).toBe(15);
  });
});
