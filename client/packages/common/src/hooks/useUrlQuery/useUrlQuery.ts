import { useSearchParams } from 'react-router-dom';

export interface UrlQueryObject {
  [key: string]: UrlQueryValue;
}

export interface RangeObject<T> {
  from?: T;
  to?: T;
}

export type UrlQueryValue =
  | string
  | number
  | boolean
  | RangeObject<string | number>
  | undefined;

// CONSTANTS
export const RANGE_SPLIT_CHAR = '_';

// const dateRangeRegex = new RegExp(
//   `^(\\d{4}-\\d{2}-\\d{2})?_(\\d{4}-\\d{2}-\\d{2})?|(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2})?${RANGE_SPLIT_CHAR}(\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2})?$`
// );

// Matches range strings for numbers, with "_" as the splitting character.
// Both the start date and end date are optional.
// A "number" can contain a negative (-) prefix, and a single decimal point
// within it (which must be followed by additional digits)
const numberRangeRegex = new RegExp(
  `^(-?\\d+(\\.\\d+)?)?${RANGE_SPLIT_CHAR}(-?\\d+(\\.\\d+)?)?$`
);

interface useUrlQueryProps {
  // an array of keys - the values of which should not be parsed before
  // returning by default the value of parameters will be coerced to a number if
  // !isNaN and to boolean if 'true' or 'false'. Specify keys here if you wish
  // to opt out of this
  skipParse?: string[];
}

export const useUrlQuery = ({ skipParse = [] }: useUrlQueryProps = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateQuery = (values: UrlQueryObject, overwrite = false) => {
    // We use this rather than searchParams as this function uses a stale
    // version of searchParams (closure from when the hook was first called)
    const urlSearchParams = new URLSearchParams(window.location.search);

    const newQueryObject = overwrite
      ? {}
      : Object.fromEntries(urlSearchParams.entries());

    Object.entries(values).forEach(([key, value]) => {
      if (!value) delete newQueryObject[key];
      else {
        if (typeof value === 'object' && ('from' in value || 'to' in value)) {
          const range = parseRangeString(newQueryObject[key]) as RangeObject<
            string | number
          >;
          const { from, to } = value;
          if (from !== undefined) range.from = from;
          if (to !== undefined) range.to = to;

          const rangeString = stringifyRange(range);
          if (rangeString === '') delete newQueryObject[key];
          else newQueryObject[key] = rangeString;
        } else newQueryObject[key] = String(value);
      }
    });

    setSearchParams(newQueryObject, { replace: true });
  };

  return {
    urlQuery: parseSearchParams(searchParams, skipParse),
    updateQuery,
    parseRangeString,
  };
};

// Coerces url params to appropriate type
const parseSearchParams = (
  searchParams: URLSearchParams,
  skipParse: string[]
): Record<string, UrlQueryValue> =>
  Object.fromEntries(
    Array.from(searchParams.entries()).map(([key, value]) => {
      if (skipParse.includes(key)) return [key, value];
      return [key, unStringify(value)];
    })
  );

// Coerce a string (from url) to a value of the correct data type
const unStringify = (input: string | undefined): UrlQueryValue => {
  if (input === '') return undefined;
  if (!isNaN(Number(input))) return Number(input);
  if (input === 'true') return true;
  if (input === 'false') return false;
  if (typeof input === 'string' && input?.match(numberRangeRegex)) {
    console.log('HELLO');
    // console.log(parseRangeString(input));
    return parseRangeString(input);
  }
  return input;
};

// Split a range string (e.g. "low_high") into a range object( {from: low, to:
// high} )
const parseRangeString = (value: string | undefined) => {
  if (!value) return { from: undefined, to: undefined };
  const values = value.split(RANGE_SPLIT_CHAR);
  return {
    from: unStringify(values[0]),
    to: unStringify(values[1]),
  } as RangeObject<string | number>;
};

const stringifyRange = (range: RangeObject<string | number>) => {
  const { from, to } = range;
  if (!from && !to) return '';
  return `${from ?? ''}${RANGE_SPLIT_CHAR}${to ?? ''}`;
};
