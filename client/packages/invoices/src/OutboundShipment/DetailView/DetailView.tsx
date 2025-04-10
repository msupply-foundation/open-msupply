import React, { useCallback, useEffect } from 'react';
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
  ModalMode,
  useNotification,
  useTableStore,
  useBreadcrumbs,
} from '@openmsupply-client/common';
import { toItemRow, ActivityLogList } from '@openmsupply-client/system';
import { ContentArea } from './ContentArea';
import { StockOutItem } from '../../types';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { useOutbound } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { Draft } from '../..';
import { StockOutLineFragment } from '../../StockOut';
import { OutboundLineEdit } from './OutboundLineEdit';
import { CustomerReturnEditModal } from '../../Returns';
import { canReturnOutboundLines } from '../../utils';

const DetailViewInner = () => {
  const { info } = useNotification();
  const isDisabled = useOutbound.utils.isDisabled();
  const { entity, mode, onOpen, onClose, isOpen, setMode } =
    useEditModal<Draft>();
  const {
    onOpen: onOpenReturns,
    onClose: onCloseReturns,
    isOpen: returnsIsOpen,
    entity: outboundShipmentLineIds,
    mode: returnModalMode,
    setMode: setReturnMode,
  } = useEditModal<string[]>();

  const { data, isLoading } = useOutbound.document.get();
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const onRowClick = useCallback(
    (item: StockOutLineFragment | StockOutItem) => {
      onOpen({ item: toItemRow(item) });
    },
    [toItemRow, onOpen]
  );
  const onAddItem = (draft?: Draft) => {
    onOpen(draft);
    setMode(ModalMode.Create);
  };
  const { clearSelected } = useTableStore();

  const onReturn = async (selectedLines: StockOutLineFragment[]) => {
    if (!data || !canReturnOutboundLines(data)) {
      const cantReturnSnack = info(t('messages.cant-return-shipment'));
      cantReturnSnack();
    } else if (!selectedLines.length) {
      const selectLinesSnack = info(t('messages.select-rows-to-return'));
      selectLinesSnack();
    } else {
      const selectedIds = selectedLines.map(line => line?.id ?? '');

      onOpenReturns(selectedIds);
      setReturnMode(ModalMode.Create);
    }
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
          onAddItem={onAddItem}
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
          <AppBarButtons onAddItem={onAddItem} />
          {isOpen && (
            <OutboundLineEdit
              draft={entity}
              mode={mode}
              isOpen={isOpen}
              onClose={onClose}
            />
          )}

          {returnsIsOpen && (
            <CustomerReturnEditModal
              isOpen={returnsIsOpen}
              onClose={onCloseReturns}
              outboundShipmentLineIds={outboundShipmentLineIds || []}
              customerId={data.otherPartyId}
              modalMode={returnModalMode}
              outboundShipmentId={data.id}
              onCreate={clearSelected}
              isNewReturn
            />
          )}

          <Toolbar />
          <DetailTabs tabs={tabs} />
          <Footer onReturnLines={onReturn} />
          <SidePanel />
        </>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Distribution)
                .addPart(AppRoute.OutboundShipment)
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
        StockOutLineFragment | StockOutItem
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
