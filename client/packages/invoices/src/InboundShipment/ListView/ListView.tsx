import React, { useMemo } from 'react';
import {
  InvoiceTypeInput,
  UserPermission,
  useAuthContext,
  useNavigate,
  useTranslation,
  NothingHere,
  useToggle,
  useUrlQueryParams,
  ColumnType,
  ColumnDef,
  usePaginatedMaterialTable,
  MaterialTable,
  usePreferences,
  useIsExtraSmallScreen,
  MobileCardList,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { AppBarButtons } from './AppBarButtons';
import {
  getStatusTranslator,
  inboundStatuses,
  isInboundListItemDisabled,
} from '../../utils';
import { Toolbar } from './Toolbar';
import { InboundRowFragment, useInboundList, useInboundShipment } from '../api';
import { Footer } from './Footer';
import { SupplierCell } from './SupplierCell';

export const InboundListView = () => {
  const t = useTranslation();
  const internalModalController = useToggle();
  const externalModalController = useToggle();
  const linkRequestModalController = useToggle();

  const {
    update: { update },
  } = useInboundShipment();

  const navigate = useNavigate();
  const { invoiceStatusOptions } = usePreferences();
  const { userHasPermission } = useAuthContext();

  const isExtraSmallScreen = useIsExtraSmallScreen();

  const {
    filter,
    queryParams: { first, offset, sortBy, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'invoiceNumber', dir: 'desc' },
    ...(isExtraSmallScreen && {
      initialFilter: [{ id: 'status', value: 'NEW,DELIVERED' }],
    }),
    filters: [
      { key: 'invoiceNumber', condition: 'equalTo', isNumber: true },
      { key: 'otherPartyName' },
      {
        key: 'createdDatetime',
        condition: 'between',
      },
      {
        key: 'deliveredDatetime',
        condition: 'between',
      },
      { key: 'status', condition: 'equalAny' },
      { key: 'theirReference' },
    ],
  });

  // Only include invoice types the user has permissions to view
  const invoiceTypes: InvoiceTypeInput[] = [];
  if (userHasPermission(UserPermission.InboundShipmentQuery))
    invoiceTypes.push(InvoiceTypeInput.InboundShipment);
  if (userHasPermission(UserPermission.InboundShipmentExternalQuery))
    invoiceTypes.push(InvoiceTypeInput.InboundShipmentExternal);

  const listParams = {
    sortBy,
    first,
    offset,
    filterBy,
    type: invoiceTypes,
  };

  const {
    query: { data, isLoading, isError },
  } = useInboundList(listParams);
  const statuses = inboundStatuses.filter(status =>
    invoiceStatusOptions?.includes(status)
  );

  const columns = useMemo(
    (): ColumnDef<InboundRowFragment>[] => [
      {
        header: t('label.supplier'),
        accessorKey: 'otherPartyName',
        size: 400,
        enableColumnFilter: true,
        Cell: ({ row }) => (
          <SupplierCell row={row.original} onColorChange={update} />
        ),
        enableSorting: true,
      },
      {
        header: t('label.status'),
        accessorFn: row => getStatusTranslator(t)(row.status),
        id: 'status',
        size: 140,
        filterVariant: 'select',
        filterSelectOptions: statuses.map(status => ({
          value: status,
          label: getStatusTranslator(t)(status),
        })),
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        header: t('label.number'),
        accessorKey: 'invoiceNumber',
        columnType: ColumnType.Number,
        size: 90,
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        header: t('label.purchase-order-number'),
        accessorKey: 'purchaseOrder.number',
        columnType: ColumnType.Number,
      },
      {
        header: t('label.created'),
        accessorKey: 'createdDatetime',
        columnType: ColumnType.Date,
        enableColumnFilter: true,
        enableSorting: true,
        size: 100,
      },
      {
        header: t('label.delivered'),
        accessorKey: 'deliveredDatetime',
        columnType: ColumnType.Date,
        defaultHideOnMobile: true,
        enableColumnFilter: true,
        enableSorting: true,
        size: 100,
      },
      {
        header: t('label.comment'),
        accessorKey: 'comment',
        columnType: ColumnType.Comment,
      },
      {
        header: t('label.reference'),
        accessorKey: 'theirReference',
        size: 225,
        defaultHideOnMobile: true,
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        header: t('label.total'),
        accessorFn: row => row.pricing.totalAfterTax,
        columnType: ColumnType.Currency,
        defaultHideOnMobile: true,
      },
    ],
    [t]
  );

  const { table, selectedRows } = usePaginatedMaterialTable<InboundRowFragment>(
    {
      tableId: 'inbound-shipment-list-view',
      isLoading,
      isError,
      onRowClick: row =>
        row.purchaseOrder
          ? navigate(
              RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.InboundShipmentExternal)
                .addPart(row.id)
                .build()
            )
          : navigate(row.id),
      columns,
      data: data?.nodes ?? [],
      totalCount: data?.totalCount ?? 0,
      initialSort: { key: 'invoiceNumber', dir: 'desc' },
      getIsRestrictedRow: row => isInboundListItemDisabled(row.original),
      noDataElement: (
        <NothingHere
          body={t('error.no-inbound-shipments')}
          onCreate={internalModalController.toggleOn}
        />
      ),
      isMobile: isExtraSmallScreen,
    }
  );

  return (
    <>
      <AppBarButtons
        internalModalController={internalModalController}
        externalModalController={externalModalController}
        linkRequestModalController={linkRequestModalController}
      />
      {isExtraSmallScreen ? (
        // We don't want to show any app bar button on mobile list view
        <MobileCardList table={table} />
      ) : (
        <>
          <Toolbar filter={filter} />
          <MaterialTable table={table} />
        </>
      )}
      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
    </>
  );
};
