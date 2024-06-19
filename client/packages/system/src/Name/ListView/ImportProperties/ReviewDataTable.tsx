import React, { FC, useState } from 'react';
import {
  ColumnDescription,
  DataTable,
  Grid,
  NothingHere,
  Pagination,
  SearchBar,
  TooltipTextCell,
  useColumns,
  useIsCentralServerApi,
  useTranslation,
} from '@openmsupply-client/common';

interface ReviewDataTableProps {
  rows: any[];
  showWarnings: boolean;
}
export const ReviewDataTable: FC<ReviewDataTableProps> = ({
  rows,
  showWarnings,
}) => {
  const t = useTranslation('coldchain');
  const isCentralServer = useIsCentralServerApi();
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    first: 20,
    offset: 0,
  });
  const [searchString, setSearchString] = useState<string>(() => '');
  const columnDescriptions: ColumnDescription<any>[] = [
    {
      key: 'assetNumber',
      width: 70,
      sortable: false,
      label: 'label.asset-number',
    },
    {
      key: 'catalogueItemCode',
      width: 50,
      sortable: false,
      label: 'label.catalogue-item-code',
    },
  ];
  if (isCentralServer) {
    columnDescriptions.push({
      key: 'store',
      width: 50,
      sortable: false,
      label: 'label.store',
      accessor: ({ rowData }) => rowData.store?.code,
    });
  }
  columnDescriptions.push({
    key: 'serialNumber',
    width: 100,
    sortable: false,
    label: 'label.serial',
    Cell: TooltipTextCell,
  });
  columnDescriptions.push({
    key: 'installationDate',
    width: 100,
    sortable: false,
    label: 'label.installation-date',
    Cell: TooltipTextCell,
  });
  columnDescriptions.push({
    key: 'notes',
    width: 100,
    sortable: false,
    label: 'label.asset-notes',
    Cell: TooltipTextCell,
  });
  if (showWarnings) {
    columnDescriptions.push({
      key: 'warningMessage',
      label: 'label.warning-message',
      width: 150,
      Cell: TooltipTextCell,
    });
  } else {
    columnDescriptions.push({
      key: 'errorMessage',
      label: 'label.error-message',
      width: 150,
      Cell: TooltipTextCell,
    });
  }

  const columns = useColumns<any>(columnDescriptions, {}, []);

  const filteredEquipment = rows.filter(row => {
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
