import {
  useQueryClient,
  useNavigate,
  useMutation,
} from '@openmsupply-client/common';
import { useRequestApi } from '../utils/useRequestApi';

export const useInsertRequest = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useRequestApi();
  return useMutation(api.insert, {
    onSuccess: ({ requisitionNumber }) => {
      navigate(String(requisitionNumber));
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
