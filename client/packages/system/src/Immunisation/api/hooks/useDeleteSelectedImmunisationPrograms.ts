import {
  useTableStore,
  useDeleteConfirmation,
  useTranslation,
  useMutation,
} from '@openmsupply-client/common';
import { useImmunisationGraphQL } from '../useImmunisationGraphQL';
import { PROGRAM } from './keys';

export const useDeleteSelectedImmunisationPrograms = () => {
  const { api, queryClient } = useImmunisationGraphQL();
  const { mutateAsync } = useMutation(api.deleteImmunisationProgram);
  const t = useTranslation('coldchain');

  const selectedRows =
    useTableStore(state => {
      return Object.keys(state.rowState).filter(
        id => state.rowState[id]?.isSelected
      );
    }) || [];

  const onDelete = async () => {
    await Promise.all(
      selectedRows.map(id => mutateAsync({ immunisationProgramId: id }))
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
