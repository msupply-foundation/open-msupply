import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutboundNumber } from './../utils/useOutboundNumber';

export const useOutboundSaveLines = () => {
  const outboundNumber = useOutboundNumber();
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  return useMutation(api.updateLines, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.detail(outboundNumber));
    },
  });
};
