import React, { useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  useEditModal,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  createQueryParamsStore,
  DetailTabs,
  useNotification,
  ModalMode,
  useTableStore,
  useBreadcrumbs,
  useSimplifiedTabletUI,
  useUrlQuery,
  useToggle,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  ActivityLogList,
  DocumentsTable,
  toItemWithPackSize,
  UploadDocumentModal,
  useIsItemVariantsEnabled,
  useVvmStatusesEnabled,
} from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { InboundLineEdit } from './modals/InboundLineEdit';
import { InboundItem, ScannedBarcode } from '../../types';
import { useInbound, InboundLineFragment } from '../api';
import { SupplierReturnEditModal } from '../../Returns';
import { canReturnInboundLines } from '../../utils';
import { InboundShipmentLineErrorProvider } from '../context/inboundShipmentLineError';
import { InboundShipmentDetailTabs } from './types';

type InboundLineItem = InboundLineFragment['item'];

// This is what the Edit Modal receives when a scanned barcode is used (as
// opposed to the usual full "InboundLineItem" object)
export type ScannedItem = {
  id: string;
  batch?: string;
  expiryDate?: string;
};

// This is the data that is passed to the "CreateDraftInboundLine" function when
// creating the new line
export type ScannedBatchData = { batch?: string; expiryDate?: string };

const DetailViewInner = () => {
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const { info } = useNotification();
  const { clearSelected } = useTableStore();

  const uploadDocumentController = useToggle();
  const { onOpen, onClose, mode, entity, isOpen } = useEditModal<
    InboundLineItem | ScannedItem
  >();
  const {
    onOpen: onOpenReturns,
    onClose: onCloseReturns,
    isOpen: returnsIsOpen,
    entity: stockLineIds,
    mode: returnModalMode,
    setMode,
  } = useEditModal<string[]>();

  const { data, isLoading, invalidateQuery } = useInbound.document.get();
  const { data: vvmStatuses } = useVvmStatusesEnabled();
  const isDisabled = useInbound.utils.isDisabled();
  const hasItemVariantsEnabled = useIsItemVariantsEnabled();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const onRowClick = React.useCallback(
    (line: InboundItem | InboundLineFragment) => {
      onOpen(toItemWithPackSize(line));
    },
    [onOpen]
  );

  const onAddItem: (scannedBarcode?: ScannedBarcode) => void = openWith => {
    // Unless we're acquiring a scanned barcode, just open the modal as normal,
    // with no pre-filled line data
    if (
      (openWith as ScannedBarcode & { __typename: string })?.__typename !==
        'BarcodeNode' ||
      !openWith?.itemId
    ) {
      onOpen();
      setMode(ModalMode.Create);
      return;
    }

    const { itemId, expiryDate, batch } = openWith;
    onOpen({
      id: itemId ?? '',
      batch,
      expiryDate,
    });
    // Mode set to "Update" when using scanned item, which prevents the "Item"
    // selector from being changed
    setMode(ModalMode.Update);
  };

  const onReturn = async (selectedLines: InboundLineFragment[]) => {
    if (!data || !canReturnInboundLines(data)) {
      const cantReturnSnack = info(
        t('messages.cant-return-shipment-replenishment')
      );
      cantReturnSnack();
      return;
    }
    if (!selectedLines.length) {
      const selectLinesSnack = info(t('messages.select-rows-to-return'));
      selectLinesSnack();
      return;
    }
    if (selectedLines.some(line => !line.stockLine)) {
      const selectLinesSnack = info(
        t('messages.cant-return-lines-with-no-received-stock')
      );
      selectLinesSnack();
      return;
    }

    const selectedStockLineIds = selectedLines.map(
      line => line.stockLine?.id ?? ''
    );

    onOpenReturns(selectedStockLineIds);
    setMode(ModalMode.Create);
  };

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.invoiceNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.invoiceNumber]);

  const { urlQuery } = useUrlQuery();
  const tab = urlQuery['tab'] as string | undefined;

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: (
        <ContentArea
          onRowClick={!isDisabled ? onRowClick : null}
          onAddItem={() => onOpen()}
        />
      ),
      value: InboundShipmentDetailTabs.Details,
    },
    {
      Component: (
        <DocumentsTable
          documents={data?.documents.nodes ?? []}
          recordId={data?.id ?? ''}
          tableName="invoice"
          onUploadDocument={uploadDocumentController.toggleOn}
          invalidateQueries={invalidateQuery}
        />
      ),
      value: InboundShipmentDetailTabs.Documents,
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: InboundShipmentDetailTabs.Log,
    },
  ];

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <>
          <InboundShipmentLineErrorProvider>
            <AppBarButtons
              onAddItem={onAddItem}
              simplifiedTabletView={simplifiedTabletView}
              onUploadDocument={uploadDocumentController.toggleOn}
            />

            <Toolbar simplifiedTabletView={simplifiedTabletView} />

            <DetailTabs tabs={tabs} />

            {tab === InboundShipmentDetailTabs.Details && (
              <Footer onReturnLines={onReturn} />
            )}
            <SidePanel />

            {isOpen && (
              <InboundLineEdit
                isDisabled={isDisabled}
                isOpen={isOpen}
                onClose={onClose}
                mode={mode}
                // "as" here is okay, as the child components will take care of
                // populating the item will the full details if they are missing
                // (which is the case when item info is scanned from barcode)
                item={entity as InboundLineItem}
                currency={data.currency}
                isExternalSupplier={!data.otherParty.store}
                hasVvmStatusesEnabled={!!vvmStatuses && vvmStatuses.length > 0}
                hasItemVariantsEnabled={hasItemVariantsEnabled}
                scannedBatchData={{
                  batch: (entity as ScannedBatchData)?.batch,
                  expiryDate: (entity as ScannedBatchData)?.expiryDate,
                }}
              />
            )}
            {returnsIsOpen && (
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
            )}

            <UploadDocumentModal
              isOn={uploadDocumentController.isOn}
              toggleOff={uploadDocumentController.toggleOff}
              recordId={data.id}
              tableName="invoice"
              invalidateQueries={invalidateQuery}
            />
          </InboundShipmentLineErrorProvider>
        </>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.InboundShipment)
                .build()
            )
          }
          title={t('error.shipment-not-found')}
          message={t('messages.click-to-return-to-shipments')}
        />
      )}
    </React.Suspense>
  );
};

export const DetailView = () => {
  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore<
        InboundLineFragment | InboundItem
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
