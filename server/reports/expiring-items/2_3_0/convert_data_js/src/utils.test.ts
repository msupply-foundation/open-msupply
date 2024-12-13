import {
  processStockLines,
  calculateDaysUntilExpired,
  roundDaysToInteger,
  calculateExpectedUsage,
  calculateStockAtRisk,
  sortNodes,
  getNestedValue,
} from "./utils";
import inputData from "../input.json" assert { type: "json" };
import outputData from "../output.json" assert { type: "json" };

describe("test process stock lines", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-04-01"));
  });
  // mock out the 4 internal functions
  // calculateExpectedUsage.mockImplementation(() => 20);
  // calculateStockAtRisk.mockImplementation(() => 10);
  // roundDaysToInteger.mockImplementation(() => 10);
  it("end to end", () => {
    const result = processStockLines(
      inputData.stockLines.nodes,
      "expiryDate",
      "desc"
    );
    expect(result).toEqual(outputData.stockLines.nodes);
  });
  afterAll(() => {
    jest.useRealTimers();
  });
});

describe("days until expired is added correctly", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-04-01"));
  });
  it("returns undefined if undefined", () => {
    expect(calculateDaysUntilExpired(undefined)).toBe(undefined);
  });
  it("returns difference between expiry and now", () => {
    expect(calculateDaysUntilExpired("2024-04-03")).toBe(2);
    expect(calculateDaysUntilExpired("2024-05-03")).toBe(32);
  });
  afterAll(() => {
    jest.useRealTimers();
  });
});

describe("calculate expected usage", () => {
  it("returns undefined if either are undefined", () => {
    expect(calculateExpectedUsage(undefined, undefined)).toBe(undefined);
    expect(
      calculateExpectedUsage(undefined, inputData.stockLines.nodes[0])
    ).toBe(undefined);
    expect(calculateExpectedUsage(1, undefined)).toBe(undefined);
  });

  it("returns expected usage if both defined", () => {
    expect(calculateExpectedUsage(20, inputData.stockLines.nodes[1])).toBe(13);
  });

  it("returns total stock if expected usage > total stock", () => {
    expect(calculateExpectedUsage(1000, inputData.stockLines.nodes[0])).toBe(
      1000
    );
  });
});

describe("calculate stock at risk ", () => {
  it("returns undefined if packSize, totalNumberOfPacks, OR expiryDate is undefined", () => {
    expect(calculateStockAtRisk(undefined, 1, 1, 1)).toBe(undefined);
    expect(calculateStockAtRisk(1, undefined, 1, 1)).toBe(undefined);
    expect(calculateStockAtRisk(1, 1, 1, undefined)).toBe(undefined);
  });

  it("returns undefined if averageMonthlyConsumption is undefined AND expiryDate is in the future", () => {
    expect(calculateStockAtRisk(2, 100, undefined, 1)).toBe(undefined);
  });

  it("returns all stock if averageMonthlyConsumption is undefined AND expiryDate is in the past", () => {
    expect(calculateStockAtRisk(2, 100, undefined, -1)).toBe(200);
  });

  it("returns stock at risk as all stock minus what we will consume before expiry date", () => {
    expect(calculateStockAtRisk(2, 100, 10, 60)).toBe(180);
  });

  it("returns 0 if will consume more than total stock within expiry date", () => {
    expect(calculateStockAtRisk(1, 1, 3, 30)).toBe(0);
  });

  describe("test round days to integer", () => {
    it("returns undefined if undefined", () => {
      expect(roundDaysToInteger(undefined)).toBe(undefined);
    });

    it("returns rounded value if defined", () => {
      expect(roundDaysToInteger(2.1)).toBe(2);
      expect(roundDaysToInteger(2.11)).toBe(2);
      expect(roundDaysToInteger(0.123)).toBe(0);
      expect(roundDaysToInteger(2)).toBe(2);
    });
  });
});

// describe("test mocked functions", () => {
//   it("calls roundDaysToInteger with the correct argument", () => {
//     const spyProcessStockLines = jest.spyOn(
//       require("./convert_data"),
//       "processStockLines"
//     );
//     spyProcessStockLines.mockImplementation((x) => x);
//     const spyCalculateDaysUntilExpired = jest.spyOn(
//       require("./convert_data"),
//       "calculateDaysUntilExpired"
//     );
//     spyCalculateDaysUntilExpired.mockImplementation((x) => x);
//     let res = processStockLines(inputData.stockLines.nodes);
//     expect(spyCalculateDaysUntilExpired).toHaveBeenCalledTimes(2);
//     expect(spyProcessStockLines).toHaveBeenCalledTimes(1);
//     // expect(mockRoundDaysToInteger).toHaveBeenCalledWith(2.3);
//     // expect(mockRoundDaysToInteger).toHaveBeenCalledWith(3.1);
//     // expect(mockRoundDaysToInteger).toHaveBeenCalledWith(5.5);
//     spyCalculateDaysUntilExpired.mockRestore();
//   });
// });
