import { useQuery } from '@openmsupply-client/common';
import { useProgramEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export const useProgramEnrolmentByDocName = (
  documentName: string | undefined
) => {
  const api = useProgramEnrolmentApi();

  return useQuery(
    api.keys.byDocName(documentName ?? ''),
    () => api.byDocName(documentName ?? ''),
    { enabled: !!documentName }
  );
};
