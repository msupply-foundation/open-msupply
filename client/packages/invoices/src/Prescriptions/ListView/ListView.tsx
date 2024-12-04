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
import { usePrescription } from '../api';
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
  const { mutate: onUpdate } = usePrescription.document.update();
  const t = useTranslation();
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams();
  const navigate = useNavigate();
  const modalController = useToggle();

  const { data, isError, isLoading } = usePrescription.document.list();
  const pagination = { page, first, offset };
  useDisablePrescriptionRows(data?.nodes);

  const columns = useColumns<PrescriptionRowFragment>(
    [
      [getNameAndColorColumn(), { setter: onUpdate }],
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
      <Toolbar filter={filter} />
      <AppBarButtons modalController={modalController} />

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
