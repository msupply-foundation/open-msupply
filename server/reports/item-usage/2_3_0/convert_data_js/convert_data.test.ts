import { cleanUpObject } from "./convert_data";
import {
  calculateQuantity,
  calculateStatValue,
  processItemLines,
} from "./convert_data";
import inputData from "./input.json" assert { type: "json" };
import outputData from "./output.json" assert { type: "json" };

describe("test item lines", () => {
  it("end to end item-usage", () => {
    const result = processItemLines(inputData);
    expect(result).toEqual(outputData.items.nodes);
  });
});

describe("Adds monthlyConsumption correctly from query result", () => {
  it("returns 0 if either are undefined", () => {
    expect(calculateQuantity(undefined, "id")).toBe(0);
    expect(calculateQuantity(inputData.thisMonthConsumption, undefined)).toBe(
      0
    );
  });
  it("returns month consumption if available", () => {
    expect(calculateQuantity(inputData.thisMonthConsumption, "101")).toBe(200);
  });
  it("returns 0 if non existent id", () => {
    expect(
      calculateQuantity(inputData.thisMonthConsumption, "non existent id")
    ).toBe(0);
  });
});

describe("Adds lastMonthConsumption correctly from query result", () => {
  it("returns 0 if either are undefined", () => {
    expect(calculateQuantity(undefined, "id")).toBe(0);
    expect(calculateQuantity(inputData.lastMonthConsumption, undefined)).toBe(
      0
    );
  });
  it("returns month consumption if available", () => {
    expect(calculateQuantity(inputData.lastMonthConsumption, "101")).toBe(500);
  });
  it("returns 0 if non existent id", () => {
    expect(
      calculateQuantity(inputData.lastMonthConsumption, "non existent id")
    ).toBe(0);
  });
});

describe("Adds twoMonthsAgoConsumption correctly from query result", () => {
  it("returns 0 if either are undefined", () => {
    expect(calculateQuantity(undefined, "id")).toBe(0);
    expect(
      calculateQuantity(inputData.twoMonthsAgoConsumption, undefined)
    ).toBe(0);
  });
  it("returns month consumption if available", () => {
    expect(calculateQuantity(inputData.twoMonthsAgoConsumption, "102")).toBe(
      421
    );
  });
  it("returns 0 if non existent id", () => {
    expect(
      calculateQuantity(inputData.twoMonthsAgoConsumption, "non existent id")
    ).toBe(0);
  });
});

describe("Adds expiringInSixMonths correctly from query result", () => {
  it("returns 0 if either are undefined", () => {
    expect(calculateQuantity(undefined, "id")).toBe(0);
    expect(calculateQuantity(inputData.expiringInSixMonths, undefined)).toBe(0);
  });
  it("returns month consumption if available", () => {
    expect(calculateQuantity(inputData.expiringInSixMonths, "102")).toBe(75);
  });
  it("returns 0 if non existent id", () => {
    expect(
      calculateQuantity(inputData.expiringInSixMonths, "non existent id")
    ).toBe(0);
  });
});

describe("Adds expiringIntwelveMonths correctly from query result", () => {
  it("returns 0 if either are undefined", () => {
    expect(calculateQuantity(undefined, "id")).toBe(0);
    expect(calculateQuantity(inputData.expiringInTwelveMonths, undefined)).toBe(
      0
    );
  });
  it("returns month consumption if available", () => {
    expect(calculateQuantity(inputData.expiringInTwelveMonths, "102")).toBe(92);
  });
  it("returns 0 if non existent id", () => {
    expect(
      calculateQuantity(inputData.expiringInTwelveMonths, "non existent id")
    ).toBe(0);
  });
});

describe("Adds AMC12 correctly from query result", () => {
  it("returns 0 if either are undefined", () => {
    expect(calculateQuantity(undefined, "id")).toBe(0);
    expect(calculateQuantity(inputData.AMCTwelve, undefined)).toBe(0);
  });
  it("returns month consumption if available", () => {
    expect(calculateQuantity(inputData.AMCTwelve, "102")).toBe(92.4);
  });
  it("returns 0 if non existent id", () => {
    expect(calculateQuantity(inputData.AMCTwelve, "non existent id")).toBe(0);
  });
});

describe("Adds AMC24 correctly from query result", () => {
  it("returns 0 if either are undefined", () => {
    expect(calculateQuantity(undefined, "id")).toBe(0);
    expect(calculateQuantity(inputData.AMCTwentyFour, undefined)).toBe(0);
  });
  it("returns month consumption if available", () => {
    expect(calculateQuantity(inputData.AMCTwentyFour, "102")).toBe(192.4);
  });
  it("returns 0 if non existent id", () => {
    expect(calculateQuantity(inputData.AMCTwentyFour, "non existent id")).toBe(
      0
    );
  });
});

describe("calculate SOH", () => {
  it("returns default 0 if undefined", () => {
    expect(calculateStatValue(undefined)).toBe(0);
  });
  it("returns rounded value if value exists", () => {
    expect(
      calculateStatValue(inputData.items.nodes[0].stats.availableStockOnHand)
    ).toBe(300.9);
  });
});

describe("calculate MOS", () => {
  it("returns default 0 if undefined", () => {
    expect(calculateStatValue(undefined)).toBe(0);
  });
  it("returns rounded value if value exists", () => {
    expect(
      calculateStatValue(
        inputData.items.nodes[0].stats.availableMonthsOfStockOnHand
      )
    ).toBe(4.5);
  });
});

describe("cleans up object", () => {
  it("removes empty strings from object", () => {
    expect({
      key2: "string",
    }).toEqual(cleanUpObject({ key: "", key2: "string" }));
  });
  it("removes empty string from nested object", () => {
    expect({
      key: {
        nestedKey: "string",
      },
      key2: "string",
    }).toEqual(
      cleanUpObject({
        key: {
          nestedKey: "string",
          nestedKey2: "",
        },
        key2: "string",
      })
    );
  });
  it("handles empty object", () => {
    expect({}).toEqual(cleanUpObject({ key: "" }));
  });
  it("removes undefined from object", () => {
    expect({
      key2: "string",
    }).toEqual(cleanUpObject({ key: undefined, key2: "string" }));
  });
  it("removes null from object", () => {
    expect({
      key2: "string",
    }).toEqual(cleanUpObject({ key: null, key2: "string" }));
  });
  it("maintains 0 in object", () => {
    expect({ key: 0, key2: "string" }).toEqual(
      cleanUpObject({ key: 0, key2: "string" })
    );
  });
});
