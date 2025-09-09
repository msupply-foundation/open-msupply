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
  ColumnDef,
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
  const { rows } = useOutbound.line.rows(false);
  // const { rows } = useOutbound.line.rows(isGrouped);

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

  const mrtColumns = useMemo(() => {
    const cols: ColumnDef<StockOutLineFragment | StockOutItem>[] = [
      // TO-DO: Note popover column,
      {
        accessorKey: 'item.code',
        header: t('label.code'),
        size: 120,
      },
      {
        accessorKey: 'item.name',
        header: t('label.name'),
        // size: 140,
      },
      {
        accessorKey: 'batch',
        header: t('label.batch'),
        size: 130,
      },
      {
        accessorKey: 'expiryDate',
        header: t('label.expiry-date'),
        size: 160,
      },
    ];

    // todo - on refresh this is ending up at the end of the table - need to fix!
    if (manageVvmStatusForStock)
      cols.push({
        // todo - anything that could return undefined should use accessorFn, so no warnings in console
        accessorKey: 'vvmStatus.description',
        header: t('label.vvm-status'),
      });

    cols.push(
      {
        accessorKey: 'location.code',
        header: t('label.location'),
      },
      {
        accessorKey: 'item.unitName',
        header: t('label.unit-name'),
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
      }
    );

    // if (manageVaccinesInDoses) {
    //   columns.push(getDosesPerUnitColumn(t));
    // }

    cols.push(
      {
        accessorKey: 'numberOfPacks',
        header: t('label.num-packs'),
      },
      {
        accessorKey: 'unitQuantity',
        header: t('label.unit-quantity'),

        description: t('description.unit-quantity'),
      }
    );

    // TODO: remaining columns

    return cols;
  }, [manageVvmStatusForStock]);

  const { table, selectedRows, resetRowSelection } =
    useNonPaginatedMaterialTable<StockOutLineFragment | StockOutItem>({
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
