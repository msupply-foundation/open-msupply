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

  it("keeps small pack prices to four decimals", () => {
    const input = JSON.parse(JSON.stringify(inputData));
    input.data.purchaseOrder.lines.nodes = [
      { lineNumber: 1, pricePerPackAfterSupplierDiscount: 0.0125 },
      { lineNumber: 2, pricePerPackAfterSupplierDiscount: 4.9 },
      { lineNumber: 3, pricePerPackAfterSupplierDiscount: 1.23456 },
    ];

    const prices = convert_data(input).data.purchaseOrder.lines.nodes.map(
      (line) => line.pricePerPack,
    );

    expect(prices).toEqual(["0.0125", "4.90", "1.2346"]);
  });
});
