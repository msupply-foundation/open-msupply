import {
  useAuthContext,
  useGql,
  useQueryClient,
} from '@openmsupply-client/common';
import { getSdk } from './operations.generated';

// TODO: generic useGraphql with all except stock API
export const usePatientGraphQL = () => {
  const { client } = useGql();
  const queryClient = useQueryClient();
  const { storeId } = useAuthContext();
  const patientApi = getSdk(client);

  return { patientApi, queryClient, storeId };
};
