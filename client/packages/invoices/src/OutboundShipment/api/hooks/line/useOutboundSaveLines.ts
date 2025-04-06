import {
  useQueryClient,
  useMutation,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutboundId } from '../utils/useOutboundId';

export const useOutboundSaveLines = (status: InvoiceNodeStatus) => {
  const outboundId = useOutboundId();
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  return useMutation(api.updateLines(status), {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.detail(outboundId));
    },
  });
};
