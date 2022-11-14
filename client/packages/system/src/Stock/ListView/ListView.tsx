import React, { FC, useState } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  DateUtils,
  useDialog,
  DialogButton,
} from '@openmsupply-client/common';
import { DetailModal, Toolbar } from '../Components';
import { StockLineRowFragment, useStock } from '../api';

const StockListComponent: FC = () => {
  const {
    filter,
    updatePaginationQuery,
    updateSortQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'expiryDate', dir: 'asc' },
    filterKey: 'itemCodeOrName',
  });
  const pagination = { page, first, offset };
  const t = useTranslation('inventory');
  const [selectedId, setSelectedId] = useState<string>('');

  const { data, isLoading, isError } = useStock.document.list();
  const { Modal, showDialog, hideDialog } = useDialog();
  const columns = useColumns<StockLineRowFragment>(
    [
      [
        'itemCode',
        { accessor: ({ rowData }) => rowData.item.code, sortable: false },
      ],
      [
        'itemName',
        { accessor: ({ rowData }) => rowData.item.name, sortable: false },
      ],
      ['batch', { sortable: false }],
      [
        'expiryDate',
        {
          accessor: ({ rowData }) =>
            DateUtils.getDateOrNull(rowData.expiryDate),
        },
      ],
      ['locationName', { sortable: false }],
      [
        'itemUnit',
        { accessor: ({ rowData }) => rowData.item.unitName, sortable: false },
      ],
      ['packSize', { sortable: false }],
      [
        'numberOfPacks',
        {
          accessor: ({ rowData }) => rowData.totalNumberOfPacks,
        },
      ],
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
  );

  return (
    <>
      <Modal
        slideAnimation={false}
        title="Stock line details"
        okButton={
          <DialogButton
            variant="ok"
            disabled={true}
            onClick={async () => {
              hideDialog();
            }}
          />
        }
        cancelButton={<DialogButton variant="cancel" onClick={hideDialog} />}
      >
        <DetailModal id={selectedId} />
      </Modal>
      <Toolbar filter={filter} />
      <DataTable
        id="stock-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        columns={columns}
        data={data?.nodes ?? []}
        onChangePage={updatePaginationQuery}
        noDataElement={<NothingHere body={t('error.no-stock')} />}
        isError={isError}
        isLoading={isLoading}
        onRowClick={row => {
          setSelectedId(row.id);
          showDialog();
        }}
      />
    </>
  );
};

export const StockListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <StockListComponent />
  </TableProvider>
);
