import React from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  FilterIcon,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';

interface AppBarButtonsProps {
  onFilterOpen: () => void;
  isDisabled: boolean;
}

export const AppBarButtonsComponent = ({
  onFilterOpen,
  isDisabled,
}: AppBarButtonsProps) => {
  const t = useTranslation();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('label.filters')}
          Icon={<FilterIcon />}
          onClick={() => onFilterOpen()}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
