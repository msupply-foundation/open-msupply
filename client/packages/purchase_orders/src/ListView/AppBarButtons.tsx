import React from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  useNotification,
  useToggle,
  useNavigate,
} from '@openmsupply-client/common';
import {
  NameRowFragment,
  SupplierSearchModal,
} from '@openmsupply-client/system';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';

export const AppBarButtonsComponent = () => {
  const t = useTranslation();
  const modalController = useToggle();
  const navigate = useNavigate();

  const {
    create: { create },
  } = usePurchaseOrder();

  const { error } = useNotification();

  const handleSupplierSelected = async (selected: NameRowFragment) => {
    try {
      const id = await create(selected.id);
      navigate(id);
    } catch (e) {
      console.error('Error creating purchase order:', e);
      const errorSnack = error(
        `${t('error.failed-to-create-purchase-order')} ${(e as Error).message}`
      );
      errorSnack();
    }

    modalController.toggleOff();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-purchase-order')}
          onClick={modalController.toggleOn}
        />
        <SupplierSearchModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={handleSupplierSelected}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
