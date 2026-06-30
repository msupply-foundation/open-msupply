import React, { useCallback, useEffect, useMemo } from 'react';
import {
  useEditModal,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  DetailTabs,
  ModalMode,
  useBreadcrumbs,
  useSimplifiedTabletUI,
  useUrlQuery,
  useToggle,
  InvoiceLineStatusType,
  useAppTheme,
  useIsExtraSmallScreen,
  InboundNodeType,
  Box,
  AppFooterStatusPortal,
  InvoiceNodeType,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  ActivityLogList,
  DocumentsTable,
  UploadDocumentModal,
} from '@openmsupply-client/system';

import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { StatusFooter } from './Footer';
import { ScannedBarcode } from '../../types';
import { InboundLineFragment, useInboundShipment } from '../api';
import { getInboundStockLines } from '../../utils';
import { InboundShipmentLineErrorProvider } from '../context/inboundShipmentLineError';
import {
  InboundShipmentDetailTabs,
  ScannedItem,
} from './types';
import { FinancialTab } from './Tabs/Financial';
import { CurrencyTab } from './Tabs/Currency';
import { DeliveryTab } from './Tabs/DeliveryStatus';
import { DetailsTab } from './Tabs/Details';
import { ScanInputModal } from './ScanInputModal';
import { MobileToolbar } from './MobileToolbar';
import { getInboundColorAndIcon } from '../ListView/SupplierCell';
import { InvoiceCustomFieldsTab } from '../../common';

type InboundLineItem = InboundLineFragment['item'];

// Re-exported for callers that imported these from DetailView pre-refactor.
export type { ScannedItem, ScannedBatchData } from './types';

const ShipmentIcon = ({ inboundType }: { inboundType?: InboundNodeType }) => {
  if (!inboundType) return null;

  const { icon: KindIcon, color: iconColor } =
    getInboundColorAndIcon(inboundType);
  return <KindIcon sx={{ fontSize: 16, color: iconColor }} />;
};

const DetailViewInner = () => {
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const { urlQuery, updateQuery } = useUrlQuery();
  const {
    toggleOn: toggleUploadModal,
    isOn: isUploadModalOpen,
    toggleOff: toggleCloseUploadModal,
  } = useToggle();

  const lineEditModal = useEditModal<InboundLineItem | ScannedItem>();

  const {
    query: { data, loading },
    isExternal,
    isDisabled,
    invalidateQuery,
    update: { update },
  } = useInboundShipment();

  // ScanInputModal needs the same line list that the table renders.
  const lines = useMemo(
    () => (data ? getInboundStockLines(data.lines.nodes) : []),
    [data]
  );

  const simplifiedTabletView = useSimplifiedTabletUI();
  const isExtraSmallScreen = useIsExtraSmallScreen();

  const onAddItem = useCallback(
    (openWith?: ScannedBarcode) => {
      // The line-edit modal lives inside the Details tab. When the user is on
      // another tab, switch first so the modal mounts.
      if (
        urlQuery['tab'] &&
        urlQuery['tab'] !== InboundShipmentDetailTabs.Details
      ) {
        updateQuery({ tab: InboundShipmentDetailTabs.Details });
      }

      // Unless we're acquiring a scanned barcode, just open the modal as normal,
      // with no pre-filled line data
      if (
        (openWith as ScannedBarcode & { __typename: string })?.__typename !==
          'BarcodeNode' ||
        !openWith?.itemId
      ) {
        lineEditModal.onOpen();
        lineEditModal.setMode(ModalMode.Create);
        return;
      }

      // Mode set to "Update" when using scanned item, which prevents the "Item"
      // selector from being changed
      const { itemId, expiryDate, batch } = openWith;
      lineEditModal.onOpen({
        id: itemId ?? '',
        batch,
        expiryDate,
      });
      lineEditModal.setMode(ModalMode.Update);
    },
    [lineEditModal, urlQuery, updateQuery]
  );

  const openUploadModal = useCallback(() => {
    toggleUploadModal();
    if (urlQuery['tab'] !== InboundShipmentDetailTabs.Documents)
      updateQuery({ tab: InboundShipmentDetailTabs.Documents });
  }, [toggleUploadModal, urlQuery, updateQuery]);

  useEffect(() => {
    setCustomBreadcrumbs({
      1: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShipmentIcon inboundType={data?.inboundType} />
          {data?.invoiceNumber ?? ''}
        </Box>
      ),
    });
  }, [setCustomBreadcrumbs, data?.invoiceNumber, data?.inboundType]);

  if (loading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: <DetailsTab lineEdit={lineEditModal} />,
      value: InboundShipmentDetailTabs.Details,
    },
    ...(isExternal
      ? [
          ...(!isExtraSmallScreen
            ? [
                {
                  Component: <FinancialTab />,
                  value: InboundShipmentDetailTabs.Financial,
                },
                {
                  Component: <CurrencyTab />,
                  value: InboundShipmentDetailTabs.Currency,
                },
              ]
            : []),
          {
            Component: <DeliveryTab />,
            value: InboundShipmentDetailTabs.Delivery,
          },
        ]
      : []),
    {
      Component: (
        <DocumentsTable
          documents={data?.documents.nodes ?? []}
          recordId={data?.id ?? ''}
          tableName="invoice"
          openUploadModal={toggleUploadModal}
          invalidateQueries={invalidateQuery}
        />
      ),
      value: InboundShipmentDetailTabs.Documents,
    },
    {
      Component: (
        <InvoiceCustomFieldsTab
          invoiceType={InvoiceNodeType.InboundShipment}
          customFields={data?.customFields}
          onSave={patch => update({ customFields: patch })}
          disabled={isDisabled}
        />
      ),
      value: InboundShipmentDetailTabs.CustomFields,
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
          <AppBarButtons
            onAddItem={onAddItem}
            simplifiedTabletView={simplifiedTabletView}
            openUploadModal={openUploadModal}
          />

          {isExtraSmallScreen ? <MobileToolbar /> : <Toolbar />}

          <DetailTabs tabs={tabs} />

          {/* Fallback status footer for tabs that don't own the lines table.
            The Details tab's `Footer` mounts an `AppFooterPortal` only when
            rows are selected; otherwise this portal shows the status crumbs. */}
          <AppFooterStatusPortal Content={<StatusFooter />} />

          <SidePanel />

          <ScanInputModal
            lines={lines}
            invoiceId={data?.id ?? ''}
            shouldOpen={!lineEditModal.isOpen}
          />

          <UploadDocumentModal
            isOn={isUploadModalOpen}
            toggleOff={toggleCloseUploadModal}
            recordId={data.id}
            tableName="invoice"
            invalidateQueries={invalidateQuery}
          />
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

export const useInvoiceLineStatusMap = () => {
  const theme = useAppTheme();
  const t = useTranslation();
  return useMemo(
    () => ({
      [InvoiceLineStatusType.Passed]: {
        label: t('label.approved'),
        colour: theme.palette.invoiceLineStatus.passed,
      },
      [InvoiceLineStatusType.Pending]: {
        label: t('label.pending'),
        colour: theme.palette.invoiceLineStatus.pending,
      },
      [InvoiceLineStatusType.Rejected]: {
        label: t('label.rejected'),
        colour: theme.palette.invoiceLineStatus.rejected,
      },
    }),
    [theme, t]
  );
};

export const DetailView = () => {
  return (
    <InboundShipmentLineErrorProvider>
      <DetailViewInner />
    </InboundShipmentLineErrorProvider>
  );
};
