import { calculateStockAtRisk } from "./convert_data";
import {
  processStockLines,
  calculateDaysUntilExpired,
  calculateStockAtRiskIfNoMonthlyConsumption,
  roundDaysToInteger,
  calculateExpectedUsage,
} from "./convert_data";
import inputData from "./input.json" assert { type: "json" };
import outputData from "./output.json" assert { type: "json" };

const newExpiry = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);

// convert expiry date to be 25 days from now
// TODO mock Date.now() properly
inputData.stockLines.nodes.forEach((line) => {
  const year = newExpiry.getFullYear();
  const month = String(newExpiry.getMonth() + 1).padStart(2, "0");
  const day = String(newExpiry.getDate()).padStart(2, "0");

  const formattedDate = `${year}-${month}-${day}`;
  line.expiryDate = formattedDate;
});

describe("test convert data", () => {
  // describe('test process stock lines', () => {
  //   // mock out the 4 internal functions
  //   // let mockRoundDaysToInteger = 1 // some jest mock here of the fn

  //   // beforeEach(() => {
  //   //   mockRoundDaysToInteger.mockClear();
  //   // });

  //   // it('calls roundDaysToInteger with the correct argument', () => {
  //   //   _ = processStockLines(inputData.stockLines)
  //   //   expect(mockRoundDaysToInteger).toHaveBeenCalledTimes(3);
  //   //   expect(mockRoundDaysToInteger).toHaveBeenCalledWith(2.3)
  //   //   expect(mockRoundDaysToInteger).toHaveBeenCalledWith(3.1)
  //   //   expect(mockRoundDaysToInteger).toHaveBeenCalledWith(5.5)
  //   // });
  //   it('end to end', () => {
  //     const result = processStockLines(inputData)
  //     expect(result).toEqual(outputData)
  //   });

  // })

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

    // it('returns difference between expiry and now', () => {
    //   expect(calculateDaysUntilExpired('2024-04-03')).toBe(2);
    //   expect(calculateDaysUntilExpired('2024-05-03')).toBe(32);
    // });
  });

  // it('tests adding days until expired to line', () => {
  //   let line = inputData.stockLines.nodes[0];
  //   expect(Math.round(addDaysUntilExpired(line).daysUntilExpired)).toBe(25);
  // })

  // it('calculate stock at risk when monthly consumption provided and expiryDate > now', () => {
  //   let line = inputData.stockLines.nodes[0];
  //   line = addDaysUntilExpired(line);
  //   line = calculateStockAtRisk(line);
  //   expect(Math.round(line.stockAtRisk)).toBe(958);
  //   expect(Math.round(line.expectedUsage)).toBe(42);

  //   let line2 = inputData.stockLines.nodes[1];
  //   line2 = addDaysUntilExpired(line2);
  //   line2 = calculateStockAtRisk(line2);
  //   expect(Math.round(line2.stockAtRisk)).toBe(233);
  //   expect(Math.round(line2.expectedUsage)).toBe(17);
  // })

  // it('calculate stock at risk when monthly consumption provided but no expiry date', () => {
  //   let line = inputData.stockLines.nodes[0];
  //   // manually remove expiry date
  //   line.expiryDate = undefined;
  //   line = addDaysUntilExpired(line);
  //   line = calculateStockAtRisk(line);
  //   expect(line.expectedUsage).toBe(undefined);
  //   expect(line.stockAtRisk).toBe(undefined);
  // })

  // it('calculate stock at risk if no monthly consumption and expiryDate < now', () => {
  //   let line = inputData.stockLines.nodes[0];
  //   line.item.stats.averageMonthlyConsumption = undefined;
  //   line = addDaysUntilExpired(line);
  //   expect(line.item.stats.averageMonthlyConsumption).toBe(undefined);
  //   line = calculateStockAtRiskIfNoMonthlyConsumption(line);
  //   // expect(Math.round(line.stockAtRisk)).toBe(1000);
  // });

  // it('calculate stock at risk if no monthly consumption and expiryDate > now', () => {
  //   let line = inputData.stockLines.nodes[0];
  //   line.item.stats.averageMonthlyConsumption = undefined;
  //   line = addDaysUntilExpired(line);
  //   line = calculateStockAtRiskIfNoMonthlyConsumption(line);
  //   expect(line.stockAtRisk).toBe(undefined);  // No stock at risk if expiry date > now and no monthly consumption
  // });

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
