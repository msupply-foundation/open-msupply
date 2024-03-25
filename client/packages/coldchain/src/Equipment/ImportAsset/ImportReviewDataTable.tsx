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
import { ImportRow } from './EquipmentImportModal';

interface ImportReviewDataTableProps {
  importRows: ImportRow[];
}

// const StatusCell = ({ rowData }: { rowData: AssetFragment }) => {
//   return <Status status={rowData.statusLog?.status} />;
// };

export const ImportReviewDataTable: FC<ImportReviewDataTableProps> = ({
  importRows,
}) => {
  const t = useTranslation('coldchain');
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    first: 10,
    offset: 0,
  });
  const [searchString, setSearchString] = useState<string>(() => '');
  const columns = useColumns<ImportRow>(
    [
      {
        key: 'assetNumber',
        width: 60,
        sortable: false,
        label: 'label.asset-number',
      },
      {
        key: 'catalogueItemCode',
        width: 60,
        sortable: false,
        label: 'label.catalogue-item-code',
      },
      {
        key: 'notes',
        width: 100,
        sortable: false,
        label: 'label.asset-notes',
        Cell: TooltipTextCell,
      },
      {
        key: 'errorMessage',
        label: 'label.error-message',
        width: 150,
        Cell: TooltipTextCell,
      },
    ],
    {},
    []
  );

  const filteredEquipment = importRows.filter(row => {
    if (!searchString) {
      return true;
    }
    return (
      row.assetNumber.includes(searchString) ||
      (row.catalogueItemCode && row.catalogueItemCode.includes(searchString)) ||
      row.errorMessage.includes(searchString) ||
      row.id === searchString
    );
  });
  const currentEquipmentPage = filteredEquipment.slice(
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
          total: filteredEquipment.length,
        }}
        onChangePage={page => {
          setPagination({
            first: pagination.first,
            offset: pagination.first * page,
            page: page,
          });
        }}
        columns={columns}
        data={currentEquipmentPage}
        noDataElement={<NothingHere body={t('error.asset-not-found')} />}
        id={''}
      />
    </Grid>
  );
};
