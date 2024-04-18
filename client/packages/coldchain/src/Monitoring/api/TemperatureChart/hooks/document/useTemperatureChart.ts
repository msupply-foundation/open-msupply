import { useTemperatureChartApi } from '../utils/useTemperatureChartApi';
import { useQuery } from '@openmsupply-client/common';
import { ListParams } from '../../api';

export const useTemperatureChart = (query: ListParams) => {
  const api = useTemperatureChartApi();

  return useQuery(api.keys.paramList(query), api.get.chart(query));
};
