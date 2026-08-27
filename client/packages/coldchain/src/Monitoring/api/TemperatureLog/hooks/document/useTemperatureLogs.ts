import { useTemperatureLogApi } from '../utils/useTemperatureLogApi';
import { useQuery } from '@openmsupply-client/common';
import { ListParams } from '../../api';

export const useTemperatureLogs = (query: ListParams) => {
  const api = useTemperatureLogApi();

  return useQuery({
    queryKey: api.keys.paramList(query),
    queryFn: api.get.list(query)
  });
};
