import { calculateStockAtRisk } from "./convert_data";
import {  calculateMonthConsumption } from "./convert_data";
import inputData from "./input.json" assert { type: "json" };
import outputData from "./output.json" assert { type: "json" };

// describe("test process stock lines", () => {
//   beforeAll(() => {
//     jest.useFakeTimers();
//     jest.setSystemTime(new Date("2024-04-01"));
//   });
//   // mock out the 4 internal functions
//   // calculateExpectedUsage.mockImplementation(() => 20);
//   // calculateStockAtRisk.mockImplementation(() => 10);
//   // roundDaysToInteger.mockImplementation(() => 10);
//   // it("end to end", () => {
//   //   const result = processStockLines(inputData.stockLines.nodes);
//   //   expect(result).toEqual(outputData.stockLines.nodes);
//   // });
//   afterAll(() => {
//     jest.useRealTimers();
//   });
// });

describe("Adds monthlyConsumption correctly from query result", () => {
  it("returns undefined if either are undefined", () => {
    expect(calculateMonthConsumption(undefined, "id")).toBe(undefined);
    expect(calculateMonthConsumption(inputData.thisMonthConsumption, undefined)).toBe(undefined);

  });
  it("returns month consumption if available", () => {
    expect(calculateMonthConsumption(inputData.thisMonthConsumption, "101")).toBe(200);
  });
  it("returns undefined if undefined", () => {
    expect(calculateMonthConsumption(inputData.thisMonthConsumption, "non existent id")).toBe(undefined)
  });
});

describe("Adds lastMonthConsumption correctly from query result", () => {
  it("returns undefined if either are undefined", () => {
    expect(calculateMonthConsumption(undefined, "id")).toBe(undefined);
    expect(calculateMonthConsumption(inputData.lastMonthConsumption, undefined)).toBe(undefined);

  });
  it("returns month consumption if available", () => {
    expect(calculateMonthConsumption(inputData.lastMonthConsumption, "101")).toBe(500);
  });
  it("returns undefined if undefined", () => {
    expect(calculateMonthConsumption(inputData.lastMonthConsumption, "non existent id")).toBe(undefined)
  });
});

