import { useSearchParams } from 'react-router-dom';

interface UrlQueryObject {
  [key: string]: string | number | boolean;
}

// here you can override the parsers for specific query params
// an example is the filter, which must allow filtering by numeric codes
// if this is parsed as numeric, the query param changes filter=0300 to filter=300
// which then does not match against codes, as the filter is usually a 'startsWith'
const DefaultParsers: Record<
  string,
  (value: string) => string | boolean | number
> = {
  filter: (value: string) => value,
};

export const useUrlQuery = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateQuery = (values: UrlQueryObject, overwrite = false) => {
    const newQueryObject = overwrite
      ? {}
      : { ...parseSearchParams(searchParams) };
    Object.entries(values).forEach(([key, value]) => {
      if (!value) delete newQueryObject[key];
      else newQueryObject[key] = value;
    });
    setSearchParams(
      Object.fromEntries(
        // SearchParams requires values to be strings
        Object.entries(newQueryObject).map(([key, val]) => [key, String(val)])
      )
    );
  };

  return { urlQuery: parseSearchParams(searchParams), updateQuery };
};

// Coerces url params to appropriate type
const parseSearchParams = (searchParams: URLSearchParams) =>
  Object.fromEntries(
    Array.from(searchParams.entries()).map(([key, value]) => {
      const parser = DefaultParsers[key]; // written out longhand to avoid TS complaint
      if (parser) return [key, parser(value)];
      if (!isNaN(Number(value))) return [key, Number(value)];
      if (value === 'true') return [key, true];
      if (value === 'false') return [key, false];
      return [key, value];
    })
  );
