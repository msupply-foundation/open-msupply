import React from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  FilterIcon,
  Grid,
  PrinterIcon,
  useTranslation,
} from '@openmsupply-client/common';

interface AppBarButtonsProps {
  onFilterOpen: () => void;
  isFilterDisabled: boolean;
  printReport: () => void;
  isPrinting: boolean;
}

export const AppBarButtonsComponent = ({
  onFilterOpen,
  isFilterDisabled,
  printReport,
  isPrinting,
}: AppBarButtonsProps) => {
  const t = useTranslation();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isFilterDisabled}
          label={t('label.filters')}
          Icon={<FilterIcon />}
          onClick={() => onFilterOpen()}
        />
        <ButtonWithIcon
          disabled={isPrinting}
          label={t('button.print')}
          Icon={<PrinterIcon />}
          onClick={() => printReport()}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
