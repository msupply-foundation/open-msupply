import React, { FC } from 'react';
import {
  DropdownMenu,
  DropdownMenuItem,
  useTranslation,
  DeleteIcon,
  AppBarContentPortal,
  SearchBar,
  FilterController,
  FilterRule,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import {
  PrescriptionRowFragment,
  ListParams,
  usePrescriptionList,
} from '../api';
import { canDeletePrescription } from '../../utils';

export const Toolbar: FC<{
  filter: FilterController;
  listParams: ListParams;
}> = ({ filter, listParams }) => {
  const t = useTranslation();
  const {
    delete: { deletePrescriptions },
    selectedRows,
  } = usePrescriptionList(listParams);

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: deletePrescriptions,
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

  const key = 'otherPartyName' as keyof PrescriptionRowFragment;
  const filterString =
    ((filter.filterBy?.[key] as FilterRule)?.like as string) || '';

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <SearchBar
        placeholder={t('placeholder.search-by-name')}
        value={filterString}
        onChange={newValue => {
          filter.onChangeStringFilterRule('otherPartyName', 'like', newValue);
        }}
      />

      <DropdownMenu label={t('label.actions')}>
        <DropdownMenuItem IconComponent={DeleteIcon} onClick={confirmAndDelete}>
          {t('button.delete-lines')}
        </DropdownMenuItem>
      </DropdownMenu>
    </AppBarContentPortal>
  );
};
