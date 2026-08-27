import { convert_data } from "../convert_data";
import inputData from "./input.json";
import outputData from "./output.json";
import { describe, expect, it } from "@jest/globals";

describe("Test all", () => {
  it("test all", () => {
    const result = convert_data(inputData);
    expect(result).toEqual(outputData);
  });
});
