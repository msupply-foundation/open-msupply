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
  PlusCircleIcon,
  ButtonWithIcon,
  useEditModal,
} from '@openmsupply-client/common';
import { stockLinesToCsv } from '../../utils';
import { NewStockLineModal } from '../Components/NewStockLineModal';
import { useExportStockList } from '../api/hooks/useExportStockList';

export const AppBarButtonsComponent = () => {
  const { success, error } = useNotification();
  const t = useTranslation();
  const { fetchAllStock, isLoading } = useExportStockList();

  const { isOpen, onClose, onOpen } = useEditModal();

  const csvExport = async () => {
    const { data } = await fetchAllStock();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = stockLinesToCsv(data.nodes, t);
    FileUtils.exportCSV(csv, t('filename.stock'));
    success(t('success'))();
  };

  return (
    <AppBarButtonsPortal>
      {isOpen && <NewStockLineModal isOpen={isOpen} onClose={onClose} />}

      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-stock')}
          onClick={onOpen}
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          isLoading={isLoading}
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
