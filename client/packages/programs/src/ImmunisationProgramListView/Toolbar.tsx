import React, { FC } from 'react';
import {
  AppBarContentPortal,
  DeleteIcon,
  DropdownMenu,
  DropdownMenuItem,
  useTranslation,
} from '@openmsupply-client/common';
import { useDeleteSelectedImmunisationPrograms } from '../api';

export const Toolbar: FC = () => {
  const t = useTranslation();
  const onDelete = useDeleteSelectedImmunisationPrograms();

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'end',
        display: 'flex',
      }}
    >
      <DropdownMenu label={t('label.actions')}>
        <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
          {t('button.delete-lines')}
        </DropdownMenuItem>
      </DropdownMenu>
    </AppBarContentPortal>
  );
};
