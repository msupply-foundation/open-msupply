import {
  isEqualIgnoreUndefinedAndEmpty,
  stripEmptyAdditions,
} from './stripEmptyAdditions';

describe('stripEmptyAdditions', () => {
  it('should remove empty objects and arrays', () => {
    const old = {
      some: 2,
      someMore: { value: false },
    };
    const add1 = {
      some: 3,
      someMore: { value: false, add1: undefined },
      add2: undefined,
    };
    const add2 = {
      some: 4,
      someMore: { value: false, add1: { val2: undefined } },
      add2: {
        obj: { obj2: { undefined }, array: [{ val: undefined }] },
      },
    };

    expect(stripEmptyAdditions(old, add1)).toStrictEqual({
      some: 3,
      someMore: { value: false },
    });
    expect(stripEmptyAdditions(old, add2)).toStrictEqual({
      some: 4,
      someMore: { value: false },
    });
  });

  it('should keep existing empty objects and arrays', () => {
    const old = {
      some: 2,
      someMore: {},
      array: [],
    };
    const add1 = {
      some: 2,
      someMore: { obj: { value: undefined } },
      array: [],
    };

    expect(
      isEqualIgnoreUndefinedAndEmpty(old, stripEmptyAdditions(old, add1))
    ).toBeTruthy();
  });

  it('should ignore undefined in array objects', () => {
    const old = {
      some: 2,
      array: [{ value: false }],
    };
    const add1 = {
      some: 2,
      array: [{ value: false, add1: undefined }],
    };

    expect(isEqualIgnoreUndefinedAndEmpty(old, add1)).toBeTruthy();
  });
});
