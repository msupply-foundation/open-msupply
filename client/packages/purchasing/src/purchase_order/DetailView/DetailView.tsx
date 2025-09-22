import React, { useCallback, useEffect } from 'react';
import {
  AlertModal,
  createQueryParamsStore,
  createTableStore,
  DetailTabs,
  DetailViewSkeleton,
  NothingHere,
  RouteBuilder,
  TableProvider,
  useBreadcrumbs,
  useEditModal,
  useNavigate,
  useTranslation,
  useUrlQuery,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList, DocumentsTable } from '@openmsupply-client/system';

import { canAddNewLines, isPurchaseOrderDisabled } from '../../utils';
import { PurchaseOrderLineFragment, usePurchaseOrder } from '../api';
import { PurchaseOrderLineErrorProvider } from '../context';
import { ContentArea, Details, GoodsReceived } from './Tabs';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { SidePanel } from './SidePanel';
import { PurchaseOrderLineEditModal } from './LineEdit';

export const DetailViewInner = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { urlQuery } = useUrlQuery();
  const currentTab = urlQuery['tab'];

  const {
    query: { data, isLoading },
    lines: { sortedAndFilteredLines },
    draft,
    handleChange,
    invalidateQueries,
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
      value: t('label.general'),
    },
    {
      Component: <GoodsReceived />,
      value: 'Goods Received',
    },
    {
      Component: <Details draft={draft} onChange={handleChange} />,
      value: t('label.details'),
    },
    {
      Component: (
        <DocumentsTable
          recordId={data?.id ?? ''}
          documents={data?.documents?.nodes ?? []}
          tableName="purchase_order"
          noDataElement={
            <NothingHere body={t('error.no-purchase-order-documents')} />
          }
          invalidateQueries={invalidateQueries}
        />
      ),
      value: t('label.documents'),
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: t('label.log'),
    },
  ];

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <>
          <AppBarButtons
            isDisabled={isDisabled}
            disableNewLines={disableNewLines}
            onAddItem={onOpen}
          />
          <Toolbar isDisabled={isDisabled} />
          <DetailTabs tabs={tabs} />
          <Footer
            showStatusBar={currentTab !== 'Documents'}
            status={data.status}
          />
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
