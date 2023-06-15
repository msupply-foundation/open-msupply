import isEqual from 'lodash/isEqual';

export const ObjUtils = {
  // Performs a deep comparison between two values to determine if they are equivalent.
  isEqual,

  // Checks is input is an actual object (i.e. key-vals)
  isObject: (input: unknown): input is Record<string, unknown> =>
    typeof input === 'object' && input !== null && !Array.isArray(input),
};
