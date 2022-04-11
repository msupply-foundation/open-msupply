import React, { FC } from 'react';
import {
  DownloadIcon,
  useNotification,
  useTranslation,
  AppBarButtonsPortal,
  Grid,
  ButtonWithIcon,
  FileUtils,
} from '@openmsupply-client/common';
import { useResponses } from '../api';
import { responsesToCsv } from '../../utils';

export const AppBarButtons: FC = () => {
  const { success, error } = useNotification();
  const t = useTranslation('common');
  const { data } = useResponses();

  const csvExport = () => {
    if (!data) {
      error(t('error.no-data'))();
      return;
    }

    const csv = responsesToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, 'requisitions');
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<DownloadIcon />}
          label={t('button.export')}
          onClick={csvExport}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
