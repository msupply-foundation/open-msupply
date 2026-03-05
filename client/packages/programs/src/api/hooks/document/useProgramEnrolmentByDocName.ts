import { useQuery } from '@openmsupply-client/common';
import { useProgramEnrolmentApi } from '../utils/useProgramEnrolmentApi';

export const useProgramEnrolmentByDocName = (
  documentName: string | undefined
) => {
  const api = useProgramEnrolmentApi();

  return useQuery({
    queryKey: api.keys.byDocName(documentName ?? ''),
    queryFn: () => api.byDocName(documentName ?? ''),
    enabled: !!documentName
  });
};
