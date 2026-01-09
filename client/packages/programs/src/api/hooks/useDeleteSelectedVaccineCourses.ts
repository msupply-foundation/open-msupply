import {
  useDeleteConfirmation,
  useTranslation,
  useMutation,
} from '@openmsupply-client/common';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { VACCINE, LIST } from './keys';
import { VaccineCourseFragment } from '../operations.generated';

export const useDeleteSelectedVaccineCourses = ({ selectedRows, resetRowSelection }: {
  selectedRows: VaccineCourseFragment[],
  resetRowSelection: () => void,
}) => {
  const t = useTranslation();
  const { api, queryClient } = useProgramsGraphQL();
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

  const onDelete = async () => {
    await Promise.all(
      selectedRows.map(row => mutateAsync({ vaccineCourseId: row.id }))
    ).then(() => queryClient.invalidateQueries([VACCINE, LIST]));
    resetRowSelection();
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

  return { confirmAndDelete };
};
