import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertModal,
  createQueryParamsStore,
  createTableStore,
  DetailTabs,
  DetailViewSkeleton,
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
import { ContentArea, Details, Documents } from './Tabs';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import { canAddNewLines, isPurchaseOrderDisabled } from '../../utils';
import { Footer } from './Footer';
import { SidePanel } from './SidePanel';
import { PurchaseOrderLineEditModal } from './LineEdit/PurchaseOrderLineEditModal';
import { ActivityLogList } from 'packages/system/src';
import { PurchaseOrderLineErrorProvider } from '../context';

export const DetailViewInner = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const [showStatusBar, setShowStatusBar] = useState(true);

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

  const openNext = useCallback(() => {
    const currentIndex = sortedAndFilteredLines.findIndex(
      line => line.id === lineId
    );
    const nextLine = sortedAndFilteredLines[currentIndex + 1];
    if (!nextLine) return;
    onOpen(nextLine.id);
  }, [onOpen, lineId, sortedAndFilteredLines]);

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.number.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.number]);

  if (isLoading) return <DetailViewSkeleton />;

  const disableNewLines = !data || !canAddNewLines(data);
  const isDisabled = !data || isPurchaseOrderDisabled(data);

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
    {
      Component: (
        <Documents
          purchaseOrderId={data?.id}
          documents={data?.documents?.nodes}
          setShowStatusBar={setShowStatusBar}
        />
      ),
      value: 'Documents',
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
          <AppBarButtons isDisabled={disableNewLines} onAddItem={onOpen} />
          <Toolbar isDisabled={isDisabled} />
          <DetailTabs tabs={tabs} />
          <Footer showStatusBar={showStatusBar} />
          <SidePanel />
          {isOpen && (
            <PurchaseOrderLineEditModal
              purchaseOrder={data}
              isOpen={isOpen}
              onClose={onClose}
              mode={mode}
              lineId={lineId}
              isDisabled={isDisabled}
              hasNext={
                sortedAndFilteredLines.findIndex(line => line.id === lineId) <
                sortedAndFilteredLines.length - 1
              }
              openNext={openNext}
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
    <PurchaseOrderLineErrorProvider>
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
    </PurchaseOrderLineErrorProvider>
  );
};
