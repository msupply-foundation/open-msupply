import React from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useTranslation,
  useToggle,
  useNavigate,
  RouteBuilder,
  UserPermission,
  useCallbackWithPermission,
  useSimplifiedTabletUI,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { PurchaseOrderSearchModal } from '../../purchase_order/Components';
import { PurchaseOrderRowFragment } from '../../purchase_order/api';
import { useGoodsReceived, useGoodsReceivedList } from '../api';
import { goodsReceivedToCsv } from '../utils';

export const AppBarButtons = () => {
  const t = useTranslation();
  const modalController = useToggle();
  const navigate = useNavigate();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const {
    query: { fetchAllGoodsReceived, isLoading },
  } = useGoodsReceivedList();
  const {
    create: { create, isCreating },
  } = useGoodsReceived();

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

  const getCsvData = async () => {
    const { data } = await fetchAllGoodsReceived();
    return data?.nodes?.length ? goodsReceivedToCsv(data.nodes, t) : null;
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
        {!simplifiedTabletView && (
          <ExportSelector
            getCsvData={getCsvData}
            filename={t('filename.goods-received')}
            isLoading={isLoading}
          />
        )}
        <PurchaseOrderSearchModal
          open={modalController.isOn}
          onClose={modalController.toggleOff}
          onChange={handlePurchaseOrderSelected}
        />
      </Grid>
    </AppBarButtonsPortal>
  );
};
