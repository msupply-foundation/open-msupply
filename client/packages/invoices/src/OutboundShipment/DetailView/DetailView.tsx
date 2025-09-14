import React, { useCallback, useEffect, useMemo } from 'react';
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
  useNonPaginatedMaterialTable,
  usePreferences,
  InvoiceLineNodeType,
  useIsGrouped,
  ColumnDef,
  ArrayUtils,
  Groupable,
  ColumnType,
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
import { StockOutLineFragment } from '../../StockOut';
import { CustomerReturnEditModal } from '../../Returns';
import { canReturnOutboundLines } from '../../utils';
import { OutboundLineEdit, OutboundOpenedWith } from './OutboundLineEdit';
import { useOutboundLines } from '../api/hooks/line/useOutboundLines';

const DetailViewInner = () => {
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
  const { manageVvmStatusForStock } = usePreferences();

  const { data, isLoading } = useOutbound.document.get();
  const { isGrouped } = useIsGrouped('outboundShipment');
  const { data: rows } = useOutboundLines();

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

  const isDefaultPlaceholderRow = (row: StockOutLineFragment) =>
    row.type === InvoiceLineNodeType.UnallocatedStock && !row.numberOfPacks;

  const mrtColumns = useMemo(() => {
    const cols: ColumnDef<Groupable<StockOutLineFragment>>[] = [
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 120,
        pin: 'left',
        enableColumnFilter: true,
      },
      {
        accessorKey: 'itemName',
        header: t('label.name'),
        size: 400,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        columnType: ColumnType.Date,
        defaultHideOnMobile: true,
        enableColumnFilter: true,
      },
      {
        id: 'vvmStatus',
        accessorFn: row => row.vvmStatus?.description ?? '',
        header: t('label.vvm-status'),
        includeColumn: manageVvmStatusForStock,
        defaultHideOnMobile: true,
      },
      {
        id: 'locationCode',
        accessorFn: row => row.location?.code ?? '',
        header: t('label.location'),
        enableColumnFilter: true,
        defaultHideOnMobile: true,
      },
      {
        id: 'itemUnit',
        accessorKey: 'item.unitName',
        header: t('label.unit-name'),
        filterVariant: 'select',
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
      },
      {
        id: 'itemDoses',
        header: t('label.doses-per-unit'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        accessorFn: row => (row.item.isVaccine ? row.item.doses : undefined),
      },
      {
        accessorKey: 'numberOfPacks',
        header: t('label.pack-quantity'),
        columnType: ColumnType.Number,
        accessorFn: row => {
          if ('subRows' in row)
            return ArrayUtils.getSum(row.subRows ?? [], 'numberOfPacks');

          return row.numberOfPacks;
        },
      },
      {
        id: 'unitQuantity',
        header: t('label.unit-quantity'),
        description: t('description.unit-quantity'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        accessorFn: row => {
          if ('subRows' in row)
            return ArrayUtils.getUnitQuantity(row.subRows ?? []);

          return row.packSize * row.numberOfPacks;
        },
      },
      {
        id: 'doseQuantity',
        header: t('label.doses'),
        columnType: ColumnType.Number,
        defaultHideOnMobile: true,
        accessorFn: row => {
          if (!row.item.isVaccine) return null;
          if ('subRows' in row)
            return (
              ArrayUtils.getUnitQuantity(row.subRows ?? []) *
              (row.item.doses ?? 1)
            );

          return row.packSize * row.numberOfPacks * (row.item.doses ?? 1);
        },
      },
      {
        id: 'unitSellPrice',
        header: t('label.unit-sell-price'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
        accessorFn: rowData => {
          if ('subRows' in rowData) {
            return ArrayUtils.getAveragePrice(
              rowData.subRows ?? [],
              'sellPricePerPack'
            );
          } else {
            if (isDefaultPlaceholderRow(rowData)) return undefined;
            return (rowData.sellPricePerPack ?? 0) / rowData.packSize;
          }
        },
      },
      {
        id: 'total',
        header: t('label.total'),
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
        accessorFn: rowData => {
          if ('subRows' in rowData) {
            return Object.values(rowData.subRows ?? []).reduce(
              (sum, batch) =>
                sum + batch.sellPricePerPack * batch.numberOfPacks,
              0
            );
          } else {
            if (isDefaultPlaceholderRow(rowData)) return '';

            const x = rowData.sellPricePerPack * rowData.numberOfPacks;
            return x;
          }
        },
      },
    ];

    return cols;
  }, [manageVvmStatusForStock]);

  const { table, selectedRows, resetRowSelection } =
    useNonPaginatedMaterialTable<StockOutLineFragment>({
      tableId: 'outbound-shipment-detail-view',
      columns: mrtColumns,
      data: rows ?? [],
      onRowClick: onRowClick ? row => onRowClick(row) : () => {},
      isLoading: false,
      getIsPlaceholderRow: row =>
        row.type === InvoiceLineNodeType.UnallocatedStock ||
        row.numberOfPacks === 0,
      groupByField: isGrouped ? 'itemName' : undefined,
    });

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: (
        <ContentArea
          onRowClick={!isDisabled ? onRowClick : null}
          onAddItem={onAddItem}
          table={table}
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
              openedWith={entity}
              mode={mode}
              isOpen={isOpen}
              onClose={onClose}
              status={data.status}
              invoiceId={data.id}
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
          <Footer
            onReturnLines={onReturn}
            selectedRows={selectedRows as StockOutLineFragment[]}
            resetRowSelection={resetRowSelection}
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
