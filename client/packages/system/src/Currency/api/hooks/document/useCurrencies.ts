import { useQuery } from '@openmsupply-client/common';
import { useCurrencyApi } from '../utils/useCurrencyApi';

export const useCurrencies = () => {
  const api = useCurrencyApi();
  const result = useQuery(api.keys.list(), () => api.get.list());

  return { ...result };
};
