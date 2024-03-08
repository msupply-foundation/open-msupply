import {
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
  useParams,
  useQueryClient,
  useMutation,
} from '@openmsupply-client/common';
import { useInboundReturnRows } from './useInboundReturnRows';
import { useInboundReturnIsDisabled } from '../utils/useInboundReturnIsDisabled';
import { useReturnsApi } from '../utils/useReturnsApi';
import { InboundReturnLineFragment } from '../../operations.generated';

export const useDeleteSelectedInboundReturnLines = (): (() => void) => {
  const { items, lines } = useInboundReturnRows();
  const isDisabled = useInboundReturnIsDisabled();
  const t = useTranslation('distribution');

  const { mutateAsync } = useDeleteInboundLines();

  const selectedRows =
    useTableStore(state => {
      const { isGrouped } = state;

      return isGrouped
        ? items
            ?.filter(({ id }) => state.rowState[id]?.isSelected)
            .map(({ lines }) => lines.flat())
            .flat()
        : lines?.filter(({ id }) => state.rowState[id]?.isSelected);
    }) || [];

  const onDelete = async () => {
    await mutateAsync(selectedRows).catch(err => {
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
      cantDelete: t('label.cant-delete-disabled'),
    },
  });

  return confirmAndDelete;
};

const useDeleteInboundLines = () => {
  const { invoiceNumber = '' } = useParams();
  const queryClient = useQueryClient();
  const api = useReturnsApi();
  const queryKey = api.keys.detail(invoiceNumber);

  // TODO: Replace with actual mutation
  // return useMutation(api.updateInboundReturnLines, {
  return useMutation(async (_lines: InboundReturnLineFragment[]) => {}, {
    onSettled: () => queryClient.invalidateQueries(queryKey),
  });
};
