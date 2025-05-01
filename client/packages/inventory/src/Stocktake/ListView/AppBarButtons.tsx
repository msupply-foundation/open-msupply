import React, { FC } from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  Grid,
  FileUtils,
  LoadingButton,
  EnvUtils,
  Platform,
  ButtonWithIcon,
  PlusCircleIcon,
  useToggle,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { useStocktake } from '../api';
import { stocktakesToCsv } from '../../utils';
import { CreateStocktakeModal } from './CreateStocktakeModal';

export const AppBarButtons: FC = () => {
  const modalController = useToggle();
  const { success, error } = useNotification();
  const t = useTranslation();
  const { isLoading, fetchAsync } = useStocktake.document.listAll({
    key: 'createdDatetime',
    direction: 'desc',
    isDesc: true,
  });

  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = stocktakesToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.stocktakes'));
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('label.new-stocktake')}
          onClick={modalController.toggleOn}
        />
        <CreateStocktakeModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          isLoading={isLoading}
          onClick={csvExport}
          disabled={EnvUtils.platform === Platform.Android}
          label={t('button.export')}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
