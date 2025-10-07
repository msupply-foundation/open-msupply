import React, { useMemo } from 'react';
import {
  useTranslation,
  RequisitionNodeStatus,
  NothingHere,
  useToggle,
  useUrlQueryParams,
  useSimplifiedTabletUI,
  RouteBuilder,
  usePaginatedMaterialTable,
  MaterialTable,
  ColumnDef,
  NameAndColorSetterCell,
  ColumnType,
  TextWithTooltipCell,
  useNavigate,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import { RequestRowFragment, useRequest } from '../api';
import {
  getApprovalStatusKey,
  getRequisitionTranslator,
  isRequestDisabled,
} from '../../utils';
import { Footer } from './Footer';
import { AppRoute } from '@openmsupply-client/config';

export const ListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const modalController = useToggle();
  const { data: programSettings } = useRequest.utils.programSettings();

  const { mutate: onUpdate } = useRequest.document.update();
  const {
    filter,
    queryParams: { sortBy, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [
      { key: 'otherPartyName' },
      { key: 'status', condition: 'equalTo' },
    ],
  });
  const queryParams = { ...filter, sortBy, first, offset };

  const { data, isError, isFetching } = useRequest.document.list(queryParams);

  const { requireSupplierAuthorisation } = useRequest.utils.preferences();
  const simplifiedTabletView = useSimplifiedTabletUI();

  // Default to true to prevent columns from jumping on initial render
  const hasProgramSettings = !!programSettings && programSettings.length > 0;

  const columns = useMemo(
    (): ColumnDef<RequestRowFragment>[] => [
      {
        accessorKey: 'otherPartyName',
        header: t('label.name'),
        enableSorting: true,
        enableColumnFilter: true,
        size: 250,
        Cell: ({ row }) => (
          <NameAndColorSetterCell
            row={row.original}
            onColorChange={onUpdate}
            getIsDisabled={isRequestDisabled}
          />
        ),
      },
      {
        accessorKey: 'requisitionNumber',
        header: t('label.number'),
        enableSorting: true,
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'createdDatetime',
        header: t('label.created'),
        enableSorting: true,
        columnType: ColumnType.Date,
      },
      {
        accessorKey: 'lines.totalCount',
        header: t('label.count-rows'),
        includeColumn: simplifiedTabletView,
      },
      {
        id: 'programName',
        accessorFn: row => row.programName ?? '',
        header: t('label.program'),
        description: t('description.program'),
        enableSorting: true,
        Cell: TextWithTooltipCell,
        defaultHideOnMobile: true,
        includeColumn: hasProgramSettings,
      },
      {
        id: 'orderType',
        accessorFn: row => row.orderType ?? '',
        header: t('label.order-type'),
        enableSorting: true,
        defaultHideOnMobile: true,
        includeColumn: hasProgramSettings,
      },
      {
        id: 'period',
        accessorFn: row => row.period?.name ?? '',
        header: t('label.period'),
        enableSorting: true,
        defaultHideOnMobile: true,
        includeColumn: hasProgramSettings,
      },
      {
        id: 'status',
        header: t('label.status'),
        enableSorting: true,
        enableColumnFilter: true,
        accessorFn: row => getRequisitionTranslator(t)(row.status),
        filterVariant: 'select',
        filterSelectOptions: [
          { label: t('label.draft'), value: RequisitionNodeStatus.Draft },
          { label: t('label.sent'), value: RequisitionNodeStatus.Sent },
          {
            label: t('label.finalised'),
            value: RequisitionNodeStatus.Finalised,
          },
        ],
      },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
      },
      {
        id: 'approvalStatus',
        header: t('label.auth-status'),
        accessorFn: row =>
          t(getApprovalStatusKey(row.linkedRequisition?.approvalStatus)),
        includeColumn: requireSupplierAuthorisation,
      },
    ],
    [hasProgramSettings, requireSupplierAuthorisation, simplifiedTabletView]
  );

  const onRowClick = (row: RequestRowFragment, isCtrlClick: boolean) => {
    const route = RouteBuilder.create(AppRoute.Replenishment)
      .addPart(AppRoute.InternalOrder)
      .addPart(row.id)
      .build();

    // Open in new tab
    if (isCtrlClick) window.open(route, '_blank');
    else navigate(route);
  };

  const { table, selectedRows } = usePaginatedMaterialTable({
    tableId: 'internal-order-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isError,
    isLoading: isFetching,
    onRowClick,
    getIsRestrictedRow: isRequestDisabled,
    noDataElement: (
      <NothingHere
        body={t('error.no-internal-orders')}
        onCreate={modalController.toggleOn}
      />
    ),
  });

  return (
    <>
      <AppBarButtons modalController={modalController} />

      <MaterialTable table={table} />

      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
    </>
  );
};
