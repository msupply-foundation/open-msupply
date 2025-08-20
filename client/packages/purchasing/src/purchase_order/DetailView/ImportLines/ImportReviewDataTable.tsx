import React, { useState } from 'react';
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
export const ImportReviewDataTable = ({
  importRows,
  showWarnings,
}: ImportReviewDataTableProps) => {
  const t = useTranslation();
  const { height } = useWindowDimensions();

  const { pagination, updateUserPreferencePagination } =
    useUserPreferencePagination();

  const [searchString, setSearchString] = useState<string>('');
  const columnDescriptions: ColumnDescription<ImportRow>[] = [];

  columnDescriptions.push(
    {
      key: 'itemCode',
      width: 90,
      sortable: false,
      label: 'label.code',
    },
    {
      width: 90,

      key: 'requestedPackSize',
      sortable: false,
      label: 'label.pack-size',
    },
    {
      width: 90,
      key: 'requestedNumberOfUnits',
      sortable: false,
      label: 'label.requested',
    },
    {
      width: 90,
      key: 'pricePerUnitBeforeDiscount',
      sortable: false,
      label: 'label.price-per-unit-before-discount',
    },
    {
      width: 90,
      key: 'pricePerUnitAfterDiscount',
      sortable: false,
      label: 'label.price-per-unit-after-discount',
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
      width: 200,
      Cell: TooltipTextCell,
    });
  }
  // TODO implement searching for item & mapping item name to table for more easeful UI (Currently users need to know the item code)
  const columns = useColumns<ImportRow>(columnDescriptions, {}, []);

  const filteredEquipment = importRows.filter(row => {
    if (!searchString) {
      return true;
    }
    return (
      row.id.includes(searchString) ||
      (row.itemCode && row.itemCode.includes(searchString))
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
