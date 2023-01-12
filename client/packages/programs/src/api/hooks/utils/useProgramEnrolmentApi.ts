import { useGql, useAuthContext } from '@openmsupply-client/common';
import {
  getProgramEnrolmentQueries,
  ProgramEnrolmentListParams,
} from '../../api';
import { getSdk } from '../../operations.generated';

export const useProgramEnrolmentApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['programEnrolment'] as const,
    list: (params: ProgramEnrolmentListParams) =>
      [...keys.base(), storeId, 'list', params] as const,
  };
  const { client } = useGql();
  const queries = getProgramEnrolmentQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
