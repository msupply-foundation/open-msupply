import {
  useQueryClient,
  useTranslation,
  useMutation,
  useTableStore,
  useDeleteConfirmation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { canDeletePrescription } from '../../../../utils';
import { usePrescriptionApi } from '../../utils/usePrescriptionApi';
import { PrescriptionRowFragment } from '../../operations.generated';
import { usePrescriptionList } from '../usePrescriptionList';

export const usePrescriptionDeleteRows = () => {
  const queryClient = useQueryClient();
  const {
    filter,
    queryParams: { sortBy, first, offset },
  } = useUrlQueryParams({
    filters: [{ key: 'otherPartyName' }],
    initialSort: { key: 'prescriptionDatetime', dir: 'desc' },
  });
  const listParams = {
    sortBy,
    first,
    offset,
    filterBy: filter.filterBy,
  };
  const { data: rows } = usePrescriptionList(listParams);
  const api = usePrescriptionApi();
  const { mutateAsync } = useMutation(api.delete);
  const t = useTranslation();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rows?.nodes?.find(({ id }) => selectedId === id))
      .filter(Boolean) as PrescriptionRowFragment[],
  }));

  const deleteAction = async () => {
    await mutateAsync(selectedRows)
      .then(() => queryClient.invalidateQueries(api.keys.base()))
      .catch(err => {
        throw err;
      });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: selectedRows.every(canDeletePrescription),
    messages: {
      confirmMessage: t('messages.confirm-delete-prescriptions', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-prescriptions', {
        count: selectedRows.length,
      }),
    },
  });

  return confirmAndDelete;
};
