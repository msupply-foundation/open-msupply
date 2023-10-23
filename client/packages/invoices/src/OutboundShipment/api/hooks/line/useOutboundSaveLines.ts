import {
  useQueryClient,
  useMutation,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutboundNumber } from './../utils/useOutboundNumber';

export const useOutboundSaveLines = (status: InvoiceNodeStatus) => {
  const outboundNumber = useOutboundNumber();
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  return useMutation(api.updateLines(status), {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.detail(outboundNumber));
    },
  });
};
