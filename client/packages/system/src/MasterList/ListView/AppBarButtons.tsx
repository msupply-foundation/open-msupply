import React from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  FileUtils,
  LoadingButton,
  EnvUtils,
  Platform,
  useAuthContext,
} from '@openmsupply-client/common';
import { useMasterList } from '../api/hooks';
import { masterListsToCsv } from '../../utils';

export const AppBarButtons = () => {
  const { success, error } = useNotification();
  const t = useTranslation('inventory');
  const { storeId } = useAuthContext();
  const { isLoading, fetchAsync } = useMasterList.document.listAll(
    {
      key: 'name',
      direction: 'asc',
    },
    { existsForStoreId: { equalTo: storeId } }
  );

  const csvExport = async () => {
    const data = await fetchAsync();
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
          disabled={EnvUtils.platform === Platform.Android}
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
