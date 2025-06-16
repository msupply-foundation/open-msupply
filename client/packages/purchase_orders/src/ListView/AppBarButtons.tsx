import React, { FC } from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';

export const AppBarButtonsComponent: FC<{
  // modalController: ToggleState;
  // listParams: ListParams;
}> = () => {
  const t = useTranslation();
  // const { success, error } = useNotification();

  // const {
  //   query: { data, isLoading },
  // } = usePurchaseOrderList(listParams);

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-purchase-order')}
          onClick={() => {
            console.log('TO-DO');
          }}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
