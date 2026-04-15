import { isObject, isArray, omitBy } from '@common/utils';
import { JsonData } from './common';

/**
 * Checks if the input object or array is empty.
 * An object is considered empty if all values are either undefined, empty objects, or arrays.
 * For example, `{ value: undefined, obj: {} }`.
 * An empty array this an array that is empty or only contains empty objects,
 * e.g. `[{ value: undefined}]`.
 */
const objectOrArrayIsEmpty = (obj: JsonData | undefined): boolean => {
  if (obj === undefined || obj === null) return true;
  if (typeof obj !== 'object') return false;

  // array
  if (Array.isArray(obj)) {
    return obj.every(it => objectOrArrayIsEmpty(it));
  }

  // object
  if (Object.keys(obj).length === 0) return true;
  const allValuesEmpty = Object.values(obj).every(it => {
    if (typeof it === 'object') return objectOrArrayIsEmpty(it);
    return it === undefined;
  });
  if (allValuesEmpty) {
    return true;
  }
  return false;
};

/**
 * Recursively removes all empty data which has been added to the newData compared to the old
 * input object.
 *
 * For example, given:
 *
 * old: { some: "value" }
 * newData: { some: "value", obj: { add1: undefined }, array: [], add2: undefined}
 *
 * stripEmptyAdditions(old, newData) will return { some: "value" }.
 */
export const stripEmptyAdditions = (
  old: JsonData | undefined,
  newData: JsonData | undefined
): JsonData | undefined => {
  if (newData === undefined) return undefined;
  if (!isObject(newData)) return newData;

  if (!isArray(newData)) {
    const object: JsonData = {};
    const oldObj = !old || !isObject(old) || isArray(old) ? {} : old;

    const allKeys = new Set<string>();
    Object.keys(oldObj).reduce((prev, cur) => prev.add(cur), allKeys);
    Object.keys(newData).reduce((prev, cur) => prev.add(cur), allKeys);
    for (const key of allKeys) {
      const o = oldObj[key];
      let n = newData[key];
      if (n === undefined) {
        // key absent from newData: user deleted it, do not keep
        continue;
      }
      if (isObject(n) || isArray(n)) {
        const nIsArray = isArray(n);
        n = stripEmptyAdditions(o, n);
        if (objectOrArrayIsEmpty(n)) {
          if (o !== undefined && objectOrArrayIsEmpty(o)) {
            // Both old and new are effectively empty: preserve the old
            // structure. For arrays, keep the original array (arrays are not
            // recursively stripped). For objects, keep the stripped result.
            object[key] = nIsArray ? o : n;
          }
          continue;
        }
      }
      if (n !== undefined) {
        object[key] = n;
      }
    }
    if (Object.keys(object).length > 0) {
      return object;
    }
    // keep the empty object
    if (newData && old) return {};
    return undefined;
  }

  return newData;
};

// Recursively compares two values ignoring undefined properties in objects
const isEqualIgnoreUndefined = (
  a: JsonData | undefined,
  b: JsonData | undefined
): boolean => {
  if (a === b) return true;
  if (isArray(a) && isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) =>
      isEqualIgnoreUndefined(item as JsonData, (b as JsonData[])[i] as JsonData)
    );
  }
  if (isArray(a) || isArray(b)) return false;
  if (isObject(a) && isObject(b)) {
    const filteredA = omitBy(a, v => v === undefined);
    const filteredB = omitBy(b, v => v === undefined);
    const keysA = Object.keys(filteredA);
    const keysB = Object.keys(filteredB);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key =>
      isEqualIgnoreUndefined(
        filteredA[key] as JsonData,
        filteredB[key] as JsonData
      )
    );
  }
  if (isObject(a) || isObject(b)) return false;
  return a === b;
};

export const isEqualIgnoreUndefinedAndEmpty = (
  old: JsonData | undefined,
  newData: JsonData | undefined
) => {
  const stripped = stripEmptyAdditions(old, newData);
  // ignore undefined (e.g. in array objects which haven't been stripped) when comparing
  return isEqualIgnoreUndefined(old, stripped);
};
