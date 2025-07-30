import React, { FC, useState } from 'react';
import {
  ColumnDescription,
  DataTable,
  Grid,
  NothingHere,
  SearchBar,
  TooltipTextCell,
  useColumns,
  useTranslation,
  useUserPreferencePagination,
  useWindowDimensions,
} from '@openmsupply-client/common';
import { ImportRow } from './PurchaseOrderLineImportModal';

interface ImportReviewDataTableProps {
  importRows: ImportRow[];
  showWarnings: boolean;
}
export const ImportReviewDataTable: FC<ImportReviewDataTableProps> = ({
  importRows,
  showWarnings,
}) => {
  const t = useTranslation();
  const { height } = useWindowDimensions();

  const { pagination, updateUserPreferencePagination } =
    useUserPreferencePagination();

  const [searchString, setSearchString] = useState<string>(() => '');
  const columnDescriptions: ColumnDescription<ImportRow>[] = [];

  columnDescriptions.push(
    {
      key: 'id',
      width: 90,
      sortable: false,
      label: 'label.id',
    },
    {
      key: 'purchaseOrderId',
      sortable: false,
      label: 'label.purchase-order-id',
    },
    // item id
    {
      key: 'itemId',
      sortable: false,
      label: 'label.item-id',
    }
    // TODO add more input / show fields
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
      row.id.includes(searchString) ||
      (row.purchaseOrderId && row.purchaseOrderId.includes(searchString))
    );
  });

  const currentEquipmentPage = filteredEquipment.slice(
    pagination.offset,
    pagination.offset + pagination.first
  );

  return (
    <Grid flexDirection="column" display="flex" gap={0} height={height * 0.5}>
      <SearchBar
        placeholder={t('messages.search')}
        value={searchString}
        debounceTime={300}
        onChange={newValue => {
          setSearchString(newValue);
          updateUserPreferencePagination(0);
        }}
      />
      <DataTable
        pagination={{
          ...pagination,
          total: filteredEquipment.length,
        }}
        onChangePage={updateUserPreferencePagination}
        columns={columns}
        data={currentEquipmentPage}
        noDataElement={
          <NothingHere body={t('error.purchase-order-not-found')} />
        }
        id={''}
      />
    </Grid>
  );
};
