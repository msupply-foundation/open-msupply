import React, { FC, useEffect } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  getNameAndColorColumn,
  TableProvider,
  createTableStore,
  useTranslation,
  InvoiceNodeStatus,
  useTableStore,
  NothingHere,
  useToggle,
  useUrlQueryParams,
  ColumnFormat,
} from '@openmsupply-client/common';
import { getStatusTranslator, isPrescriptionDisabled } from '../../utils';
import { usePrescriptionList, usePrescriptionSingle } from '../api';
import { PrescriptionRowFragment } from '../api/operations.generated';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';

const useDisablePrescriptionRows = (rows?: PrescriptionRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows
      ?.filter(isPrescriptionDisabled)
      .map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
  }, [rows]);
};

const PrescriptionListViewComponent: FC = () => {
  const {
    update: { update },
  } = usePrescriptionSingle();
  const t = useTranslation();
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    filters: [{ key: 'otherPartyName' }],
    initialSort: { key: 'prescriptionDatetime', dir: 'desc' },
  });
  const navigate = useNavigate();
  const modalController = useToggle();

  const listParams = {
    sortBy,
    first,
    offset,
    filterBy: filter.filterBy,
  };

  const {
    query: { data, isError, isLoading },
  } = usePrescriptionList(listParams);
  const pagination = { page, first, offset };
  useDisablePrescriptionRows(data?.nodes);

  const columns = useColumns<PrescriptionRowFragment>(
    [
      [getNameAndColorColumn(), { setter: update }],
      [
        'status',
        {
          formatter: status =>
            getStatusTranslator(t)(status as InvoiceNodeStatus),
        },
      ],
      [
        'invoiceNumber',
        { description: 'description.invoice-number', maxWidth: 110 },
      ],
      {
        key: 'prescriptionDatetime',
        label: 'label.prescription-date',
        format: ColumnFormat.Date,
        accessor: ({ rowData }) =>
          rowData.prescriptionDate
            ? rowData.prescriptionDate
            : rowData.createdDatetime,
        sortable: true,
      },
      ['comment'],
      'selection',
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} listParams={listParams} />
      <AppBarButtons
        modalController={modalController}
        listParams={listParams}
      />
      <DataTable
        id="prescription-list"
        enableColumnSelection
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading}
        noDataElement={
          <NothingHere
            body={t('error.no-prescriptions')}
            onCreate={modalController.toggleOn}
          />
        }
        onRowClick={row => {
          navigate(String(row.invoiceNumber));
        }}
      />
    </>
  );
};

export const PrescriptionListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <PrescriptionListViewComponent />
  </TableProvider>
);
