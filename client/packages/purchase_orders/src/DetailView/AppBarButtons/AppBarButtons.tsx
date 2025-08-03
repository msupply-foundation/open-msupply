import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useTranslation,
  useDetailPanel,
  ReportContext,
  useUrlQueryParams,
  ToggleState,
  UploadIcon,
  useCallbackWithPermission,
  UserPermission,
} from '@openmsupply-client/common';
import { usePurchaseOrder } from '../../api/hooks/usePurchaseOrder';
import { ReportSelector } from '@openmsupply-client/system';
// import { AddFromMasterListButton } from './AddFromMasterListButton';

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
  const t = useTranslation();
  const { OpenButton } = useDetailPanel();

  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const {
    query: { data },
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
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={onAddItem}
        />
        <ReportSelector
          context={ReportContext.PurchaseOrder}
          dataId={data?.id ?? ''}
          sort={{ key: sortBy.key, desc: sortBy.isDesc }}
        />
        {/* <AddFromMasterListButton /> */}
        {/* <UseSuggestedQuantityButton /> */}
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
