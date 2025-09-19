import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  StockIcon,
  BarChart2Icon,
  InvoiceIcon,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

interface AppBarButtonProps {
  openRepack: () => void;
  openAdjust: () => void;
  itemId: string | undefined;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  openRepack,
  openAdjust,
  itemId,
}) => {
  const t = useTranslation();
  const navigate = useNavigate();

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
