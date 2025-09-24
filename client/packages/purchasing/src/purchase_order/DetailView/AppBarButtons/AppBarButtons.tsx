import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useDetailPanel,
  ReportContext,
  useUrlQueryParams,
  UrlQueryValue,
} from '@openmsupply-client/common';
import { ReportSelector } from '@openmsupply-client/system';
import { usePurchaseOrder } from '../../api/hooks/usePurchaseOrder';
import { AddButton } from './AddButton';
import { UploadDocumentButton } from './UploadDocumentButton';

interface AppBarButtonProps {
  isDisabled: boolean;
  onAddItem: () => void;
  disableNewLines: boolean;
  currentTab: UrlQueryValue;
}

export const AppBarButtonsComponent = ({
  onAddItem,
  isDisabled,
  disableNewLines,
  currentTab,
}: AppBarButtonProps) => {
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
        {currentTab == 'Documents' ? (
          <UploadDocumentButton
            purchaseOrder={data ?? undefined}
            disable={isDisabled}
          />
        ) : (
          <AddButton
            purchaseOrder={data ?? undefined}
            onAddItem={onAddItem}
            disable={disableNewLines}
            disableAddFromMasterListButton={isLoading}
          />
        )}
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
