import React from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  //   FnUtils,
  //   FileUtils,
  LoadingButton,
  EnvUtils,
  Platform,
} from '@openmsupply-client/common';
// import { useAsset } from '../api';
// import { assetsToCsv } from '../../utils';

export const AppBarButtonsComponent = () => {
  const { success /* , error */ } = useNotification();
  //   const { mutate: onCreate } = useOutbound.document.insert();
  const t = useTranslation(['catalogue']);
  //   const { fetchAsync, isLoading } = useOutbound.document.listAll({
  //     key: 'createdDateTime',
  //     direction: 'desc',
  //     isDesc: true,
  //   });

  const csvExport = async () => {
    // const data = await fetchAsync();
    // if (!data || !data?.nodes.length) {
    //   error(t('error.no-data'))();
    //   return;
    // }

    // const csv = outboundsToCsv(data.nodes, t);
    // FileUtils.exportCSV(csv, t('filename.outbounds'));
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={false}
          variant="outlined"
          onClick={csvExport}
          disabled={EnvUtils.platform === Platform.Android}
        >
          {t('button.export')}
        </LoadingButton>
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
