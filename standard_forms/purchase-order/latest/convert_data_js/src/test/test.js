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

  it("prints thousands separators", () => {
    const input = JSON.parse(JSON.stringify(inputData));
    input.data.purchaseOrder.orderTotalAfterDiscount = 1234567.891;
    input.data.purchaseOrder.lines.nodes = [
      {
        lineNumber: 1,
        requestedNumberOfUnits: 40000,
        requestedPackSize: 1000,
        pricePerPackAfterSupplierDiscount: 1250.5,
        lineTotalAfterSupplierDiscount: 50020,
      },
    ];

    const po = convert_data(input).data.purchaseOrder;
    const line = po.lines.nodes[0];

    expect(line.packSizeText).toBe("1,000");
    expect(line.totalQuantityText).toBe("40,000");
    expect(line.pricePerPack).toBe("1,250.50");
    expect(line.lineCost).toBe("50,020.00");
    expect(po.totalCostText).toBe("1,234,567.89");
  });

  it("rounds the number of packs", () => {
    const input = JSON.parse(JSON.stringify(inputData));
    input.data.purchaseOrder.lines.nodes = [
      { lineNumber: 1, requestedNumberOfUnits: 282.48, requestedPackSize: 23.54 },
      { lineNumber: 2, requestedNumberOfUnits: 10, requestedPackSize: 4 },
    ];

    const packs = convert_data(input).data.purchaseOrder.lines.nodes.map(
      (line) => line.requestedNumberOfPacks,
    );

    expect(packs).toEqual([12, 2.5]);
  });

  it("shows the exchange rate only for a foreign currency order", () => {
    const input = JSON.parse(JSON.stringify(inputData));
    input.data.currencies = { nodes: [{ code: "NZD" }] };

    input.data.purchaseOrder.currency = { code: "NZD" };
    expect(
      convert_data(JSON.parse(JSON.stringify(input))).data.purchaseOrder
        .isForeignCurrency,
    ).toBe(false);

    input.data.purchaseOrder.currency = { code: "USD" };
    expect(convert_data(input).data.purchaseOrder.isForeignCurrency).toBe(true);
  });

  it("shows the supplier item code column only when a stock line has one", () => {
    const input = JSON.parse(JSON.stringify(inputData));
    input.data.purchaseOrder.lines.nodes = [
      { lineNumber: 1, item: { type: "STOCK" } },
      { lineNumber: 2, item: { type: "SERVICE" }, supplierItemCode: "FRT" },
    ];
    expect(convert_data(input).data.purchaseOrder.hasSupplierItemCodes).toBe(
      false,
    );

    input.data.purchaseOrder.lines.nodes = [
      { lineNumber: 1, item: { type: "STOCK" }, supplierItemCode: "SUP-1" },
      { lineNumber: 2, item: { type: "STOCK" } },
    ];
    expect(convert_data(input).data.purchaseOrder.hasSupplierItemCodes).toBe(
      true,
    );
  });

  it("moves service lines into the charges", () => {
    const input = JSON.parse(JSON.stringify(inputData));
    input.data.purchaseOrder.lines.nodes = [
      {
        lineNumber: 2,
        item: { name: "Service charges", type: "SERVICE" },
        comment: "Freight",
        lineTotalAfterSupplierDiscount: 150,
      },
      { lineNumber: 1, item: { name: "Amoxicillin", type: "STOCK" } },
      {
        lineNumber: 3,
        item: { name: "Service charges", type: "SERVICE" },
        lineTotalAfterSupplierDiscount: 35.5,
      },
    ];

    const po = convert_data(input).data.purchaseOrder;

    expect(po.lines.nodes.map((line) => line.lineNumber)).toEqual([1]);
    expect(po.charges).toEqual([
      { description: "Freight", amount: "150.00" },
      { description: "Service charges", amount: "35.50" },
    ]);
  });
});
