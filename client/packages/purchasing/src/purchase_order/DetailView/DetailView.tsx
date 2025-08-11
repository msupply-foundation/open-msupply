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
import { AppRoute } from '@openmsupply-client/config';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';
import { PurchaseOrderLineFragment } from '../api';
import { ContentArea, Details } from './Tabs';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { SidePanel } from './SidePanel';
import { PurchaseOrderLineEditModal } from './LineEdit';

export const DetailViewInner = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const {
    query: { data, isLoading },
    lines: { sortedAndFilteredLines },
    draft,
    handleChange,
  } = usePurchaseOrder();

  const {
    onOpen,
    onClose,
    mode,
    entity: lineId,
    isOpen,
  } = useEditModal<string | null>();

  const onRowClick = useCallback(
    (line: PurchaseOrderLineFragment) => {
      onOpen(line.id);
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
      value: 'General',
    },
    {
      Component: <Details draft={draft} onChange={handleChange} />,
      value: 'Details',
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
              lineId={lineId}
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
