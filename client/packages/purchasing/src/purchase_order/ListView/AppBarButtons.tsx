import React from 'react';
import {
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  useNotification,
  useNavigate,
  ToggleState,
  ListIcon,
  RouteBuilder,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
import {
  NameRowFragment,
  SupplierSearchModal,
} from '@openmsupply-client/system';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';
import { PurchaseOrderRowFragment } from '../api';
import { purchaseOrderToCsv } from '../../utils';
import { AppRoute } from '@openmsupply-client/config';

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

  const getCsvData = () => (data?.length ? purchaseOrderToCsv(t, data) : null);

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
        <ExportSelector
          getCsvData={getCsvData}
          filename={t('filename.purchase-order')}
          isLoading={isLoading}
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
