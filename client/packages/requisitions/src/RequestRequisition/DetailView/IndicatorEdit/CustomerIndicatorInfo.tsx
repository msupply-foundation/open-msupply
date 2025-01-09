import React from 'react';
import {
  Box,
  ColumnDescription,
  ColumnFormat,
  createTableStore,
  DataTable,
  TableProvider,
  TooltipTextCell,
  useColumns,
} from '@openmsupply-client/common';
import {
  CustomerIndicatorInfoFragment,
  IndicatorColumnFragment,
} from '../../api';

interface CustomerIndicatorInfoProps {
  columns: IndicatorColumnFragment[];
  customerInfos: CustomerIndicatorInfoFragment[];
}

enum ColumnName {
  Comment = 'Comment',
  Value = 'Value',
}

const columnNameToLocal = (columnName: string) => {
  switch (columnName) {
    case ColumnName.Comment:
      return 'label.comment';
    case ColumnName.Value:
      return 'label.value';
    default:
      return columnName;
  }
};

const CustomerIndicatorInfo = ({
  columns,
  customerInfos,
}: CustomerIndicatorInfoProps) => {
  const columnDefinitions: ColumnDescription<CustomerIndicatorInfoFragment>[] =
    [
      [
        'name',
        {
          sortable: false,
          accessor: ({ rowData }) => rowData?.customer.name,
          width: 300,
          Cell: TooltipTextCell,
        },
      ],
    ];

  columns.forEach(({ name, id }) => {
    columnDefinitions.push({
      key: name,
      label: columnNameToLocal(name),
      sortable: false,
      accessor: ({ rowData }) => {
        const indicator = rowData?.indicatorInformation?.find(
          ({ columnId }) => columnId == id
        );
        return indicator?.value || '';
      },
    });
  });

  columnDefinitions.push({
    key: 'datetime',
    label: 'label.date',
    sortable: false,
    format: ColumnFormat.Date,
  });

  const tableColumns =
    useColumns<CustomerIndicatorInfoFragment>(columnDefinitions);

  return (
    <DataTable
      id="item-information"
      columns={tableColumns}
      data={customerInfos}
      dense
    />
  );
};

export const CustomerIndicatorInfoView = ({
  columns,
  customerInfos,
}: CustomerIndicatorInfoProps) => (
  <Box
    width="100%"
    borderRadius={3}
    sx={{
      display: 'flex',
      flex: '1 1 0%',
      overflowY: 'auto',
    }}
  >
    <TableProvider createStore={createTableStore}>
      <CustomerIndicatorInfo columns={columns} customerInfos={customerInfos} />
    </TableProvider>
  </Box>
);
