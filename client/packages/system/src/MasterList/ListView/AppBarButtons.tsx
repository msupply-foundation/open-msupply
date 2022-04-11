import React, { FC } from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  FileUtils,
} from '@openmsupply-client/common';
import { useMasterLists } from '../api/hooks';
import { masterListsToCsv } from '../../utils';

export const AppBarButtons: FC = () => {
  const { success, error } = useNotification();
  const t = useTranslation('inventory');
  const { data } = useMasterLists();

  const csvExport = () => {
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = masterListsToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.master-lists'));
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
