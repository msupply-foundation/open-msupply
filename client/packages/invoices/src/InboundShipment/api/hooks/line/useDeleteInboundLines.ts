import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useInboundId } from '../document/useInbound';
import { useInboundApi } from '../utils/useInboundApi';
import { InboundFragment } from '../../operations.generated';

export const useDeleteInboundLines = () => {
  const inboundId = useInboundId();
  const queryClient = useQueryClient();
  const api = useInboundApi();
  const queryKey = api.keys.detail(inboundId);

  return useMutation(api.deleteLines, {
    onMutate: async lines => {
      await queryClient.cancelQueries(queryKey);
      const previous = queryClient.getQueryData<InboundFragment>(queryKey);
      if (previous) {
        const nodes = previous.lines.nodes.filter(
          ({ id: lineId }) => !lines.find(({ id }) => lineId === id)
        );
        queryClient.setQueryData<InboundFragment>(queryKey, {
          ...previous,
          lines: {
            __typename: 'InvoiceLineConnector',
            nodes,
            totalCount: nodes.length,
          },
        });
      }
      return { previous, lines };
    },
    onError: (_error, _vars, ctx) => {
      // Having issues typing this correctly. If typing ctx in the args list,
      // then TS infers the wrong type for the useMutation call and all
      // hell breaks loose.
      const context = ctx as {
        previous: InboundFragment;
        lines: { id: string }[];
      };
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries(queryKey),
  });
};
