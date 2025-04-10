import { cleanUpNodes, cleanUpObject, sortNodes } from "./utils";

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

describe("cleans up array of nodes", () => {
  it("removes empty nodes", () => {
    expect([
      {
        key: {
          nestedKey: "string",
        },
        key2: "string",
      },
    ]).toEqual(
      cleanUpNodes([
        {
          key: {
            nestedKey: "string",
            nestedKey2: "",
          },
          key2: "string",
        },
        {},
      ])
    );
  });
});

describe("sorts nodes on sortBy", () => {
  it("returns unsorted nodes when no key provided", () => {
    expect(
      sortNodes(
        [
          { expiryDate: 1 },
          { expiryDate: 3 },
          { expiryDate: 2 },
          { expiryDate: 5 },
        ],
        undefined,
        "asc"
      )
    ).toEqual([
      { expiryDate: 1 },
      { expiryDate: 3 },
      { expiryDate: 2 },
      { expiryDate: 5 },
    ]);
  });
  it("returns sorting on other value", () => {
    expect(
      sortNodes(
        [{ batch: 1 }, { batch: 3 }, { batch: 2 }, { batch: 5 }],
        "batch",
        "desc"
      )
    ).toEqual([{ batch: 5 }, { batch: 3 }, { batch: 2 }, { batch: 1 }]);
  });
  it("returns sorting on nested value item.name", () => {
    expect(
      sortNodes(
        [
          {
            expiryDate: 1,
            item: {
              name: "a",
            },
          },
          {
            expiryDate: 3,
            item: {
              name: "d",
            },
          },
          {
            expiryDate: 2,
            item: {
              name: "b",
            },
          },
          {
            expiryDate: 5,
            item: {
              name: "c",
            },
          },
        ],
        "item.name",
        "asc"
      )
    ).toEqual([
      {
        expiryDate: 1,
        item: {
          name: "a",
        },
      },

      {
        expiryDate: 2,
        item: {
          name: "b",
        },
      },
      {
        expiryDate: 5,
        item: {
          name: "c",
        },
      },
      {
        expiryDate: 3,
        item: {
          name: "d",
        },
      },
    ]);
  });
  it("returns sorting on sort when no dir is provided and defaults to desc", () => {
    expect(
      sortNodes([{ code: 1 }, { code: 3 }, { code: 2 }, { code: 5 }], "code")
    ).toEqual([{ code: 5 }, { code: 3 }, { code: 2 }, { code: 1 }]);
  });
});
