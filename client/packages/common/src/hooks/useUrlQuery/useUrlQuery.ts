import { useSearchParams } from 'react-router-dom';

interface UrlQueryObject {
  [key: string]: string | number | boolean;
}

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
      if (!isNaN(Number(value))) return [key, Number(value)];
      if (value === 'true') return [key, true];
      if (value === 'false') return [key, false];
      return [key, value];
    })
  );
