import { useSearchParams } from 'react-router-dom';

export interface UrlQueryObject {
  [key: string]: string | number | boolean | RangeObject;
}

export interface RangeObject {
  from?: string | number;
  to?: string | number;
}

// CONSTANTS
export const RANGE_SPLIT_CHAR = '_';

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
          const range = parseRangeString(newQueryObject[key]) as RangeObject;
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
): Record<string, string | number | boolean | undefined> =>
  Object.fromEntries(
    Array.from(searchParams.entries()).map(([key, value]) => {
      if (skipParse.includes(key)) return [key, value];
      return [key, unStringify(value)];
    })
  );

// Coerce a string (from url) to a value of the correct data type
const unStringify = (input: string | undefined) => {
  if (!isNaN(Number(input))) return Number(input);
  if (input === 'true') return true;
  if (input === 'false') return false;
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
  } as RangeObject;
};

const stringifyRange = (range: RangeObject) => {
  const { from, to } = range;
  if (!from && !to) return '';
  return `${from ?? ''}${RANGE_SPLIT_CHAR}${to ?? ''}`;
};
