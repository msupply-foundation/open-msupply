import React, { FC, useState } from 'react';
import {
  DataTable,
  Grid,
  NothingHere,
  Pagination,
  SearchBar,
  TooltipTextCell,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';
import { AssetFragment } from '../api/operations.generated';
import { Status } from '../Components';

interface ImportReviewDataTableProps {
  importRows: any[];
}

const StatusCell = ({ rowData }: { rowData: AssetFragment }) => {
  return <Status status={rowData.statusLog?.status} />;
};

export const ImportReviewDataTable: FC<ImportReviewDataTableProps> = ({
  importRows,
}) => {
  const t = useTranslation(['system']);
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    first: 100,
    offset: 0,
  });
  const [searchString, setSearchString] = useState<string>(() => '');
  const columns = useColumns<AssetFragment>(
    [
      {
        key: 'assetNumber',
        width: 150,
        sortable: false,
        label: 'label.asset-number',
      },
      {
        key: 'type',
        label: 'label.type',
        sortable: false,
        width: 200,
        accessor: ({ rowData }) => rowData.catalogueItem?.assetType?.name,
        Cell: TooltipTextCell,
      },
      {
        key: 'manufacturer',
        Cell: TooltipTextCell,
        maxWidth: 200,
        label: 'label.manufacturer',
        sortable: false,
        accessor: ({ rowData }) => rowData.catalogueItem?.manufacturer,
      },
      {
        key: 'model',
        label: 'label.model',
        sortable: false,
        accessor: ({ rowData }) => rowData.catalogueItem?.model,
      },
      {
        key: 'status',
        label: 'label.functional-status',
        Cell: StatusCell,
        sortable: false,
      },
      {
        key: 'serialNumber',
        label: 'label.serial',
      },
      {
        key: 'notes',
        label: 'label.notes',
        sortable: false,
      },
      'selection',
    ],
    {},
    []
  );

  const filteredManufacturers = importRows.filter(row => {
    if (!searchString) {
      return true;
    }
    return (
      row.name.includes(searchString) ||
      row.code.includes(searchString) ||
      row.errorMessage.includes(searchString) ||
      row.id === searchString
    );
  });
  const currentManufacturerPage = filteredManufacturers.slice(
    pagination.offset,
    pagination.offset + pagination.first
  );

  return (
    <Grid flexDirection="column" display="flex" gap={0}>
      <SearchBar
        placeholder={t('messages.search')}
        value={searchString}
        debounceTime={300}
        onChange={newValue => {
          setSearchString(newValue);
          setPagination({
            first: pagination.first,
            offset: 0,
            page: 0,
          });
        }}
      />
      <DataTable
        pagination={{
          ...pagination,
          total: filteredManufacturers.length,
        }}
        onChangePage={page => {
          setPagination({
            first: pagination.first,
            offset: pagination.first * page,
            page: page,
          });
        }}
        columns={columns}
        data={currentManufacturerPage}
        noDataElement={<NothingHere body={t('error.asset-not-found')} />}
        id={''}
      />
    </Grid>
  );
};
