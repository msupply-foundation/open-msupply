import {
  useDeleteConfirmation,
  useTranslation,
  useMutation,
  noOtherVariants,
} from '@openmsupply-client/common';
import { useProgramsGraphQL } from '../useProgramsGraphQL';
import { VACCINE, LIST } from './keys';
import { VaccineCourseFragment } from '../operations.generated';

export const useDeleteSelectedVaccineCourses = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: VaccineCourseFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const { api, queryClient } = useProgramsGraphQL();
  const { mutateAsync } = useMutation(
    async ({ vaccineCourseId }: { vaccineCourseId: string }) => {
      const apiResult = await api.deleteVaccineCourse({ vaccineCourseId });

      // The `?` after `centralServer` handles empty `apiResult` (see issue: https://github.com/msupply-foundation/open-msupply/issues/4191)
      return apiResult.centralServer?.vaccineCourse.deleteVaccineCourse;
    }
  );

  const mapStructuredErrors = (
    result: Awaited<ReturnType<typeof mutateAsync>>
  ) => {
    if (result?.__typename === 'DeleteResponse') return;
    if (!result) return;

    const { error } = result;

    switch (error?.__typename) {
      case 'VaccineCourseInUse': {
        return t('error.vaccine-course-in-use');
      }
      default:
        return noOtherVariants(error.__typename);
    }
  };

  const onDelete = async () => {
    for (const row of selectedRows) {
      const result = await mutateAsync({ vaccineCourseId: row.id });
      const errorMessage = mapStructuredErrors(result);
      if (errorMessage) {
        throw new Error(errorMessage);
      }

      await queryClient.invalidateQueries([VACCINE, LIST]);
      resetRowSelection();
    }
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
      cantDelete: (err: Error) => err.message,
    },
  });

  return { confirmAndDelete };
};
