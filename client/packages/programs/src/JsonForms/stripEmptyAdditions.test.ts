import { isEqual } from 'lodash';
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
      array: [],
      obj: {},
      someMore: { obj2: {} },
    };
    const add1 = {
      some: 2,
      array: [{ emptyArray: undefined }],
      obj: { emptyObj: undefined },
      someMore: { obj2: { emptyObj2: undefined } },
    };

    const stripped = stripEmptyAdditions(old, add1);
    expect(isEqualIgnoreUndefinedAndEmpty(old, stripped)).toBeTruthy();
  });

  it('should remove existing empty when deleted in new', () => {
    const old = {
      some: 2,
      someMore: { someArray: [], someObj: {} },
      obj: {},
      array: [],
      obj2: { emptyObj: {}, emptyArray: [], keep: {} },
    };
    const add1 = {
      some: 2,
      obj2: { keep: { empty: undefined } },
    };

    const stripped = stripEmptyAdditions(old, add1);
    expect(
      isEqualIgnoreUndefinedAndEmpty(
        {
          some: 2,
          obj2: { keep: {} },
        },
        stripped
      )
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

  it('should allow removing item with simple types', () => {
    const old = {
      some: 2,
      someMore: 'string',
      array: [{ value: false }],
    };
    const add1 = {
      array: [{ value: false, add1: undefined }],
    };

    const stripped = stripEmptyAdditions(old, add1);
    expect(isEqual(add1, stripped)).toBeTruthy();
  });
});
