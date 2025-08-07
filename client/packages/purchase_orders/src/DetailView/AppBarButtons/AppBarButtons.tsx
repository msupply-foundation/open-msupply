import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useDetailPanel,
  ReportContext,
  useUrlQueryParams,
  ToggleState,
  UploadIcon,
  useCallbackWithPermission,
  UserPermission,
} from '@openmsupply-client/common';
import { usePurchaseOrder } from '../../api/hooks/usePurchaseOrder';
import { AddButton } from './AddButton';
import { ReportSelector } from '@openmsupply-client/system';

interface AppBarButtonProps {
  importModalController: ToggleState;
  isDisabled: boolean;
  onAddItem: () => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  importModalController,
  onAddItem,
  isDisabled,
}) => {
  const { OpenButton } = useDetailPanel();

  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const {
    query: { data, isLoading },
  } = usePurchaseOrder();

  const handleUploadPurchaseOrderLines = useCallbackWithPermission(
    UserPermission.PurchaseOrderMutate,
    importModalController.toggleOn,
    t('error.no-purchase-order-import-permission')
  );

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          Icon={<UploadIcon />}
          label={t('button.upload-purchase-order-lines')}
          onClick={handleUploadPurchaseOrderLines}
        />
        <ReportSelector
          context={ReportContext.PurchaseOrder}
          dataId={data?.id ?? ''}
          sort={{ key: sortBy.key, desc: sortBy.isDesc }}
        />
        <AddButton
          purchaseOrder={data ?? undefined}
          onAddItem={onAddItem}
          disable={isDisabled}
          disableAddFromMasterListButton={isLoading}
          disableAddFromInternalOrderButton={isLoading}
        />
        {/* <AddFromMasterListButton /> */}
        {/* <UseSuggestedQuantityButton /> */}
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
