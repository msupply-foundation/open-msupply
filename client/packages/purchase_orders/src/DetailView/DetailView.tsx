import React, { useCallback, useEffect } from 'react';
import {
  AlertModal,
  createQueryParamsStore,
  createTableStore,
  DetailTabs,
  DetailViewSkeleton,
  PurchaseOrderNodeStatus,
  RouteBuilder,
  TableProvider,
  useBreadcrumbs,
  useEditModal,
  useNavigate,
  useTranslation,
} from '@openmsupply-client/common';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';
import { AppRoute } from 'packages/config/src';
import { PurchaseOrderLineFragment } from '../api';
import { ContentArea } from './ContentArea';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { SidePanel } from './SidePanel';
import { PurchaseOrderLineEditModal } from './LineEdit/PurchaseOrderLineEditModal';
import { ActivityLogList } from 'packages/system/src';

export const DetailViewInner = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const {
    query: { data, isLoading },
    lines: { sortedAndFilteredLines },
  } = usePurchaseOrder();

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.number.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.number]);

  const {
    onOpen,
    onClose,
    mode,
    entity: itemId,
    isOpen,
  } = useEditModal<string | null>();

  const onRowClick = useCallback(
    (line: PurchaseOrderLineFragment) => {
      onOpen(line.item.id);
    },
    [onOpen]
  );

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.number.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.number]);

  if (isLoading) return <DetailViewSkeleton />;

  const isDisabled = !data || data?.status !== PurchaseOrderNodeStatus.New;

  const tabs = [
    {
      Component: (
        <ContentArea
          lines={sortedAndFilteredLines}
          isDisabled={isDisabled}
          onAddItem={onOpen}
          onRowClick={!isDisabled ? onRowClick : null}
        />
      ),
      value: 'Details',
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: 'Log',
    },
  ];

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <>
          <AppBarButtons isDisabled={isDisabled} onAddItem={onOpen} />
          <Toolbar isDisabled={isDisabled} />
          <DetailTabs tabs={tabs} />
          <Footer />
          <SidePanel />
          {isOpen && (
            <PurchaseOrderLineEditModal
              isOpen={isOpen}
              onClose={onClose}
              mode={mode}
              itemId={itemId}
              purchaseOrder={data}
            />
          )}
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
      )}
    </React.Suspense>
  );
};

export const PurchaseOrderDetailView = () => {
  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore<PurchaseOrderLineFragment>({
        initialSortBy: {
          key: 'itemName',
        },
      })}
    >
      <DetailViewInner />
    </TableProvider>
  );
};
