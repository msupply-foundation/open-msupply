import React, { FC, useState } from 'react';
import {
  ColumnDescription,
  ColumnFormat,
  DataTable,
  Grid,
  NothingHere,
  SearchBar,
  TooltipTextCell,
  useColumns,
  useIsCentralServerApi,
  usePaginationRow,
  useTranslation,
} from '@openmsupply-client/common';
import { ImportRow } from './EquipmentImportModal';

interface ImportReviewDataTableProps {
  importRows: ImportRow[];
  showWarnings: boolean;
  // onChangePage: (page: number) => void;
}
export const ImportReviewDataTable: FC<ImportReviewDataTableProps> = ({
  importRows,
  showWarnings,
  // onChangePage,
}) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();

  //original hook used. updates url
  //change this to new hook for pagination with rows selection
  // const {
  //   queryParams: { page, first, offset },
  //   updatePaginationQuery,
  // } = useUrlQueryParams();

  //setting the original state data
  // const pagination = {
  //   page: 0,
  //   first: 20,
  //   offset: 0,
  //   onChangePage,
  // };

  //state now handled in hook
  // const [pagination, setPagination] = useState<Pagination>({
  //   page: 0,
  //   first: 20,
  //   offset: 0,
  // });

  //new hook. didnt import from new file so added to usePagination file
  const {
    paginationRow: { page, first, offset },
    updatePaginationRows,
  } = usePaginationRow();

  const pagination = { page, first, offset };
  console.log('import', pagination);

  const [searchString, setSearchString] = useState<string>(() => '');
  const columnDescriptions: ColumnDescription<ImportRow>[] = [
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

  columnDescriptions.push(
    {
      key: 'serialNumber',
      width: 100,
      sortable: false,
      label: 'label.serial',
      Cell: TooltipTextCell,
    },
    {
      key: 'installationDate',
      width: 100,
      sortable: false,
      label: 'label.installation-date',
      format: ColumnFormat.Date,
    },
    {
      key: 'replacementDate',
      width: 100,
      sortable: false,
      label: 'label.replacement-date',
      format: ColumnFormat.Date,
    },
    {
      key: 'notes',
      width: 100,
      sortable: false,
      label: 'label.asset-notes',
      Cell: TooltipTextCell,
    }
  );

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

  const columns = useColumns<ImportRow>(columnDescriptions, {}, []);

  const filteredEquipment = importRows.filter(row => {
    if (!searchString) {
      return true;
    }
    return (
      row.assetNumber.includes(searchString) ||
      (row.catalogueItemCode && row.catalogueItemCode.includes(searchString)) ||
      row.errorMessage?.includes(searchString) ||
      row.id === searchString
    );
  });

  //having this active stops any row pagination
  const currentEquipmentPage = filteredEquipment.slice(
    pagination.offset,
    pagination.offset + pagination.first
  );
  // console.log('page', pagination.page);
  // console.log('total', filteredEquipment.length);

  return (
    <Grid flexDirection="column" display="flex" gap={0}>
      <SearchBar
        placeholder={t('messages.search')}
        value={searchString}
        debounceTime={300}
        onChange={newValue => {
          setSearchString(newValue);
          updatePaginationRows(0);
        }}
      />

      <DataTable
        manualPagination={{
          ...pagination,
          total: filteredEquipment.length,
        }}
        onChangePage={updatePaginationRows}
        columns={columns}
        data={currentEquipmentPage}
        noDataElement={<NothingHere body={t('error.asset-not-found')} />}
        id={''}
      />
    </Grid>
  );
};
