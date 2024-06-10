import isEqual from 'lodash/isEqual';

type ParsedObject = Record<string, string | number | boolean | null>;

export const ObjUtils = {
  // Performs a deep comparison between two values to determine if they are equivalent.
  isEqual,

  // Checks is input is an actual object (i.e. key-vals)
  isObject: (input: unknown): input is Record<string, unknown> =>
    typeof input === 'object' && input !== null && !Array.isArray(input),
  // Turns an object into a Record<string, string | number | boolean | null>
  parse: (input: string | null | undefined): ParsedObject => {
    if (!input) return {};

    const maybeObject = JSON.parse(input) as ParsedObject;
    return !!maybeObject && ObjUtils.isObject(maybeObject) ? maybeObject : {};
  },
};
