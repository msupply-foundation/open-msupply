import {
  useQueryClient,
  useMutation,
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { OutboundFragment } from './../../operations.generated';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutboundId } from '../utils/useOutboundId';
import { useOutboundIsDisabled } from './../utils/useOutboundIsDisabled';
import { StockOutLineFragment } from 'packages/invoices/src/StockOut';

export const useOutboundDeleteLines = () => {
  const outboundId = useOutboundId();
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  const queryKey = api.keys.detail(outboundId);

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

export const useOutboundDeleteSelectedLines = (
  rowsToDelete: StockOutLineFragment[],
  resetRowSelection: () => void
): (() => void) => {
  const { mutateAsync } = useOutboundDeleteLines();
  const isDisabled = useOutboundIsDisabled();
  const t = useTranslation();

  const onDelete = async () => {
    await mutateAsync(rowsToDelete || []).catch(err => {
      throw err;
    });
    resetRowSelection();
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows: rowsToDelete,
    deleteAction: onDelete,
    canDelete: !isDisabled,
    messages: {
      confirmMessage: t('messages.confirm-delete-invoice-lines', {
        count: rowsToDelete.length,
      }),
      deleteSuccess: t('messages.deleted-lines', {
        count: rowsToDelete.length,
      }),
    },
  });

  return confirmAndDelete;
};
