import React from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  DownloadIcon,
  PlusCircleIcon,
  Grid,
  useTranslation,
  useToggle,
} from '@openmsupply-client/common';
import { PurchaseOrderSearchModal } from '../../purchase_order/Components';
import { PurchaseOrderRowFragment } from '../../purchase_order/api';

export const AppBarButtons: React.FC = () => {
  const t = useTranslation();
  const modalController = useToggle();

  const handleExport = () => {
    // eslint-disable-next-line
    console.log('TO-DO: Export goods received...');
  };

  const handlePurchaseOrderSelected = (selected: PurchaseOrderRowFragment) => {
    // TODO: Create goods received from purchase order
    // eslint-disable-next-line no-console
    console.log('Selected purchase order:', selected);
    modalController.toggleOff();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-goods-received')}
          onClick={modalController.toggleOn}
        />
        <ButtonWithIcon
          Icon={<DownloadIcon />}
          label={t('button.export')}
          onClick={handleExport}
        />
        <PurchaseOrderSearchModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={handlePurchaseOrderSelected}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
