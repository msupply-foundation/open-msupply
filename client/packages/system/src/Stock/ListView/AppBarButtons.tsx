import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useTranslation,
  PlusCircleIcon,
  ButtonWithIcon,
  useEditModal,
  useSimplifiedTabletUI,
  usePreferences,
  FilterBy,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
import { stockLinesToCsv } from '../../utils';
import { NewStockLineModal } from '../Components/NewStockLineModal';
import { useExportStockList } from '../api/hooks/useExportStockList';

export const AppBarButtonsComponent = ({
  exportFilter,
}: {
  exportFilter: FilterBy | null;
}) => {
  const t = useTranslation();
  const { fetchStock, isLoading } = useExportStockList(exportFilter);
  const simplifiedTabletView = useSimplifiedTabletUI();
  const { manageVvmStatusForStock } = usePreferences();

  const { isOpen, onClose, onOpen } = useEditModal();

  const getCsvData = async () => {
    const { data } = await fetchStock();
    return data?.nodes?.length
      ? stockLinesToCsv(data.nodes, t, !!manageVvmStatusForStock)
      : null;
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
          <ExportSelector
            getCsvData={getCsvData}
            filename={t('filename.stock')}
            isLoading={isLoading}
          />
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
