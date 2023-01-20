import { useGql, useAuthContext } from '@openmsupply-client/common';
import { getDocumentQueries } from '../../api';
import { getSdk } from '../../operations.generated';

export const usePatientDocumentApi = () => {
  const { storeId } = useAuthContext();
  const keys = {
    base: () => ['patient', storeId] as const,
    history: (docName: string) =>
      [...keys.base(), 'doc-history', docName] as const,
    byPatient: (patientId: string) => [...keys.base(), 'p', patientId] as const,
    byName: (name: string) => [...keys.base(), 'n', name] as const,
  };
  const { client } = useGql();
  const queries = getDocumentQueries(getSdk(client), storeId);

  return { ...queries, storeId, keys };
};
