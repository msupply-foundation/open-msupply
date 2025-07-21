import React from 'react';
import {
  DownloadIcon,
  useNotification,
  AppBarButtonsPortal,
  Grid,
  LoadingButton,
  ButtonWithIcon,
  PlusCircleIcon,
  useToggle,
  useSimplifiedTabletUI,
  useExportCSV,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { useStocktakeOld } from '../api';
import { stocktakesToCsv } from '../../utils';
import { CreateStocktakeModal } from './CreateStocktakeModal';
import { CreateStocktakeInput } from '../api/hooks/useStocktake';

interface AppBarButtonsProps {
  description: string;
  onCreate: (input: CreateStocktakeInput) => Promise<string | undefined>;
  isCreating: boolean;
}

export const AppBarButtons = ({
  onCreate,
  isCreating,
  description,
}: AppBarButtonsProps) => {
  const t = useTranslation();
  const modalController = useToggle();
  const { error } = useNotification();
  const { isLoading, fetchAsync } = useStocktakeOld.document.listAll({
    key: 'createdDatetime',
    direction: 'desc',
    isDesc: true,
  });
  const simplifiedTabletView = useSimplifiedTabletUI();
  const exportCSV = useExportCSV();

  const csvExport = async () => {
    const data = await fetchAsync();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = stocktakesToCsv(data.nodes, t);
    exportCSV(csv, t('filename.stocktakes'));
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
          onCreate={onCreate}
          isCreating={isCreating}
          description={description}
        />
        {!simplifiedTabletView && (
          <LoadingButton
            startIcon={<DownloadIcon />}
            variant="outlined"
            isLoading={isLoading}
            onClick={csvExport}
            label={t('button.export')}
          />
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};
