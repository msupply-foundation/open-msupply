import {
  useMutation,
  useParams,
  useQueryClient,
} from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';
import { INBOUND, INBOUND_LINE } from '../document/keys';

export const useLinesFromInternalOrder = () => {
  const queryClient = useQueryClient();
  const api = useInboundApi();
  const { invoiceId = '' } = useParams();
  return useMutation(api.insertLinesFromInternalOrder, {
    onSettled: () =>
      queryClient.invalidateQueries([INBOUND, INBOUND_LINE, invoiceId]),
  });
};
