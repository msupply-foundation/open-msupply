import { cleanUpObject } from "./utils";

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
