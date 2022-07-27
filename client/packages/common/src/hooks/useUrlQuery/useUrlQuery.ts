import { useSearchParams } from 'react-router-dom';

interface UrlQueryObject {
  [key: string]: string | number | boolean;
}

interface useUrlQueryProps {
  // an array of keys - the values of which should not be parsed before returning
  // by default the value of parameters will be coerced to a number if !isNaN
  // and to boolean if 'true' or 'false'. Specify keys here if you wish to opt out of this
  skipParse?: string[];
}
export const useUrlQuery = ({ skipParse = [] }: useUrlQueryProps = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateQuery = (values: UrlQueryObject, overwrite = false) => {
    const newQueryObject = overwrite
      ? {}
      : Object.fromEntries(searchParams.entries());

    Object.entries(values).forEach(([key, value]) => {
      if (!value) delete newQueryObject[key];
      else newQueryObject[key] = String(value);
    });

    setSearchParams(newQueryObject);
  };

  return {
    urlQuery: parseSearchParams(searchParams, skipParse),
    updateQuery,
  };
};

// Coerces url params to appropriate type
const parseSearchParams = (
  searchParams: URLSearchParams,
  skipParse: string[]
) =>
  Object.fromEntries(
    Array.from(searchParams.entries()).map(([key, value]) => {
      if (skipParse.includes(key)) return [key, value];
      if (!isNaN(Number(value))) return [key, Number(value)];
      if (value === 'true') return [key, true];
      if (value === 'false') return [key, false];
      return [key, value];
    })
  );
