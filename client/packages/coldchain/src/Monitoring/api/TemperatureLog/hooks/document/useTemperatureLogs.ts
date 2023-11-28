import { useTemperatureLogApi } from '../utils/useTemperatureLogApi';
import { useQuery } from '@openmsupply-client/common';
import { ListParams } from '../../api';

export const useTemperatureLogs = (query: ListParams) => {
  const api = useTemperatureLogApi();

  return useQuery(api.keys.paramList(query), api.get.list(query));  
};
