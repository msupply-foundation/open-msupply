import {
  useQueryClient,
  useMutation,
  useNotification,
  useTranslation,
  useTableStore,
} from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutboundNumber } from './../utils/useOutboundNumber';
import { useOutboundRows } from './useOutboundRows';

export const useOutboundAllocateLines = () => {
  const outboundNumber = useOutboundNumber();
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  const queryKey = api.keys.detail(outboundNumber);

  return useMutation(api.allocateLines, {
    onMutate: async () => {
      await queryClient.cancelQueries(queryKey);
    },
    onError: (error: string) => {
      throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKey);
    },
    onSettled: () => queryClient.invalidateQueries(queryKey),
  });
};

export const useOutboundAllocateSelectedLines = (): {
  onAllocate: () => Promise<void>;
} => {
  const { success, info, warning, error } = useNotification();
  const { items, lines } = useOutboundRows();
  const { mutateAsync } = useOutboundAllocateLines();
  const t = useTranslation('distribution');

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    }) ?? [];

  const selectedUnallocatedLines = selectedRows
    .filter(({ type }) => type === 'UNALLOCATED_STOCK')
    .flat()
    .map(row => row.id);

  const onAllocate = async () => {
    if (selectedRows.length === 0) {
      const infoSnack = info(t('label.select-rows-to-allocate-them'));
      infoSnack();
      return;
    }

    if (selectedUnallocatedLines.length === 0) {
      const infoSnack = info(t('label.no-unallocated-rows-selected'));
      infoSnack();
      return;
    }

    const batchResponse = await mutateAsync(selectedUnallocatedLines);

    if (batchResponse?.__typename === 'BatchOutboundShipmentResponse') {
      const { allocateOutboundShipmentUnallocatedLines } = batchResponse;
      const count = {
        success: 0,
        partial: 0,
        failed: 0,
      };

      allocateOutboundShipmentUnallocatedLines?.forEach(line => {
        const { id, response } = line;
        if (
          response?.__typename === 'AllocateOutboundShipmentUnallocatedLineNode'
        ) {
          if (response?.deletes.some(({ id: deleted }) => id === deleted)) {
            count.success++;
            return;
          }
          if (response.inserts.totalCount > 0) {
            count.partial++;
            return;
          }
          count.failed++;
        }
      });

      if (count.success > 0) {
        success(t('messages.allocated-lines', { count: count.success }))();
      }
      if (count.partial > 0) {
        warning(
          t('messages.allocated-lines-partial', { count: count.partial })
        )();
      }
      if (count.failed > 0) {
        error(t('messages.allocated-lines-failed', { count: count.failed }))();
      }
    }
  };
  return { onAllocate };
};
