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
  usePreference,
  PreferenceKey,
  useSimplifiedTabletUI,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  ActivityLogList,
  toItemWithPackSize,
  useIsItemVariantsEnabled,
  useVvmStatusesEnabled,
} from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { InboundLineEdit } from './modals/InboundLineEdit';
import { InboundItem } from '../../types';
import { useInbound, InboundLineFragment } from '../api';
import { SupplierReturnEditModal } from '../../Returns';
import { canReturnInboundLines } from '../../utils';
import { InboundShipmentLineErrorProvider } from '../context/inboundShipmentLineError';

type InboundLineItem = InboundLineFragment['item'];

const DetailViewInner = () => {
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const { data, isLoading } = useInbound.document.get();
  const isDisabled = useInbound.utils.isDisabled();
  const { onOpen, onClose, mode, entity, isOpen } =
    useEditModal<InboundLineItem>();
  const {
    onOpen: onOpenReturns,
    onClose: onCloseReturns,
    isOpen: returnsIsOpen,
    entity: stockLineIds,
    mode: returnModalMode,
    setMode: setReturnMode,
  } = useEditModal<string[]>();
  const { info, error } = useNotification();
  const { clearSelected } = useTableStore();
  const { data: preference } = usePreference(
    PreferenceKey.ManageVaccinesInDoses
  );
  const { data: vvmStatuses } = useVvmStatusesEnabled();
  const hasItemVariantsEnabled = useIsItemVariantsEnabled();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const onRowClick = React.useCallback(
    (line: InboundItem | InboundLineFragment) => {
      onOpen(toItemWithPackSize(line));
    },
    [onOpen]
  );

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
      const errMsg = 'No stock line associated with the selected line(s).';
      const selectLinesSnack = error(`${t('error.something-wrong')} ${errMsg}`);
      selectLinesSnack();
      return;
    }

    const selectedStockLineIds = selectedLines.map(
      line => line.stockLine?.id ?? ''
    );

    onOpenReturns(selectedStockLineIds);
    setReturnMode(ModalMode.Create);
  };

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.invoiceNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.invoiceNumber]);

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: (
        <ContentArea
          onRowClick={!isDisabled ? onRowClick : null}
          onAddItem={() => onOpen()}
          displayInDoses={preference?.manageVaccinesInDoses}
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
          <InboundShipmentLineErrorProvider>
            <AppBarButtons
              onAddItem={() => onOpen()}
              simplifiedTabletView={simplifiedTabletView}
            />

            <Toolbar simplifiedTabletView={simplifiedTabletView} />

            <DetailTabs tabs={tabs} />

            <Footer onReturnLines={onReturn} />
            <SidePanel />

            {isOpen && (
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
