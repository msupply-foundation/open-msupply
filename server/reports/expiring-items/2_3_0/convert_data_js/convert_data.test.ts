import { calculateStockAtRisk } from "./convert_data";
import {
  processStockLines,
  calculateDaysUntilExpired,
  roundDaysToInteger,
  calculateExpectedUsage,
} from "./convert_data";
import inputData from "./input.json" assert { type: "json" };
import outputData from "./output.json" assert { type: "json" };




describe("test convert data", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-04-01"));
  });
  describe('test process stock lines', () => {
    // mock out the 4 internal functions
    // let mockRoundDaysToInteger = 1 // some jest mock here of the fn

    // beforeEach(() => {
    //   mockRoundDaysToInteger.mockClear();
    // });

    // it('calls roundDaysToInteger with the correct argument', () => {
    //   _ = processStockLines(inputData.stockLines)
    //   expect(mockRoundDaysToInteger).toHaveBeenCalledTimes(3);
    //   expect(mockRoundDaysToInteger).toHaveBeenCalledWith(2.3)
    //   expect(mockRoundDaysToInteger).toHaveBeenCalledWith(3.1)
    //   expect(mockRoundDaysToInteger).toHaveBeenCalledWith(5.5)
    // });
    it('end to end', () => {
      const result = processStockLines(inputData.stockLines.nodes)
      expect(result).toEqual(outputData.stockLines.nodes)
    });
    afterAll(() => {
      jest.useRealTimers();
    });

  })

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
      expect(calculateExpectedUsage(undefined, 1)).toBe(undefined);
      expect(calculateExpectedUsage(1, undefined)).toBe(undefined);
    });

    it("returns expected usage if both defined", () => {
      expect(calculateExpectedUsage(20, 500)).toBe(333);
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
