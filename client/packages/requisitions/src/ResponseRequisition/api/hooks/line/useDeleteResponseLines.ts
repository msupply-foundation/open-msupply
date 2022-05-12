import {
  useQueryClient,
  useMutation,
  useNotification,
  useTranslation,
  useTableStore,
} from '@openmsupply-client/common';
import { useResponse } from '..';
import { useResponseNumber } from '../document/useResponse';
import { useResponseApi } from '../utils/useResponseApi';
import { useResponseLines } from './useResponseLines';

export const useDeleteResponseLines = () => {
  const { success, info } = useNotification();
  const { lines } = useResponseLines();
  const api = useResponseApi();
  const requestNumber = useResponseNumber();
  const isDisabled = useResponse.utils.isDisabled();
  const queryClient = useQueryClient();
  const { mutate } = useMutation(api.deleteLines, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(requestNumber)),
  });
  const t = useTranslation('distribution');

  const selectedRows = useTableStore(state =>
    lines.filter(({ id }) => state.rowState[id]?.isSelected)
  );

  const onDelete = async () => {
    if (isDisabled) {
      info(t('label.cant-delete-disabled-requisition'))();
      return;
    }
    info('Deleting response lines not yet implemented in API')();
    return;
    const number = selectedRows?.length;
    if (selectedRows && number) {
      mutate(selectedRows, {
        onSuccess: success(t('messages.deleted-lines', { count: number })),
      });
    } else {
      info(t('messages.select-rows-to-delete-them'))();
    }
  };

  return { onDelete };
};
