import { convert_data } from "./convert_data";

describe("convert_data", () => {
  // The template prints dates in arguments.timezone, which fell back to UTC while convert_data
  // dropped the arguments
  // OMS-REG-RPT-09.19
  it("passes the arguments on, timezone included", () => {
    const args = { timezone: "Pacific/Auckland", otherPartyId: "clinic-a" };
    expect(convert_data({ arguments: args, data: {} }).arguments).toEqual(args);
  });
});
