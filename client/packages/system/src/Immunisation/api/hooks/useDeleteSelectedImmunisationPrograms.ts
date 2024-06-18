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

      // NOTE: per the types, `apiResult` should always be a `DeleteImmunisationProgramMutation`.
      // However, if there is a standard error, `GqlContext` will instead return an empty object
      // in a non type-safe manner :cry:
      // TODO: link to refactor issue
      // The `?` after centralServer handles if `apiResult` is an empty object
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
