import {
  useQueryClient,
  useMutation,
  useTableStore,
  useTranslation,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { usePrescriptionNumber } from '../../utils/usePrescriptionNumber';
import { usePrescriptionApi } from '../utils/usePrescriptionApi';
import { PrescriptionRowFragment } from '../../operations.generated';
import { usePrescriptionRows } from './usePrescriptionRows';
import { usePrescriptionIsDisabled } from '../utils/usePrescriptionIsDisabled';

export const usePrescriptionDeleteLines = () => {
  const prescriptionNumber = usePrescriptionNumber();
  const queryClient = useQueryClient();
  const api = usePrescriptionApi();
  const queryKey = api.keys.detail(prescriptionNumber);

  return useMutation(api.deleteLines, {
    onMutate: async lines => {
      await queryClient.cancelQueries(queryKey);
      const previous =
        queryClient.getQueryData<PrescriptionRowFragment>(queryKey);
      if (previous) {
        const nodes = previous.lines.nodes.filter(
          ({ id: lineId }) => !lines.find(({ id }) => lineId === id)
        );
        queryClient.setQueryData<PrescriptionRowFragment>(queryKey, {
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
        previous: PrescriptionRowFragment;
        lines: { id: string }[];
      };
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries(queryKey),
  });
};

export const usePrescriptionDeleteSelectedLines = (): (() => void) => {
  const { items } = usePrescriptionRows();
  const { mutateAsync } = usePrescriptionDeleteLines();
  const isDisabled = usePrescriptionIsDisabled();
  const t = useTranslation('dispensary');

  const selectedRows =
    useTableStore(state => {
      return items
        ?.filter(({ id }) => state.rowState[id]?.isSelected)
        .map(({ lines }) => lines.flat())
        .flat();
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

export const usePrescriptionDeleteAllLines = (): (() => Promise<void>) => {
  const { items } = usePrescriptionRows();
  const { mutateAsync } = usePrescriptionDeleteLines();

  // Select all rows!
  const selectedRows =
    (items ?? []).map(({ lines }) => lines.flat()).flat() ?? [];

  if (selectedRows.length === 0) {
    return async () => {};
  }

  const onDelete = async () => {
    mutateAsync(selectedRows || []).catch(err => {
      throw err;
    });
  };

  return onDelete;
};
