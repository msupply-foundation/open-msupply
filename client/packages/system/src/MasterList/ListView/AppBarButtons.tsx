import React from 'react';
import {
  useNotification,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
import { masterListsToCsv } from '../../utils';
import { MasterListRowFragment } from '../api';

export const AppBarButtons = ({
  data,
}: {
  data?: MasterListRowFragment[] | null;
}) => {
  const t = useTranslation();
  const { error } = useNotification();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ExportSelector
          getCsvData={() => {
            if (!data?.length) {
              error(t('error.no-data'))();
              return null;
            }
            return masterListsToCsv(data, t);
          }}
          filename={t('filename.master-lists')}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
