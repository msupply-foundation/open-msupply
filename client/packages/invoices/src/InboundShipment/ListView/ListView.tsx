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
  CardList,
  InvoiceNodeType,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { AppBarButtons } from './AppBarButtons';
import { getStatusTranslator, isInboundListItemDisabled } from '../../utils';
import { getStatusSequence } from '../../statuses';
import { Toolbar } from './Toolbar';
import { InboundRowFragment, useInboundList, useInboundShipment } from '../api';
import { Footer } from './Footer';
import { LinkedCell } from './LinkedCell';
import { SupplierCell } from './SupplierCell';

const TABLE_ID = 'inbound-shipment-list-view';

export const InboundListView = () => {
  const t = useTranslation();
  const isExtraSmallScreen = useIsExtraSmallScreen();
  const internalModalController = useToggle();
  const externalModalController = useToggle();
  const linkRequestModalController = useToggle();

  const {
    update: { update },
  } = useInboundShipment();

  const navigate = useNavigate();
  const { invoiceStatusOptions } = usePreferences();
  const { userHasPermission } = useAuthContext();

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
      {
        key: 'purchaseOrderNumber',
        condition: 'equalTo',
        isNumber: true,
      },
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
  const statuses = getStatusSequence(InvoiceNodeType.InboundShipment).filter(
    status => invoiceStatusOptions?.includes(status)
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
        description: t('description.invoice-number'),
        columnType: ColumnType.Number,
        size: 90,
        enableColumnFilter: true,
        enableSorting: true,
      },
      {
        header: t('label.linked-po-requisition'),
        id: 'purchaseOrderNumber',
        size: 180,
        align: 'right',
        enableColumnFilter: true,
        Cell: ({ row }) => <LinkedCell row={row.original} />,
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
      tableId: TABLE_ID,
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
          onCreate={
            isExtraSmallScreen ? undefined : internalModalController.toggleOn
          }
        />
      ),
      isMobile: isExtraSmallScreen,
    }
  );

  return (
    <>
      {isExtraSmallScreen ? (
        // We don't want to show any app bar button on mobile list view
        <CardList table={table} />
      ) : (
        <>
          <AppBarButtons
            internalModalController={internalModalController}
            externalModalController={externalModalController}
            linkRequestModalController={linkRequestModalController}
          />
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
