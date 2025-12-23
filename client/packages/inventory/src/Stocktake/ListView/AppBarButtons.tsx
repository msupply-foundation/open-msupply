import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  ButtonWithIcon,
  PlusCircleIcon,
  useToggle,
  useSimplifiedTabletUI,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
import { useTranslation } from '@common/intl';
import { useStocktakeOld } from '../api';
import { stocktakesToCsv } from '../../utils';
import { CreateStocktakeInput } from '../api/hooks/useStocktake';
import { CreateStocktakeModal } from './CreateStocktakeModal';

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
  const { isLoading, fetchAsync } = useStocktakeOld.document.listAll({
    key: 'createdDatetime',
    direction: 'desc',
    isDesc: true,
  });
  const simplifiedTabletView = useSimplifiedTabletUI();
  const getCsvData = async () => {
    const data = await fetchAsync();
    return data?.nodes?.length ? stocktakesToCsv(data.nodes, t) : null;
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
          <ExportSelector
            getCsvData={getCsvData}
            filename={t('filename.stocktakes')}
            isLoading={isLoading}
          />
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};
