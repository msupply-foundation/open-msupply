export * from './numbers';
export * from './quantities';
export * from './formatters';
export * from './testing';
export * from './arrays';
export * from './regex';
export * from './pricing';
export * from './functions';
export * from './navigation';
export * from './environment';
export * from './object';
export * from './types';
export * from './files';
export * from './BarcodeScannerContext';
export * from './item';
export * from './globalConst';
export * from './reasons';
export * from './mappers';
export * from './display';
export * from './barcode';

// Native replacements for lodash utilities

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: Parameters<T>) {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, wait);
  };
};

/** Reads a nested value by dot-path string (lodash/get replacement) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extractProperty = <T = any>(
  obj: unknown,
  path: string | string[],
  defaultValue?: T
): T => {
  const keys = Array.isArray(path) ? path : path.split('.');
  let result: unknown = obj;
  for (const key of keys) {
    if (result == null) return defaultValue as T;
    result = (result as Record<string, unknown>)[key];
  }
  return result !== undefined ? (result as T) : (defaultValue as T);
};

export const groupBy = <T>(
  arr: T[],
  fn: ((item: T) => string) | string
): Record<string, T[]> =>
  arr.reduce(
    (acc, item) => {
      const key =
        typeof fn === 'function'
          ? fn(item)
          : (item as Record<string, unknown>)[fn as string] as string;
      (acc[key] = acc[key] || []).push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );

export const includes = (
  collection: unknown[] | string | Record<string, unknown>,
  value: unknown
): boolean => {
  if (Array.isArray(collection)) return collection.includes(value);
  if (typeof collection === 'string') return collection.includes(value as string);
  return Object.values(collection).includes(value);
};

export const isArray = Array.isArray;

export const isEmpty = (value: unknown): boolean => {
  if (value == null) return true;
  if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
};

const _deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(k =>
    _deepEqual(
      (a as Record<string, unknown>)[k],
      (b as Record<string, unknown>)[k]
    )
  );
};

export const isEqual = _deepEqual;

export const isEqualWith = (
  a: unknown,
  b: unknown,
  customizer: (a: unknown, b: unknown) => boolean | undefined
): boolean => {
  const custom = customizer(a, b);
  if (custom !== undefined) return custom;
  return _deepEqual(a, b);
};

export const isObject = (
  value: unknown
): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isString = (value: unknown): value is string =>
  typeof value === 'string';

export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number';

export const keyBy = <T>(
  arr: T[],
  fn: ((item: T) => string) | string
): Record<string, T> =>
  Object.fromEntries(
    arr.map(item => [
      typeof fn === 'function'
        ? fn(item)
        : (item as Record<string, unknown>)[fn as string],
      item,
    ])
  );

export const mapKeys = <T>(
  obj: Record<string, T>,
  fn: (val: T, key: string) => string
): Record<string, T> =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [fn(v, k), v]));

export const mapValues = <T, U>(
  obj: Record<string, T>,
  fn: (val: T, key: string) => U
): Record<string, U> =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v, k)]));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const merge = <T extends Record<string, any>>(
  target: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...sources: (Record<string, any> | undefined | null)[]
): T => {
  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      const sv = source[key];
      const tv = target[key];
      if (
        sv !== null &&
        typeof sv === 'object' &&
        !Array.isArray(sv) &&
        tv !== null &&
        typeof tv === 'object' &&
        !Array.isArray(tv)
      ) {
        merge(tv as Record<string, unknown>, sv as Record<string, unknown>);
      } else if (sv !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (target as Record<string, any>)[key] = sv;
      }
    }
  }
  return target;
};

export const omitBy = <T>(
  obj: Record<string, T>,
  predicate: (val: T, key: string) => boolean
): Record<string, T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([k, v]) => !predicate(v, k))
  );

export const uniqBy = <T>(
  arr: T[],
  fn: ((item: T) => unknown) | string
): T[] =>
  [
    ...new Map(
      arr.map(item => [
        typeof fn === 'function'
          ? fn(item)
          : (item as Record<string, unknown>)[fn as string],
        item,
      ])
    ).values(),
  ];

export const uniqWith = <T>(
  arr: T[],
  comparator: (a: T, b: T) => boolean
): T[] =>
  arr.filter(
    (item, i) => arr.findIndex(other => comparator(item, other)) === i
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mergeWith = <T extends Record<string, any>>(
  target: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  source: Record<string, any> | undefined | null,
  customizer: (destVal: unknown, srcVal: unknown, key: string) => unknown
): T => {
  if (!source) return target;
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    const custom = customizer(tv, sv, key);
    if (custom !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (target as Record<string, any>)[key] = custom;
    } else if (
      sv !== null &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      tv !== null &&
      typeof tv === 'object' &&
      !Array.isArray(tv)
    ) {
      mergeWith(tv as Record<string, unknown>, sv as Record<string, unknown>, customizer);
    } else if (sv !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (target as Record<string, any>)[key] = sv;
    }
  }
  return target;
};
