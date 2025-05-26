import React from 'react';
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
  useSimplifiedTabletUI,
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
  navigate: (id: string) => void;
}

export const AppBarButtons = ({
  onCreate,
  isCreating,
  navigate,
  description,
}: AppBarButtonsProps) => {
  const t = useTranslation();
  const modalController = useToggle();
  const { success, error } = useNotification();
  const { isLoading, fetchAsync } = useStocktakeOld.document.listAll({
    key: 'createdDatetime',
    direction: 'desc',
    isDesc: true,
  });
  const simplifiedTabletView = useSimplifiedTabletUI();

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
          onCreate={onCreate}
          isCreating={isCreating}
          navigate={navigate}
          description={description}
        />
        {!simplifiedTabletView && (
          <LoadingButton
            startIcon={<DownloadIcon />}
            variant="outlined"
            isLoading={isLoading}
            onClick={csvExport}
            disabled={EnvUtils.platform === Platform.Android}
            label={t('button.export')}
          />
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};
