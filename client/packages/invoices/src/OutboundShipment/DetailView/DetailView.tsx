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
  getNoteColumn,
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
  const { rows } = useOutbound.line.rows(false);

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
    const cols: ColumnDef<StockOutLineFragment | StockOutItem>[] = [
      // // I actually think we should remove this for outbound shipments,
      // // there's no way I can see to set the note - might just be hanging around from copy-paste?
      // getNoteColumn(t, rowData =>
      //   'lines' in rowData
      //     ? rowData.lines.map(({ batch, note }) => ({
      //         header: batch ?? '',
      //         body: note ?? '',
      //       }))
      //     : [{ header: rowData.batch ?? '', body: rowData.note ?? '' }]
      // ),
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
        columnType: 'date',
        defaultHideOnMobile: true,
        enableColumnFilter: true,
      },
      {
        // todo - anything that could return undefined should use accessorFn, so no warnings in console
        id: 'vvmStatus',
        accessorKey: 'vvmStatus.description',
        header: t('label.vvm-status'),
        includeColumn: manageVvmStatusForStock,
        defaultHideOnMobile: true,
      },
      {
        id: 'locationCode',
        accessorKey: 'location.code',
        header: t('label.location'),
        filterVariant: 'text',
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
        columnType: 'number',
        defaultHideOnMobile: true,
        // TO-DO: Create "number range" filter
        // filterType: 'number',
      },

      // if (manageVaccinesInDoses) {
      //   columns.push(getDosesPerUnitColumn(t));
      // }

      {
        accessorKey: 'numberOfPacks',
        header: t('label.pack-quantity'),
        columnType: 'number',
      },
      {
        id: 'unitQuantity',
        header: t('label.unit-quantity'),
        description: t('description.unit-quantity'),
        columnType: 'number',
        defaultHideOnMobile: true,
        accessorFn: row => {
          if ('lines' in row) return ArrayUtils.getUnitQuantity(row.lines);

          return isDefaultPlaceholderRow(row)
            ? ''
            : row.packSize * row.numberOfPacks;
        },
      },

      // if (manageVaccinesInDoses) {
      //   columns.push(getDosesQuantityColumn(t));
      // }
      {
        id: 'unitSellPrice',
        header: t('label.unit-sell-price'),
        columnType: 'currency',
        defaultHideOnMobile: true,
        accessorFn: rowData => {
          if ('lines' in rowData) {
            const { lines } = rowData;
            return ArrayUtils.getAveragePrice(lines, 'sellPricePerPack');
          } else {
            if (isDefaultPlaceholderRow(rowData)) return undefined;
            return (rowData.sellPricePerPack ?? 0) / rowData.packSize;
          }
        },
      },
      {
        id: 'total',
        header: t('label.total'),
        columnType: 'currency',
        defaultHideOnMobile: true,
        accessorFn: rowData => {
          if ('lines' in rowData) {
            return Object.values(rowData.lines).reduce(
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
    useNonPaginatedMaterialTable<StockOutLineFragment | StockOutItem>({
      tableId: 'outbound-shipment-detail-view',
      columns: mrtColumns,
      data: rows ?? [],
      onRowClick: onRowClick ? row => onRowClick(row) : () => {},
      isLoading: false,
      getIsPlaceholderRow: row => {
        if ('type' in row) {
          return (
            row.type === InvoiceLineNodeType.UnallocatedStock ||
            row.numberOfPacks === 0
          );
        } else {
          return row.lines.some(
            line => line.type === InvoiceLineNodeType.UnallocatedStock
          );
        }
      },
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
