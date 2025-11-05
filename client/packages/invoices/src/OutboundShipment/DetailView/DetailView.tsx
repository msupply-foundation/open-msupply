import React, { useCallback, useEffect } from 'react';
import {
  useEditModal,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  DetailTabs,
  ModalMode,
  useNotification,
  useBreadcrumbs,
  useNonPaginatedMaterialTable,
  InvoiceLineNodeType,
  MaterialTable,
  NothingHere,
  Groupable,
} from '@openmsupply-client/common';
import {
  toItemRow,
  ActivityLogList,
  ItemRowFragment,
} from '@openmsupply-client/system';
import { StockOutItem } from '../../types';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { useOutbound } from '../api';
import { AppRoute } from '@openmsupply-client/config';
import { StockOutLineFragment } from '../../StockOut';
import { CustomerReturnEditModal } from '../../Returns';
import { canReturnOutboundLines } from '../../utils';
import { OutboundLineEdit, OutboundOpenedWith } from './OutboundLineEdit';
import { useOutboundLines } from '../api';
import { useOutboundColumns } from './columns';

export const DetailView = () => {
  const t = useTranslation();
  const { info } = useNotification();
  const isDisabled = useOutbound.utils.isDisabled();

  const { entity, mode, onOpen, onClose, isOpen, setMode } =
    useEditModal<OutboundOpenedWith>();
  const {
    onOpen: onOpenReturns,
    onClose: onCloseReturns,
    isOpen: returnsIsOpen,
    entity: outboundShipmentLineIds,
    mode: returnModalMode,
    setMode: setReturnMode,
  } = useEditModal<string[]>();

  const { data, isLoading } = useOutbound.document.get();
  const { data: rows, isError } = useOutboundLines();

  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const onRowClick = useCallback(
    (line: StockOutLineFragment | StockOutItem) => {
      onOpen({ itemId: toItemRow(line).id });
    },
    [onOpen]
  );
  const onAddItem = (openWith?: OutboundOpenedWith) => {
    onOpen(openWith);
    setMode(ModalMode.Create);
  };

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

  const columns = useOutboundColumns();

  const isPlaceholderRow = (row: StockOutLineFragment) =>
    row.type === InvoiceLineNodeType.UnallocatedStock ||
    row.numberOfPacks === 0;

  const { table, selectedRows } = useNonPaginatedMaterialTable<
    Groupable<StockOutLineFragment>
  >({
    tableId: 'outbound-shipment-detail-view',
    columns,
    data: rows,
    isError,
    grouping: { enabled: true },
    isLoading: false,
    initialSort: { key: 'itemName', dir: 'asc' },
    onRowClick: !isDisabled ? onRowClick : undefined,
    getIsPlaceholderRow: row =>
      !!(
        isPlaceholderRow(row) ||
        // Also mark parent rows as placeholder if any subRows are placeholders
        row.subRows?.some(isPlaceholderRow)
      ),
    noDataElement: (
      <NothingHere
        body={t('error.no-outbound-items')}
        onCreate={isDisabled ? undefined : () => onAddItem()}
        buttonText={t('button.add-item')}
      />
    ),
  });

  // Table manages the sorting state
  // This needs to be passed to the edit modal, so based on latest sort order
  // it can determine which item to load when user clicks `next`
  const getSortedItems = useCallback(
    () =>
      table.getSortedRowModel().rows.reduce<ItemRowFragment[]>((acc, row) => {
        const item = row.original.item;
        if (!acc.find(i => i.id === item.id)) acc.push(item);
        return acc;
      }, []),
    []
  );

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: <MaterialTable table={table} />,
      value: 'Details',
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: 'Log',
    },
  ];

  return data ? (
    <>
      <AppBarButtons onAddItem={onAddItem} />
      {isOpen && (
        <OutboundLineEdit
          openedWith={entity}
          mode={mode}
          isOpen={isOpen}
          onClose={onClose}
          status={data.status}
          invoiceId={data.id}
          getSortedItems={getSortedItems}
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
          onCreate={table.resetRowSelection}
          isNewReturn
        />
      )}

      <Toolbar />
      <DetailTabs tabs={tabs} />
      <Footer
        onReturnLines={onReturn}
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
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
  );
};
