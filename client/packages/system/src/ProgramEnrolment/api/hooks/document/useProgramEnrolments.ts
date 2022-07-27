import { useQuery, useUrlQueryParams } from '@openmsupply-client/common';
import { usePatientEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export const useProgramEnrolments = () => {
  const api = usePatientEnrolmentApi();
  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'type', dir: 'asc' },
  });
  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list(queryParams)
    ),
  };
};
