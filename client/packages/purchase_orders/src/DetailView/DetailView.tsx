import React, { useEffect } from 'react';
import {
  AlertModal,
  createQueryParamsStore,
  createTableStore,
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
import { InboundItem } from 'packages/invoices/src/types';
import { ContentArea } from './ContentArea';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { PurchaseOrderLineEditModal } from './LineEdit/PurchaseOrderLineEditModal';

export const DetailViewInner = () => {
  const {
    query: { data, isLoading },
    lines: { sortedAndFilteredLines },
  } = usePurchaseOrder();

  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();

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

  const onRowClick = (line: PurchaseOrderLineFragment) => {
    // eslint-disable-next-line no-console
    console.log('TO-DO: Show Line Edit Modal for line:', line);
  };

  if (isLoading) return <DetailViewSkeleton />;

  const isDisabled = !data || data?.status !== PurchaseOrderNodeStatus.New;

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <>
          <AppBarButtons isDisabled={isDisabled} onAddItem={onOpen} />

          <Toolbar isDisabled={isDisabled} />

          <ContentArea
            lines={sortedAndFilteredLines}
            isDisabled={isDisabled}
            onAddItem={onOpen}
            onRowClick={!isDisabled ? onRowClick : null}
          />

          <Footer />

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
      queryParamsStore={createQueryParamsStore<
        PurchaseOrderLineFragment | InboundItem
      >({
        initialSortBy: {
          key: 'itemName',
        },
      })}
    >
      <DetailViewInner />
    </TableProvider>
  );
};
