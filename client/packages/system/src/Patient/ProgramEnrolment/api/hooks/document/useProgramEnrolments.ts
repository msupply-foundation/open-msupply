import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { useProgramEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export const useProgramEnrolments = () => {
  const api = useProgramEnrolmentApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'type', dir: 'asc' },
  });
  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams)
    ),
  };
};
