import React, { useCallback, useEffect } from 'react';
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
  useToggle,
  useTranslation,
} from '@openmsupply-client/common';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';
import { AppRoute } from 'packages/config/src';
import { PurchaseOrderLineFragment } from '../api';
import { ContentArea } from './ContentArea';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { PurchaseOrderLineEditModal } from './LineEdit/PurchaseOrderLineEditModal';
import { PurchaseOrderLineImportModal } from './ImportLines/PurchaseOrderLineImportModal';

export const DetailViewInner = () => {
  const {
    query: { data, isLoading },
    lines: { sortedAndFilteredLines },
  } = usePurchaseOrder();

  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();

  const importModalController = useToggle();

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

  if (isLoading) return <DetailViewSkeleton />;

  const onAddItem = () => {
    onOpen();
  };

  const isDisabled = !data || data?.status !== PurchaseOrderNodeStatus.New;

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <>
          <AppBarButtons
            importModalController={importModalController}
            isDisabled={isDisabled}
            onAddItem={onAddItem}
          />

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
          <PurchaseOrderLineImportModal
            isOpen={importModalController.isOn}
            onClose={importModalController.toggleOff}
          />
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
