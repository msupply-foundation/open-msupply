import React from 'react';
import {
  Box,
  ColumnAlign,
  ColumnFormat,
  createTableStore,
  DataTable,
  TableProvider,
  TooltipTextCell,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';
import { ItemInformationFragment } from '../../api';

interface ItemInformationProps {
  itemInformation?: ItemInformationFragment[] | null;
  storeNameId?: string;
}

const ItemInformation = ({
  itemInformation,
  storeNameId,
}: ItemInformationProps) => {
  const t = useTranslation();
  const columns = useColumns<ItemInformationFragment>([
    [
      'name',
      {
        sortable: false,
        accessor: ({ rowData }) =>
          rowData.id === storeNameId
            ? `(${t('label.this-store')}) ${rowData?.name.name}`
            : rowData?.name.name,
        width: 240,
        Cell: TooltipTextCell,
      },
    ],

    {
      key: 'monthlyConsumption',
      label: 'label.amc',
      description: 'messages.requisition-item-information-amc',
      sortable: false,
      accessor: ({ rowData }) => rowData.amcInUnits,
      width: 80,
      align: ColumnAlign.Right,
      Cell: TooltipTextCell,
    },

    [
      'unitQuantity',
      {
        sortable: false,
        accessor: ({ rowData }) => rowData.stockInUnits,
        width: 100,
      },
    ],

    {
      key: 'losses',
      label: 'label.adjustments',
      sortable: false,
      accessor: ({ rowData }) => rowData.adjustmentsInUnits,
      width: 110,
      align: ColumnAlign.Right,
    },
    {
      key: 'dateRange',
      label: 'label.date-range',
      sortable: false,
      format: ColumnFormat.Date,
      accessor: ({ rowData }) => rowData.dateRange,
    },
  ]);

  return (
    <DataTable
      id="item-information"
      columns={columns}
      data={itemInformation ?? []}
      dense
    />
  );
};

export const ItemInformationView = ({
  itemInformation,
  storeNameId,
}: ItemInformationProps) => (
  <Box maxHeight={200} width="100%" borderRadius={3} overflow="auto">
    <TableProvider createStore={createTableStore}>
      <ItemInformation
        itemInformation={itemInformation}
        storeNameId={storeNameId}
      />
    </TableProvider>
  </Box>
);
