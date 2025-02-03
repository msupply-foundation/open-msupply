import { applyDaysLate } from "./utils";

describe("applyDaysLate", () => {
  it("end to end item-usage", () => {
    const result = processItemLines(inputData);
    expect(result).toEqual(outputData.items.nodes);
  });
});
