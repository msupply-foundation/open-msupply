import React from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  useDetailPanel,
  useTranslation,
  ReportContext,
} from '@openmsupply-client/common';
import { ReportSelector } from '@openmsupply-client/system';
import { StockMovementFragment } from '../api';
import { isStockMovementDisabled } from '../utils';

interface AppBarButtonsProps {
  movement: StockMovementFragment;
  onAddLine: () => void;
}

export const AppBarButtonsComponent = ({
  movement,
  onAddLine,
}: AppBarButtonsProps) => {
  const t = useTranslation();
  const { OpenButton } = useDetailPanel();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isStockMovementDisabled(movement.status)}
          label={t('button.add-line')}
          Icon={<PlusCircleIcon />}
          onClick={onAddLine}
        />
        <ReportSelector
          context={ReportContext.StockMovement}
          dataId={movement.id}
          extraArguments={{ relocationIds: [movement.id] }}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
