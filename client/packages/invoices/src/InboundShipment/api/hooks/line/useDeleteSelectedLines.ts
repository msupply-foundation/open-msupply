import {
  useTableStore,
  useTranslation,
  useNotification,
} from '@openmsupply-client/common';
import { useIsInboundDisabled } from '../utils/useIsInboundDisabled';
import { useDeleteInboundLines } from './useDeleteInboundLines';
import { useInboundRows } from './useInboundRows';

export const useDeleteSelectedLines = (): {
  onDelete: () => Promise<void>;
} => {
  const { success, info } = useNotification();
  const { items, lines } = useInboundRows();
  const { mutate } = useDeleteInboundLines();
  const isDisabled = useIsInboundDisabled();
  const t = useTranslation('replenishment');

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
      info(t('label.cant-delete-disabled'))();
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
