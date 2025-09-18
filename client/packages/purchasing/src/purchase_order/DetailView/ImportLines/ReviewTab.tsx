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
  ImportPanel,
} from '@openmsupply-client/common';
import { ImportRow } from './utils';

interface ReviewTabProps {
  uploadedRows: ImportRow[];
  tab: string;
  showWarnings: boolean;
}

export const ReviewTab = ({
  showWarnings,
  tab,
  uploadedRows,
}: ReviewTabProps) => {
  const t = useTranslation();
  const { height } = useWindowDimensions();
  const [searchString, setSearchString] = useState<string>('');
  const { pagination, updateUserPreferencePagination } =
    useUserPreferencePagination();

  const columnDescriptions: ColumnDescription<ImportRow>[] = [
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
      key: 'unit',
      sortable: false,
      label: 'label.unit',
    },
    {
      width: 90,
      key: 'supplierItemCode',
      sortable: false,
      label: 'label.supplier-item-code',
    },
    {
      width: 90,
      key: 'pricePerUnitBeforeDiscount',
      sortable: false,
      label: 'label.price-per-unit-before-discount',
    },
    {
      width: 90,
      key: 'discountPercentage',
      sortable: false,
      label: 'label.discount-percentage',
    },
    {
      width: 90,
      key: 'pricePerUnitAfterDiscount',
      sortable: false,
      label: 'label.price-per-unit-after-discount',
    },
    {
      width: 90,
      key: 'requestedDeliveryDate',
      sortable: false,
      label: 'label.requested-delivery-date',
    },
    {
      width: 90,
      key: 'expectedDeliveryDate',
      sortable: false,
      label: 'label.expected-delivery-date',
    },
    {
      width: 90,
      key: 'comment',
      sortable: false,
      label: 'label.comment',
    },
    {
      width: 90,
      key: 'note',
      sortable: false,
      label: 'label.notes',
    },
  ];

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

  const filteredEquipment = uploadedRows.filter(row => {
    if (!searchString) return true;
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
    <ImportPanel tab={tab}>
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
          id={''}
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
        />
      </Grid>
    </ImportPanel>
  );
};
