import React, { useMemo } from 'react';
import {
  useNavigate,
  RequisitionNodeStatus,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  useToggle,
  ColumnDef,
  NameAndColorSetterCell,
  usePaginatedMaterialTable,
  MaterialTable,
  ColumnType,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import {
  getApprovalStatusKey,
  getRequisitionTranslator,
  isResponseDisabled,
} from '../../utils';
import { useResponse, ResponseRowFragment, ResponseFragment } from '../api';
import { Footer } from './Footer';

export const ListView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const requisitionModalController = useToggle();
  const createOrderModalController = useToggle();
  const { mutate: onUpdate } = useResponse.document.update();
  const {
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: {
      key: 'createdDatetime',
      dir: 'desc',
    },
    filters: [
      { key: 'comment' },
      { key: 'otherPartyName' },
      {
        key: 'status',
        condition: 'equalTo',
      },
      {
        key: 'aShipmentHasBeenCreated',
        condition: '=',
      },
      {
        key: 'isEmergency',
        condition: '=',
      },
    ],
  });
  const queryParams = { ...filter, sortBy, page, first, offset };
  const { data, isError, isFetching } = useResponse.document.list(queryParams);
  const { authoriseResponseRequisitions } = useResponse.utils.preferences();
  const program =
    data?.nodes.some(row => row.programName) ||
    data?.nodes.some(row => row.orderType) ||
    data?.nodes.some(row => row.period);

  const columns = useMemo(
    (): ColumnDef<ResponseRowFragment>[] => [
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
            getIsDisabled={isResponseDisabled}
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
        id: 'numberOfShipments',
        header: t('label.shipments'),
        description: t('description.number-of-shipments'),
        accessorFn: rowData => rowData?.shipments?.totalCount ?? 0,
        columnType: ColumnType.Number,
      },
      {
        accessorKey: 'comment',
        header: t('label.comment'),
        columnType: ColumnType.Comment,
      },
      {
        accessorKey: 'programName',
        header: t('label.program'),
        description: t('description.program'),
        enableSorting: true,
        includeColumn: !!program,
      },
      {
        accessorKey: 'orderType',
        header: t('label.order-type'),
        enableSorting: true,
        includeColumn: !!program,
      },
      {
        id: 'period',
        header: t('label.period'),
        accessorFn: rowData => rowData.period?.name ?? '',
        enableSorting: true,
        includeColumn: !!program,
      },
      {
        id: 'approvalStatus',
        header: t('label.auth-status'),
        size: 150,
        accessorFn: rowData => t(getApprovalStatusKey(rowData.approvalStatus)),
        includeColumn: authoriseResponseRequisitions,
      },
    ],
    []
  );

  const { table, selectedRows } = usePaginatedMaterialTable({
    tableId: 'internal-order-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isError,
    isLoading: isFetching,
    onRowClick: row => navigate(String(row.id)),
    getIsRestrictedRow: isResponseDisabled,
    noDataElement: (
      <NothingHere
        body={t('error.no-requisitions')}
        onCreate={requisitionModalController.toggleOn}
      />
    ),
  });

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons
        requisitionModalController={requisitionModalController}
        createOrderModalController={createOrderModalController}
      />
      <MaterialTable table={table} />
      <Footer
        selectedRows={selectedRows as ResponseFragment[]}
        resetRowSelection={table.resetRowSelection}
      />
    </>
  );
};
