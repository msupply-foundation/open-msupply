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
  useNavigate,
  useParams,
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

export const DetailViewInner = () => {
  const { purchaseOrderId = '' } = useParams();
  const {
    query: { data, isLoading },
  } = usePurchaseOrder(purchaseOrderId);

  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.number.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.number]);

  const onOpen = () => {
    // eslint-disable-next-line no-console
    console.log('TO-DO: Show Line Edit Modal');
  };

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
            lines={data.lines.nodes ?? []}
            isDisabled={isDisabled}
            onAddItem={onOpen}
            onRowClick={!isDisabled ? onRowClick : null}
          />

          <Footer />
          {/* <SidePanel /> */}

          {/* {isOpen && (
            <InboundLineEdit
              isDisabled={isDisabled}
              isOpen={isOpen}
              onClose={onClose}
              mode={mode}
              item={entity}
              currency={data.currency}
              isExternalSupplier={!data.otherParty.store}
              hasVvmStatusesEnabled={!!vvmStatuses && vvmStatuses.length > 0}
              hasItemVariantsEnabled={hasItemVariantsEnabled}
            />
          )} */}
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
