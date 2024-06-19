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
  const { mutateAsync } = useMutation(
    async ({ vaccineCourseId }: { vaccineCourseId: string }) => {
      const apiResult = await api.deleteVaccineCourse({ vaccineCourseId });

      // The `?` after `centralServer` handles empty `apiResult` (see issue: https://github.com/msupply-foundation/open-msupply/issues/4191)
      const result = apiResult.centralServer?.vaccineCourse.deleteVaccineCourse;

      if (result?.__typename === 'DeleteResponse') {
        return result.id;
      }

      throw new Error(t('error.could-not-delete-vaccine-course'));
    }
  );
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
    ).then(() => queryClient.invalidateQueries([VACCINE, LIST]));
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
