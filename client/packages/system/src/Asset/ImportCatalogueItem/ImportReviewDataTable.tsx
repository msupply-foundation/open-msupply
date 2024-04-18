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
import { ImportRow } from './CatalogueItemImportModal';

interface ImportReviewDataTableProps {
  importRows: ImportRow[];
}
export const ImportReviewDataTable: FC<ImportReviewDataTableProps> = ({
  importRows,
}) => {
  const t = useTranslation('coldchain');
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    first: 20,
    offset: 0,
  });
  const [searchString, setSearchString] = useState<string>(() => '');
  const columns = useColumns<ImportRow>(
    [
      {
        key: 'subCatalogue',
        width: 70,
        sortable: false,
        label: 'label.sub-catalogue',
      },
      {
        key: 'code',
        width: 50,
        sortable: false,
        label: 'label.code',
      },
      {
        key: 'type',
        width: 100,
        sortable: false,
        label: 'label.type',
        Cell: TooltipTextCell,
      },
      {
        key: 'manufacturer',
        width: 100,
        sortable: false,
        label: 'label.manufacturer',
        Cell: TooltipTextCell,
      },
      {
        key: 'model',
        width: 100,
        sortable: false,
        label: 'label.model',
        Cell: TooltipTextCell,
      },
      {
        key: 'class',
        width: 100,
        sortable: false,
        label: 'label.class',
        Cell: TooltipTextCell,
      },
      {
        key: 'category',
        width: 100,
        sortable: false,
        label: 'label.category',
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

  const filteredAssetItem = importRows.filter(row => {
    if (!searchString) {
      return true;
    }
    return (
      row.code.includes(searchString) ||
      row.errorMessage?.includes(searchString) ||
      row.id === searchString
    );
  });
  const currentAssetItemPage = filteredAssetItem.slice(
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
          total: filteredAssetItem.length,
        }}
        onChangePage={page => {
          setPagination({
            first: pagination.first,
            offset: pagination.first * page,
            page: page,
          });
        }}
        columns={columns}
        data={currentAssetItemPage}
        noDataElement={<NothingHere body={t('error.asset-not-found')} />}
        id={'import-review'}
      />
    </Grid>
  );
};
