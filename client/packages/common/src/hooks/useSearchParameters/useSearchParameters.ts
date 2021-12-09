import { useSearchParams } from 'react-router-dom';

interface SearchParams {
  get: (key: string) => string | null;
  set: (params: Record<string, string>) => void;
  getNumber: (key: string) => number;
}

export const useSearchParameters = (): SearchParams => {
  const [searchParams, setSearchParams] = useSearchParams();

  const searchParameters = {
    get: (key: string) => searchParams.get(String(key)),
    set: (params: Record<string, string>) => {
      const oldParams = window.location.search
        ? Object.fromEntries(
            window.location.search
              .substring(1)
              .split('&')
              .map(group => group.split('='))
          )
        : {};
      setSearchParams({ ...oldParams, ...params });
    },
    getNumber: (key: string) => {
      const value = Number(searchParams.get(key));
      return Number.isNaN(value) ? 0 : value;
    },
  };

  return searchParameters;
};
