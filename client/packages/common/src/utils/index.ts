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

// having issues with tree shaking lodash
// so we're just importing the functions we need
// and re-exporting them here
import debounce from 'lodash/debounce';
import extractProperty from 'lodash/get';
import groupBy from 'lodash/groupBy';
import includes from 'lodash/includes';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import isEqualWith from 'lodash/isEqualWith';
import isObject from 'lodash/isObject';
import isString from 'lodash/isString';
import keyBy from 'lodash/keyBy';
import mapKeys from 'lodash/mapKeys';
import mapValues from 'lodash/mapValues';
import merge from 'lodash/merge';
import omitBy from 'lodash/omitBy';
import uniqBy from 'lodash/uniqBy';
import uniqWith from 'lodash/uniqWith';

export {
  debounce,
  extractProperty,
  groupBy,
  includes,
  isArray,
  isEmpty,
  isEqual,
  isEqualWith,
  isObject,
  keyBy,
  mapKeys,
  mapValues,
  merge,
  omitBy,
  uniqBy,
  uniqWith,
  isString,
};
