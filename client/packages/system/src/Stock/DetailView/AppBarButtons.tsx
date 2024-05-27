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
  const t = useTranslation('inventory');

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          // disabled={isDisabled}
          label={t('button.repack')}
          Icon={<StockIcon />}
          // TO-DO: Add repack modal
          onClick={openRepack}
        />
        <ButtonWithIcon
          // disabled={isDisabled}
          label={t('button.adjust')}
          Icon={<BarChart2Icon />}
          // TO-DO: Add adjustment modal
          onClick={openAdjust}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
