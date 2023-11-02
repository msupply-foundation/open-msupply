import { useUrlQueryParams } from '@common/hooks';
import { useTemperatureLogApi } from '../utils/useTemperatureLogApi';
import { useQuery } from '@openmsupply-client/common';
import { ListParams } from '../../api';

export const useTemperatureLogs = () => {
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'datetime', dir: 'desc' },
    filters: [{ key: 'datetime' }],
  });

  const api = useTemperatureLogApi();

  return {
    ...useQuery(
      api.keys.paramList(queryParams as ListParams),
      api.get.list(queryParams as ListParams)
    ),
  };
};
