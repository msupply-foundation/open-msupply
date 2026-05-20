import React, { useCallback, useEffect } from 'react';
import {
  AlertModal,
  DetailTabs,
  DetailViewSkeleton,
  RouteBuilder,
  useBreadcrumbs,
  useEditModal,
  useNavigate,
  useTranslation,
  useUrlQuery,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList } from '@openmsupply-client/system';
import { canAddNewLines, isPurchaseOrderDisabled } from '../../utils';
import { usePurchaseOrder } from '../api';
import { Details, Documents, GeneralTab, InboundShipments } from './Tabs';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import { SidePanel } from './SidePanel';
import { PurchaseOrderLineErrorProvider } from '../context';
import { PurchaseOrderDetailTabs } from './types';

export const PurchaseOrderDetailView = () => (
  <PurchaseOrderLineErrorProvider>
    <DetailViewInner />
  </PurchaseOrderLineErrorProvider>
);

const DetailViewInner = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { urlQuery, updateQuery } = useUrlQuery();

  const {
    query: { data, isLoading },
    draft,
    handleChange,
    invalidateQueries,
  } = usePurchaseOrder();

  const lineEditModal = useEditModal<string | null>();

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.number.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.number]);

  const disableNewLines = !data || !canAddNewLines(data);
  const isDisabled = !data || isPurchaseOrderDisabled(data);

  const onAddItem = useCallback(() => {
    // The line-edit modal lives inside the General tab. If the user is on
    // another tab, switch first so the modal mounts.
    const currentTab = urlQuery['tab'] ?? PurchaseOrderDetailTabs.General;
    if (currentTab !== PurchaseOrderDetailTabs.General) {
      updateQuery({ tab: PurchaseOrderDetailTabs.General });
    }
    lineEditModal.onOpen();
  }, [lineEditModal, urlQuery, updateQuery]);

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: <GeneralTab lineEdit={lineEditModal} />,
      value: PurchaseOrderDetailTabs.General,
    },
    {
      Component: <InboundShipments />,
      value: PurchaseOrderDetailTabs.InboundShipment,
    },
    {
      Component: (
        <Details draft={draft} onChange={handleChange} disabled={isDisabled} />
      ),
      value: PurchaseOrderDetailTabs.Details,
    },
    {
      Component: (
        <Documents
          data={data}
          disable={isDisabled}
          invalidateQueries={invalidateQueries}
        />
      ),
      value: PurchaseOrderDetailTabs.Documents,
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: PurchaseOrderDetailTabs.Log,
    },
  ];

  return data ? (
    <>
      <AppBarButtons
        isDisabled={isDisabled}
        disableNewLines={disableNewLines}
        onAddItem={onAddItem}
      />
      <Toolbar isDisabled={isDisabled} />
      <DetailTabs tabs={tabs} />
      <SidePanel />
    </>
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.PurchaseOrder)
            .build()
        )
      }
      title={t('error.purchase-order-not-found')}
      message={t('messages.click-to-return-to-purchase-orders')}
    />
  );
};
