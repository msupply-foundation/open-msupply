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
  useExportCSV,
  useNotification,
  LoadingButton,
  useSimplifiedTabletUI,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { PurchaseOrderSearchModal } from '../../purchase_order/Components';
import { PurchaseOrderRowFragment } from '../../purchase_order/api';
import { useGoodsReceived, useGoodsReceivedList } from '../api';
import { goodsReceivedToCsv } from '../utils';

export const AppBarButtons = () => {
  const t = useTranslation();
  const modalController = useToggle();
  const navigate = useNavigate();
  const { error } = useNotification();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const {
    query: { fetchAllGoodsReceived, isLoading },
  } = useGoodsReceivedList();
  const {
    create: { create, isCreating },
  } = useGoodsReceived();
  const exportCSV = useExportCSV();

  const csvExport = async () => {
    const { data } = await fetchAllGoodsReceived();
    if (!data || !data?.nodes.length) {
      error(t('error.no-data'))();
      return;
    }

    const csv = goodsReceivedToCsv(data.nodes, t);
    exportCSV(csv, t('filename.goods-received'));
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
        {!simplifiedTabletView && (
          <LoadingButton
            startIcon={<DownloadIcon />}
            isLoading={isLoading}
            variant="outlined"
            onClick={csvExport}
            label={t('button.export')}
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
