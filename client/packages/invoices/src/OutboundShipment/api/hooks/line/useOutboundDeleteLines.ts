import {
  useQueryClient,
  useMutation,
  useNotification,
  useTranslation,
  useTableStore,
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
        lines: { id: string; invoiceId: string }[];
      };
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries(queryKey),
  });
};

export const useOutboundDeleteSelectedLines = (): {
  onDelete: () => Promise<void>;
} => {
  const { success, info } = useNotification();
  const { items, lines } = useOutboundRows();
  const { mutate } = useOutboundDeleteLines();
  const isDisabled = useOutboundIsDisabled();
  const t = useTranslation('distribution');

  const selectedRows = useTableStore(state => {
    const { isGrouped } = state;

    return isGrouped
      ? items
          ?.filter(({ id }) => state.rowState[id]?.isSelected)
          .map(({ lines }) => lines.flat())
          .flat()
      : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
  });

  const onDelete = async () => {
    if (isDisabled) {
      info(t('label.cant-delete-disabled-shipment'))();
      return;
    }
    if (selectedRows && selectedRows?.length > 0) {
      const number = selectedRows?.length;
      const onSuccess = success(t('messages.deleted-lines', { number }));
      mutate(selectedRows, {
        onSuccess,
      });
    } else {
      const infoSnack = info(t('messages.select-rows-to-delete-them'));
      infoSnack();
    }
  };

  return { onDelete };
};
