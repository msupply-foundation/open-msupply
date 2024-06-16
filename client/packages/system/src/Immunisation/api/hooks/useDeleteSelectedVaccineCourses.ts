import {
  useTableStore,
  useDeleteConfirmation,
  useTranslation,
  useMutation,
} from '@openmsupply-client/common';
import { useImmunisationGraphQL } from '../useImmunisationGraphQL';
import { VACCINE, LIST } from './keys';

export const useDeleteSelectedVaccineCourses = () => {
  const { api, queryClient } = useImmunisationGraphQL();
  const { mutateAsync } = useMutation(api.deleteVaccineCourse);
  const t = useTranslation('coldchain');

  const selectedRows =
    useTableStore(state => {
      return Object.keys(state.rowState).filter(
        id => state.rowState[id]?.isSelected
      );
    }) || [];

  const onDelete = async () => {
    await Promise.all(
      selectedRows.map(id => mutateAsync({ vaccineCourseId: id }))
    )
      .then(() => queryClient.invalidateQueries([VACCINE, LIST]))
      .catch(err => {
        console.error(err);
        throw err;
      });
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: onDelete,
    messages: {
      confirmMessage: t('messages.confirm-delete-vaccine-courses', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-vaccine-courses', {
        count: selectedRows.length,
      }),
    },
  });

  return confirmAndDelete;
};
