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

// having issues with tree shaking lodash
// so we're just importing the functions we need
// and re-exporting them here
import debounce from 'lodash/debounce';
import groupBy from 'lodash/groupBy';
import keyBy from 'lodash/keyBy';
import mapKeys from 'lodash/mapKeys';
import mapValues from 'lodash/mapValues';
import merge from 'lodash/merge';
import uniqBy from 'lodash/uniqBy';
import uniqWith from 'lodash/uniqWith';
import isEqual from 'lodash/isEqual';

export {
  debounce,
  groupBy,
  keyBy,
  mapKeys,
  mapValues,
  merge,
  uniqBy,
  uniqWith,
  isEqual,
};
