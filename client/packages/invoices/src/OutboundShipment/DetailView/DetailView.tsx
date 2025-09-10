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
  PaperHoverPopover,
  MessageSquareIcon,
  PaperPopoverSection,
  ArrayUtils,
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
      // toDO: reusable columns
      {
        id: 'note',
        // header: t('label.code'),
        header: '',
        size: 60,
        Cell: ({ row }) => {
          const rowData = row.original;
          let content = null;
          if ('lines' in rowData) {
            const { lines } = rowData;
            const noteSections = lines
              .map(({ batch, note }) => ({
                header: batch ?? '',
                body: note ?? '',
              }))
              .filter(({ body }) => !!body);
            content = noteSections.length ? noteSections : null;
          } else {
            content =
              rowData.batch && rowData.note
                ? [{ header: rowData.batch, body: rowData.note }]
                : null;
          }

          return content ? (
            <PaperHoverPopover
              width={400}
              Content={
                <PaperPopoverSection label={t('label.notes')}>
                  {content.map(({ header, body }) => (
                    // <NoteSection key={body} {...{ header, body }} />
                    <>
                      <b>{header}</b>
                      <span>{body}</span>
                    </>
                  ))}
                </PaperPopoverSection>
              }
            >
              <MessageSquareIcon sx={{ fontSize: 16 }} color="primary" />
            </PaperHoverPopover>
          ) : null;
        },
      },
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 125,
        filterVariant: 'text',
      },
      {
        accessorKey: 'itemName',
        header: t('label.name'),
        filterVariant: 'text',
        size: 400,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 100,
        filterVariant: 'text',
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        filterVariant: 'date-range',
        size: 110,
        defaultHideOnMobile: true,
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
        size: 90,
        defaultHideOnMobile: true,
      },
      {
        id: 'itemUnit',
        accessorKey: 'item.unitName',
        header: t('label.unit-name'),
        filterVariant: 'select',
        size: 125,
        defaultHideOnMobile: true,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        size: 125,
        align: 'right',
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
        align: 'right',
        size: 100,
      },
      {
        accessorKey: 'unitQuantity',
        header: t('label.unit-quantity'),
        align: 'right',
        size: 100,
        description: t('description.unit-quantity'),
        defaultHideOnMobile: true,
      },

      // if (manageVaccinesInDoses) {
      //   columns.push(getDosesQuantityColumn(t));
      // }
      {
        id: 'unitSellPrice',
        header: t('label.unit-sell-price'),
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

    // TODO: remaining columns

    return cols;
  }, [manageVvmStatusForStock]);

  const { table, selectedRows, resetRowSelection } =
    useNonPaginatedMaterialTable<StockOutLineFragment | StockOutItem>({
      tableId: 'outbound-shipment-detail-view',
      columns: mrtColumns,
      data: rows ?? [],
      initialState: {
        columnPinning: { left: ['item.code'] },
      },
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
