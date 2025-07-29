import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  ReportContext,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { usePurchaseOrder } from '../../api/hooks/usePurchaseOrder';
import { AddButton } from './AddButton';
import { ReportSelector } from '@openmsupply-client/system';

interface AppBarButtonProps {
  isDisabled: boolean;
  onAddItem: () => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
  isDisabled,
}) => {
  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const {
    query: { data, isLoading },
  } = usePurchaseOrder();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
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
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
