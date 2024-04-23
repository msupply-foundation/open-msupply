import { useTranslation } from '@common/intl';
import { VariantFragment } from '../../operations.generated';
import { usePackVariantDelete } from './usePackVariantDelete';
import { useDeleteConfirmation, useNotification } from '@common/hooks';
import { useTableStore } from '@openmsupply-client/common';

export const usePackVariantDeleteSelected = (variants: VariantFragment[]) => {
  const t = useTranslation('catalogue');
  const { mutateAsync } = usePackVariantDelete();
  const { error } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => variants?.find(({ id }) => selectedId === id))
      .filter(Boolean) as VariantFragment[],
  }));

  const deleteAction = async () => {
    const numberSelected = selectedRows.length;
    if (selectedRows && numberSelected > 0) {
      selectedRows.map(async packVariant => {
        await mutateAsync(packVariant).catch(err => {
          error(err.message);
        });
      });
    }
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: true,
    messages: {
      confirmMessage: t('messages.confirm-delete-pack-variants', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-pack-variant', {
        count: selectedRows.length,
      }),
      cantDelete: t('label.cant-delete-disabled'),
    },
  });

  return confirmAndDelete;
};
