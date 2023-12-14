import _ from 'lodash';
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
    if (obj.length === 0) return true;
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
  if (!_.isObject(newData)) return newData;

  if (_.isObject(newData) && !_.isArray(newData)) {
    const object: JsonData = {};
    const oldObj = !old || !_.isObject(old) || _.isArray(old) ? {} : old;

    const allKeys = new Set<string>();
    Object.keys(oldObj).reduce((prev, cur) => prev.add(cur), allKeys);
    Object.keys(newData).reduce((prev, cur) => prev.add(cur), allKeys);
    for (const key of allKeys) {
      const o = oldObj[key];
      let n = newData[key];
      if (_.isObject(n) && !_.isArray(n)) {
        n = stripEmptyAdditions(o, n);
        if (objectOrArrayIsEmpty(n)) {
          if (_.isEqual(o, {}) || _.isEqual(o, [])) {
            // keep existing empty object
            object[key] = o;
          }
          // ignore the empty addition
          continue;
        }
      }
      if (n !== undefined) object[key] = n;
    }
    if (Object.keys(object).length === 0) return undefined;
    return object;
  }

  return newData;
};

// https://stackoverflow.com/questions/57874879/how-to-treat-missing-undefined-properties-as-equivalent-in-lodashs-isequalwit
const isEqualIgnoreUndefined = (
  a: JsonData | undefined,
  b: JsonData | undefined
) => {
  const comparisonFunc = (a: JsonData | undefined, b: JsonData | undefined) => {
    if (_.isArray(a) || _.isArray(b)) return;
    if (!_.isObject(a) || !_.isObject(b)) return;

    if (!_.includes(a, undefined) && !_.includes(b, undefined)) return;

    // Call recursively, after filtering all undefined properties
    return _.isEqualWith(
      _.omitBy(a, value => value === undefined),
      _.omitBy(b, value => value === undefined),
      comparisonFunc
    );
  };
  return _.isEqualWith(a, b, comparisonFunc);
};

export const isEqualIgnoreUndefinedAndEmpty = (
  old: JsonData | undefined,
  newData: JsonData | undefined
) => {
  const stripped = stripEmptyAdditions(old, newData);
  // ignore undefined (e.g. in array objects which haven't been stripped) when comparing
  return isEqualIgnoreUndefined(old, stripped);
};
