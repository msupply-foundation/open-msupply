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
import { AppRoute } from 'packages/config/src';

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
        {itemId && (
          <ButtonWithIcon
            label={t('label.view-item-details')}
            Icon={<InvoiceIcon />}
            onClick={() =>
              navigate(
                RouteBuilder.create(AppRoute.Catalogue)
                  .addPart(AppRoute.Items)
                  .addPart(itemId)
                  .build()
              )
            }
          />
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
