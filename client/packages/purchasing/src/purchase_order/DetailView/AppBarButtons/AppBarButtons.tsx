import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useDetailPanel,
  ReportContext,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { ReportSelector } from '@openmsupply-client/system';
import { usePurchaseOrder } from '../../api/hooks/usePurchaseOrder';
import { AddButton } from './AddButton';

interface AppBarButtonProps {
  isDisabled: boolean;
  onAddItem: () => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
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

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton
          purchaseOrder={data ?? undefined}
          onAddItem={onAddItem}
          disable={isDisabled}
          disableAddFromMasterListButton={isLoading}
        />
        <ReportSelector
          context={ReportContext.PurchaseOrder}
          dataId={data?.id ?? ''}
          sort={{ key: sortBy.key, desc: sortBy.isDesc }}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
