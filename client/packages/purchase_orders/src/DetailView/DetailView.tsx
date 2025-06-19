import React from 'react';
import {
  AlertModal,
  createQueryParamsStore,
  createTableStore,
  DetailViewSkeleton,
  RouteBuilder,
  TableProvider,
  useBreadcrumbs,
  useNavigate,
  useNotification,
  useParams,
  usePreference,
  useSimplifiedTabletUI,
  useTableStore,
  useTranslation,
} from '@openmsupply-client/common';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';
import { AppRoute } from 'packages/config/src';
import { PurchaseOrderLineFragment } from '../api';
import { InboundItem } from 'packages/invoices/src/types';
import { ContentArea } from './ContentArea';

export const DetailViewInner = () => {
  const { purchaseOrderId = '' } = useParams();
  const {
    query: { data, isLoading },
  } = usePurchaseOrder(purchaseOrderId);

  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  // const isDisabled = useInbound.utils.isDisabled();
  // const { onOpen, onClose, mode, entity, isOpen } =
  //   useEditModal<InboundLineItem>();
  // const {
  //   onOpen: onOpenReturns,
  //   onClose: onCloseReturns,
  //   isOpen: returnsIsOpen,
  //   entity: stockLineIds,
  //   mode: returnModalMode,
  //   setMode: setReturnMode,
  // } = useEditModal<string[]>();
  const { info, error } = useNotification();
  const { clearSelected } = useTableStore();
  // const { data: preference } = usePreference(
  //   PreferenceKey.ManageVaccinesInDoses
  // );
  const simplifiedTabletView = useSimplifiedTabletUI();

  if (isLoading) return <DetailViewSkeleton />;

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <>
          {/* <InboundShipmentLineErrorProvider> */}
          {/* <AppBarButtons
            onAddItem={() => onOpen()}
            simplifiedTabletView={simplifiedTabletView}
          /> */}

          {/* <Toolbar simplifiedTabletView={simplifiedTabletView} /> */}

          <ContentArea
            lines={data.lines.nodes ?? []}
            // onRowClick={!isDisabled ? onRowClick : null}
            // onAddItem={() => onOpen()}
            // displayInDoses={preference?.manageVaccinesInDoses}
          />

          {/* <Footer onReturnLines={onReturn} /> */}
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
          {/* {returnsIsOpen && (
            <SupplierReturnEditModal
              isOpen={returnsIsOpen}
              onCreate={clearSelected}
              onClose={onCloseReturns}
              stockLineIds={stockLineIds || []}
              supplierId={data.otherParty.id}
              modalMode={returnModalMode}
              inboundShipmentId={data.id}
              isNewReturn
            />
          )} */}
          {/* </InboundShipmentLineErrorProvider> */}
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
