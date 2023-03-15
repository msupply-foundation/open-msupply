import {
  useQueryClient,
  useMutation,
  useTranslation,
  useTableStoreWithSelector,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { OutboundFragment } from './../../operations.generated';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutboundNumber } from './../utils/useOutboundNumber';
import { useOutboundIsDisabled } from './../utils/useOutboundIsDisabled';
import { useOutboundRows } from './useOutboundRows';

export const useOutboundDeleteLines = () => {
  const outboundNumber = useOutboundNumber();
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  const queryKey = api.keys.detail(outboundNumber);

  return useMutation(api.deleteLines, {
    onMutate: async lines => {
      await queryClient.cancelQueries(queryKey);
      const previous = queryClient.getQueryData<OutboundFragment>(queryKey);
      if (previous) {
        const nodes = previous.lines.nodes.filter(
          ({ id: lineId }) => !lines.find(({ id }) => lineId === id)
        );
        queryClient.setQueryData<OutboundFragment>(queryKey, {
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
        previous: OutboundFragment;
        lines: { id: string }[];
      };
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries(queryKey),
  });
};

export const useOutboundDeleteSelectedLines = (): (() => void) => {
  const { items, lines } = useOutboundRows();
  const { mutateAsync } = useOutboundDeleteLines();
  const isDisabled = useOutboundIsDisabled();
  const t = useTranslation('distribution');

  const selectedRows =
    useTableStoreWithSelector(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    }) || [];

  const onDelete = async () => {
    await mutateAsync(selectedRows || []).catch(err => {
      throw err;
    });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: onDelete,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-delete-lines', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-lines', {
        count: selectedRows.length,
      }),
    },
  });

  return confirmAndDelete;
};
