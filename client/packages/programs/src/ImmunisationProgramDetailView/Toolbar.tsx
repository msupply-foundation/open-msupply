import React from 'react';
import {
  AppBarContentPortal,
  DeleteIcon,
  DropdownMenu,
  DropdownMenuItem,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';
import { useDeleteSelectedVaccineCourses } from '../api';

export const Toolbar = () => {
  const t = useTranslation();
  const onDelete = useDeleteSelectedVaccineCourses();

  return (
    <AppBarContentPortal sx={{ width: '100%' }}>
      <Grid
        container
        sx={{
          display: 'flex',
          justifyContent: 'end',
          marginBottom: 1,
        }}
      >
        <Grid item>
          <DropdownMenu label={t('label.actions')}>
            <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
              {t('button.delete-lines')}
            </DropdownMenuItem>
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
