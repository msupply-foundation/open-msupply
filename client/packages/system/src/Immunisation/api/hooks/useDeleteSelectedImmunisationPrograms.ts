import {
  useTableStore,
  useDeleteConfirmation,
  useTranslation,
  useMutation,
} from '@openmsupply-client/common';
import { useImmunisationGraphQL } from '../useImmunisationGraphQL';
import { PROGRAM } from './keys';

export const useDeleteSelectedImmunisationPrograms = () => {
  const t = useTranslation('coldchain');
  const { api, queryClient } = useImmunisationGraphQL();

  const { mutateAsync } = useMutation(
    async ({ immunisationProgramId }: { immunisationProgramId: string }) => {
      const apiResult = await api.deleteImmunisationProgram({
        immunisationProgramId,
      });

      // The `?` after `centralServer` handles empty `apiResult` (see issue: https://github.com/msupply-foundation/open-msupply/issues/4191)
      const result = apiResult.centralServer?.program.deleteImmunisationProgram;

      if (result?.__typename === 'DeleteResponse') {
        return result.id;
      }

      throw new Error(t('error.could-not-delete-immunisation-program'));
    }
  );

  const selectedRows =
    useTableStore(state => {
      return Object.keys(state.rowState).filter(
        id => state.rowState[id]?.isSelected
      );
    }) || [];

  const onDelete = async () => {
    await Promise.all(
      selectedRows.map(
        async id => await mutateAsync({ immunisationProgramId: id })
      )
    ).then(() => queryClient.invalidateQueries([PROGRAM]));
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: onDelete,
    messages: {
      confirmMessage: t('messages.confirm-delete-immunisation-programs', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-immunisation-programs', {
        count: selectedRows.length,
      }),
    },
  });

  return confirmAndDelete;
};
