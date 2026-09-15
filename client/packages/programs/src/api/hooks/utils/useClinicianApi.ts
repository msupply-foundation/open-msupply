import { useGql, useAuthContext } from '@openmsupply-client/common';
import { ClinicianListParams, getClinicianQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const useClinicianApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['clinician', storeId] as const,
    list: (params: ClinicianListParams) =>
      [...keys.base(), 'list', params] as const,
  };
  const { client } = useGql();
  const queries = getClinicianQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
