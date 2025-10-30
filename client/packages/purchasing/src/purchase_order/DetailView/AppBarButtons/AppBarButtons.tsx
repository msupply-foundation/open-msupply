import React from 'react';
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
  disableNewLines: boolean;
}

export const AppBarButtonsComponent = ({
  onAddItem,
  disableNewLines,
}: AppBarButtonProps) => {
  const { OpenButton } = useDetailPanel();

  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const {
    query: { data, isFetching },
  } = usePurchaseOrder();

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton
          purchaseOrder={data ?? undefined}
          onAddItem={onAddItem}
          disable={disableNewLines}
          disableAddFromMasterListButton={isFetching}
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
