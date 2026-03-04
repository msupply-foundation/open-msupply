import React, { useMemo } from 'react';
import {
  useNavigate,
  useTranslation,
  NothingHere,
  useToggle,
  useUrlQueryParams,
  ColumnType,
  ColumnDef,
  usePaginatedMaterialTable,
  MaterialTable,
  NameAndColorSetterCell,
  usePreferences,
  useIsExtraSmallScreen,
  MobileCardList,
  DetailTabs,
  ToggleState,
  useAuthContext,
  UserPermission,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import {
  getStatusTranslator,
  inboundStatuses,
  isInboundDisabled,
  isInboundListItemDisabled,
} from '../../utils';
import { Toolbar } from './Toolbar';
import { InboundRowFragment, useInboundList, useInboundShipment } from '../api';
import { Footer } from './Footer';

export const InboundListView = () => {
  const t = useTranslation();
  const internalModalController = useToggle();
  const externalModalController = useToggle();
  const linkRequestModalController = useToggle();
  const { userHasPermission } = useAuthContext();

  const hasInternalPermission =
    userHasPermission(UserPermission.InboundShipmentQuery) ||
    userHasPermission(UserPermission.InboundShipmentMutate) ||
    userHasPermission(UserPermission.InboundShipmentVerify);

  const hasExternalPermission =
    userHasPermission(UserPermission.InboundShipmentExternalQuery) ||
    userHasPermission(UserPermission.InboundShipmentExternalMutate) ||
    userHasPermission(UserPermission.InboundShipmentExternalAuthorise);

  const tabs = [
    ...(hasInternalPermission
      ? [
          {
            Component: (
              <InboundShipments
                internalModalController={internalModalController}
              />
            ),
            value: t('label.internal'),
          },
        ]
      : []),
    ...(hasExternalPermission
      ? [
          {
            Component: (
              <InboundShipments
                internalModalController={internalModalController}
                external
              />
            ),
            value: t('label.external'),
          },
        ]
      : []),
  ];

  return (
    <>
      <AppBarButtons
        internalModalController={internalModalController}
        externalModalController={externalModalController}
        linkRequestModalController={linkRequestModalController}
      />
      <DetailTabs tabs={tabs} overwriteQuery={false} restoreTabQuery={false} />
    </>
  );
};

const InboundShipments: React.FC<{
  internalModalController: ToggleState;
  external?: boolean;
}> = ({ internalModalController, external = false }) => {
  const {
    update: { update },
  } = useInboundShipment();

  const t = useTranslation();
  const navigate = useNavigate();
  const { invoiceStatusOptions } = usePreferences();

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

  const listParams = {
    sortBy,
    first,
    offset,
    filterBy: {
      ...filterBy,
      purchaseOrderId: external
        ? { notEqualTo: '' } // Removes results where purchaseOrderId is null
        : { equalAnyOrNull: '' }, // Only gives results where purchaseOrderId is null
    },
  };

  const {
    query: { data, isFetching },
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
          <NameAndColorSetterCell
            onColorChange={update}
            getIsDisabled={isInboundDisabled}
            row={row.original}
          />
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
        includeColumn: external,
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
      isLoading: isFetching,
      onRowClick: row => navigate(row.id),
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
