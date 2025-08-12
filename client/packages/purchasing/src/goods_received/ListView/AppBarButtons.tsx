import React from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  DownloadIcon,
  PlusCircleIcon,
  Grid,
  useTranslation,
  useToggle,
  useNavigate,
  RouteBuilder,
  UserPermission,
  useCallbackWithPermission,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { PurchaseOrderSearchModal } from '../../purchase_order/Components';
import { PurchaseOrderRowFragment } from '../../purchase_order/api';
import { useGoodsReceived } from '../api';

export const AppBarButtons: React.FC = () => {
  const t = useTranslation();
  const modalController = useToggle();
  const navigate = useNavigate();

  const {
    create: { create, isCreating },
  } = useGoodsReceived();

  const handleExport = () => {
    // eslint-disable-next-line
    console.log('TO-DO: Export goods received...');
  };

  const openModal = useCallbackWithPermission(
    UserPermission.PurchaseOrderMutate,
    modalController.toggleOn
  );

  const handlePurchaseOrderSelected = async (
    selected: PurchaseOrderRowFragment
  ) => {
    try {
      const result = await create(selected.id);
      const goodsReceivedId = result?.insertGoodsReceived?.id;

      if (goodsReceivedId) {
        const detailRoute = RouteBuilder.create(AppRoute.Replenishment)
          .addPart(AppRoute.GoodsReceived)
          .addPart(goodsReceivedId)
          .build();
        navigate(detailRoute);
      }
    } catch (error) {
      console.error('Failed to create goods received:', error);
    }

    modalController.toggleOff();
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-goods-received')}
          onClick={openModal}
          loading={isCreating}
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
