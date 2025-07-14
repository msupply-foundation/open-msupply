import {
  useQueryClient,
  useMutation,
  useNotification,
  useTranslation,
  useTableStore,
  LocaleKey,
  TypedTFunction,
} from '@openmsupply-client/common';
import { useOutboundApi } from './../utils/useOutboundApi';
import { useOutboundId } from '../utils/useOutboundId';
import { useOutboundRows } from './useOutboundRows';
import { UpsertOutboundShipmentMutation } from '../../operations.generated';

export const useOutboundAllocateLines = () => {
  const outboundId = useOutboundId();
  const queryClient = useQueryClient();
  const api = useOutboundApi();
  const queryKey = api.keys.detail(outboundId);

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
  const t = useTranslation();
  const { success, info, warning, error } = useNotification();
  const { items, lines } = useOutboundRows();
  const { mutateAsync } = useOutboundAllocateLines();
  const { clearSelected } = useTableStore();

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
      clearSelected();
      return;
    }

    const batchResponse = await mutateAsync(selectedUnallocatedLines);

    if (batchResponse?.__typename === 'BatchOutboundShipmentResponse') {
      const { allocateOutboundShipmentUnallocatedLines } = batchResponse;

      if (!allocateOutboundShipmentUnallocatedLines) {
        return;
      }

      const result = mapResult(allocateOutboundShipmentUnallocatedLines);

      if (result.success > 0) {
        success(t('messages.allocated-lines', { count: result.success }))();
      }

      if (result.partial.count > 0) {
        warning(
          t('messages.allocated-lines-partial', {
            count: result.partial.count,
          }) + getSkippedLinesMessage(t, result.partial)
        )();
      }
      if (result.failed.count > 0) {
        error(
          t('messages.allocated-lines-failed', { count: result.failed.count }) +
            getSkippedLinesMessage(t, result.failed)
        )();
      }
      if (result.failed.count === 0 && result.partial.count === 0) {
        clearSelected();
      }
    }
  };
  return { onAllocate };
};

const getSkippedLinesMessage = (
  t: TypedTFunction<LocaleKey>,
  result: {
    unallocatedReasonKeys: Set<LocaleKey>;
  }
) => {
  if (result.unallocatedReasonKeys.size > 0) {
    return ` ${t('messages.allocated-lines-skipped-line-reasons', {
      reasons: Array.from(result.unallocatedReasonKeys)
        .map(key => t(key))
        .join(', '),
    })}`;
  }
  return '';
};

export type AllocationResult = NonNullable<
  UpsertOutboundShipmentMutation['batchOutboundShipment']['allocateOutboundShipmentUnallocatedLines']
>[number];

type MappedAllocationResult = {
  success: number;
  partial: {
    count: number;
    unallocatedReasonKeys: Set<LocaleKey>;
  };
  failed: {
    count: number;
    unallocatedReasonKeys: Set<LocaleKey>;
  };
};

export function mapResult(
  apiResult: AllocationResult[]
): MappedAllocationResult {
  const result: MappedAllocationResult = {
    success: 0,
    partial: {
      count: 0,
      unallocatedReasonKeys: new Set<LocaleKey>(),
    },
    failed: {
      count: 0,
      unallocatedReasonKeys: new Set<LocaleKey>(),
    },
  };

  apiResult?.forEach(line => {
    const { id, response } = line;
    if (
      response?.__typename === 'AllocateOutboundShipmentUnallocatedLineNode'
    ) {
      // If placeholder line was deleted, full requested quantity was allocated -> success
      if (response?.deletes.some(({ id: deleted }) => id === deleted)) {
        result.success++;
        return;
      }
      // If not deleted, we weren't able to allocate the full requested quantity
      const resultType =
        // If a new line was created, or an existing line was updated, some stock was allocated -> partial success
        response.inserts.totalCount > 0 ||
        // (Checking for updates > 1 as both the placeholder line and the stockout line would be updated)
        response.updates.totalCount > 1
          ? 'partial'
          : 'failed';

      // Update count and potential reasons
      result[resultType].count++;

      if (response.skippedExpiredStockLines?.totalCount > 0) {
        result[resultType].unallocatedReasonKeys.add('label.expired');
      }
      if (response.skippedOnHoldStockLines?.totalCount > 0) {
        result[resultType].unallocatedReasonKeys.add('label.on-hold');
      }
      if (response.skippedUnusableVvmStatusLines?.totalCount > 0) {
        result[resultType].unallocatedReasonKeys.add(
          'label.unusable-vvm-status'
        );
      }
      return;
    }
  });

  return result;
}
