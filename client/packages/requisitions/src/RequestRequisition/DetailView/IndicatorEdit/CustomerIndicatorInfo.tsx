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
import { CustomerIndicatorInfoFragment } from '../../api';

interface CustomerIndicatorInfoProps {
  customerInfos?: CustomerIndicatorInfoFragment[] | null;
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
  customerInfos,
}: CustomerIndicatorInfoProps) => {
  const columnNames = customerInfos?.[0]?.indicatorInformation?.map(
    indicatorInfo => indicatorInfo.column.name
  );

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

  if (columnNames) {
    columnNames.forEach(columnName => {
      columnDefinitions.push({
        key: columnName,
        label: columnNameToLocal(columnName),
        sortable: false,
        accessor: ({ rowData }) => {
          const indicator = rowData?.indicatorInformation?.find(
            indicatorInfo => indicatorInfo.column.name === columnName
          );
          return indicator?.value;
        },
      });
    });
  }

  columnDefinitions.push({
    key: 'datetime',
    label: 'label.date',
    sortable: false,
    format: ColumnFormat.Date,
  });

  const columns = useColumns<CustomerIndicatorInfoFragment>(columnDefinitions);

  return (
    <DataTable
      id="item-information"
      columns={columns}
      data={customerInfos ?? []}
      dense
    />
  );
};

export const CustomerIndicatorInfoView = ({
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
      <CustomerIndicatorInfo customerInfos={customerInfos} />
    </TableProvider>
  </Box>
);
