import {
  useTranslation,
  useQueryClient,
  useMutation,
  useNotification,
  useTableStore,
} from '@openmsupply-client/common';
import { useRequestNumber } from '../document/useRequest';
import { useIsRequestDisabled } from '../utils/useIsRequestDisabled';
import { useRequestApi } from '../utils/useRequestApi';
import { useRequestLines } from './useRequestLines';

export const useDeleteRequestLines = () => {
  const { success, info } = useNotification();
  const { lines } = useRequestLines();
  const api = useRequestApi();
  const requestNumber = useRequestNumber();
  const isDisabled = useIsRequestDisabled();
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
    const number = selectedRows?.length;
    if (selectedRows && number) {
      mutate(selectedRows, {
        onSuccess: success(t('messages.deleted-lines', { number: number })),
      });
    } else {
      info(t('messages.select-rows-to-delete-them'))();
    }
  };

  return { onDelete };
};
