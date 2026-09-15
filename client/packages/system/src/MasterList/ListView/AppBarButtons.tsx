import React from 'react';
import {
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
  const getCsvData = () => (data ? masterListsToCsv(data, t) : null);

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ExportSelector
          getCsvData={getCsvData}
          filename={t('filename.master-lists')}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
