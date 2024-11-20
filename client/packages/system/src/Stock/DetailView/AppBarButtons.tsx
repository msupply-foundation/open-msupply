import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  StockIcon,
  BarChart2Icon,
} from '@openmsupply-client/common';

interface AppBarButtonProps {
  openRepack: () => void;
  openAdjust: () => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  openRepack,
  openAdjust,
}) => {
  const t = useTranslation();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          label={t('button.repack')}
          Icon={<StockIcon />}
          onClick={openRepack}
        />
        <ButtonWithIcon
          label={t('button.adjust')}
          Icon={<BarChart2Icon />}
          onClick={openAdjust}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
