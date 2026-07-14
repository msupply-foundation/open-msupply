import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  ButtonWithIcon,
  PlusCircleIcon,
  useTranslation,
  useNavigate,
  RouteBuilder,
  useNotification,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useInsertStockMovement } from '../api';

export const AppBarButtons = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { error } = useNotification();
  const { insert, isSaving } = useInsertStockMovement();

  const onCreate = async () => {
    try {
      const id = await insert(undefined);
      navigate(
        RouteBuilder.create(AppRoute.Inventory)
          .addPart(AppRoute.StockMovement)
          .addPart(id)
          .build()
      );
    } catch (e) {
      error((e as Error).message)();
    }
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('label.new-stock-movement')}
          disabled={isSaving}
          onClick={onCreate}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
