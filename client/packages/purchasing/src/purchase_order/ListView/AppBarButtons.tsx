import React from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  useNotification,
  useNavigate,
  LoadingButton,
  DownloadIcon,
  useExportCSV,
  ToggleState,
  ListIcon,
  RouteBuilder,
} from '@openmsupply-client/common';
import {
  NameRowFragment,
  SupplierSearchModal,
} from '@openmsupply-client/system';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';
import { PurchaseOrderRowFragment } from '../api';
import { purchaseOrderToCsv } from '../../utils';
import { AppRoute } from 'packages/config/src';

interface AppBarButtonProps {
  data?: PurchaseOrderRowFragment[];
  isLoading: boolean;
  modalController: ToggleState;
  onCreate: () => void;
}

export const AppBarButtonsComponent = ({
  data,
  isLoading,
  modalController,
  onCreate,
}: AppBarButtonProps) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const exportCsv = useExportCSV();
  const { error } = useNotification();

  const {
    create: { create },
  } = usePurchaseOrder();

  const handleSupplierSelected = async (selected: NameRowFragment) => {
    try {
      const result = await create(selected.id);
      navigate(result?.insertPurchaseOrder?.id);
    } catch (e) {
      console.error('Error creating purchase order:', e);
      const errorSnack = error(
        `${t('error.failed-to-create-purchase-order')} ${(e as Error).message}`
      );
      errorSnack();
    }
    modalController.toggleOff();
  };

  const handleCsvExportClick = async () => {
    if (!data || !data.length) return error(t('error.no-data'))();
    const csv = purchaseOrderToCsv(t, data);
    await exportCsv(csv, t('filename.purchase-order'));
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('button.new-purchase-order')}
          onClick={onCreate}
        />
        <ButtonWithIcon
          Icon={<ListIcon />}
          label={t('button.outstanding-lines')}
          onClick={() =>
            navigate(
              RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.PurchaseOrder)
                .addPart(AppRoute.PurchaseOrderOutstandingLines)
                .build()
            )
          }
        />
        <LoadingButton
          startIcon={<DownloadIcon />}
          variant="outlined"
          isLoading={isLoading}
          label={t('button.export')}
          onClick={handleCsvExportClick}
        />
        {modalController.isOn && (
          <SupplierSearchModal
            external
            open={modalController.isOn}
            onClose={modalController.toggleOff}
            onChange={handleSupplierSelected}
          />
        )}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
