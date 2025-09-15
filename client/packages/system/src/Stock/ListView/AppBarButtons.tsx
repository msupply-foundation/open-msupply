import React from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  LoadingButton,
  PlusCircleIcon,
  ButtonWithIcon,
  useEditModal,
  useSimplifiedTabletUI,
  useExportCSV,
  usePreferences,
  FilterByWithBoolean,
} from '@openmsupply-client/common';
import { stockLinesToCsv } from '../../utils';
import { NewStockLineModal } from '../Components/NewStockLineModal';
import { useExportStockList } from '../api/hooks/useExportStockList';

export const AppBarButtonsComponent = ({
  exportFilter,
}: {
  exportFilter: FilterByWithBoolean | null;
}) => {
  const { error } = useNotification();
  const t = useTranslation();
  const { fetchAllStock, isLoading } = useExportStockList(exportFilter);
  const simplifiedTabletView = useSimplifiedTabletUI();
  const exportCSV = useExportCSV();
  const { manageVvmStatusForStock } = usePreferences();

  const { isOpen, onClose, onOpen } = useEditModal();

  const csvExport = async () => {
    const { data } = await fetchAllStock();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = stockLinesToCsv(data.nodes, t, !!manageVvmStatusForStock);
    exportCSV(csv, t('filename.stock'));
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
        {!simplifiedTabletView && (
          <LoadingButton
            startIcon={<DownloadIcon />}
            isLoading={isLoading}
            variant="outlined"
            onClick={csvExport}
            label={t('button.export')}
          />
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
