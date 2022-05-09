import React, { FC } from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  FileUtils,
  LoadingButton,
  SortBy,
} from '@openmsupply-client/common';
import { useMasterList } from '../api/hooks';
import { masterListsToCsv } from '../../utils';
import { MasterListRowFragment } from '../api';

export const AppBarButtons: FC<{
  sortBy: SortBy<MasterListRowFragment>;
}> = ({ sortBy }) => {
  const { success, error } = useNotification();
  const t = useTranslation('inventory');
  const { isLoading, mutateAsync } = useMasterList.document.listAll(sortBy);

  const csvExport = async () => {
    const data = await mutateAsync();
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
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          isLoading={isLoading}
          onClick={csvExport}
        >
          {t('button.export')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};
