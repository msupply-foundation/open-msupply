import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  PrinterIcon,
  ReportCategory,
} from '@openmsupply-client/common';
import { useIsInboundDisabled } from '../api';
import { ReportSelector, useReports } from '@openmsupply-client/system';

interface AppBarButtonProps {
  onAddItem: (newState: boolean) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
}) => {
  const isDisabled = useIsInboundDisabled();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation('common');
  const { data } = useReports(ReportCategory.InboundShipment);
  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ReportSelector>
          <ButtonWithIcon
            disabled={isDisabled}
            label={t('button.print')}
            Icon={<PrinterIcon />}
            onClick={() => console.log('print', data)}
          />
        </ReportSelector>
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={() => onAddItem(true)}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
