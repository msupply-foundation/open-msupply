import {
  DataTable,
  NumberInputCell,
  useColumns,
  CellProps,
  ColumnDescription,
} from '@openmsupply-client/common';

import React from 'react';
import { GenerateSupplierReturnLineFragment } from '../../api';

export const QuantityToReturnTableComponent = ({
  lines,
  updateLine,
  isDisabled,
}: {
  lines: GenerateSupplierReturnLineFragment[];
  updateLine: (
    line: Partial<GenerateSupplierReturnLineFragment> & { id: string }
  ) => void;
  isDisabled: boolean;
}) => {
  const columnDescriptions: ColumnDescription<GenerateSupplierReturnLineFragment>[] =
    [
      'itemCode',
      'itemName',
      // 'location',
      'batch',
      'expiryDate',
    ];

  columnDescriptions.push(
    [
      'itemUnit',
      {
        accessor: ({ rowData }) => rowData.item.unitName ?? '',
      },
    ],
    'packSize'
  );

  columnDescriptions.push(
    [
      'availableNumberOfPacks',
      {
        description: 'description.pack-quantity',
      },
    ],
    [
      'numberOfPacksToReturn',
      {
        description: 'description.pack-quantity',
        width: 100,
        setter: updateLine,
        getIsDisabled: () => isDisabled,
        Cell: NumberOfPacksToReturnReturnInputCell,
      },
    ]
  );

  const columns = useColumns<GenerateSupplierReturnLineFragment>(
    columnDescriptions,
    {},
    [updateLine, lines]
  );

  return (
    <DataTable
      id="supplier-return-line-quantity"
      columns={columns}
      data={lines}
      dense
    />
  );
};

// Input cells can't be defined inline, otherwise they lose focus on re-render
const NumberOfPacksToReturnReturnInputCell: React.FC<
  CellProps<GenerateSupplierReturnLineFragment>
> = props => (
  <NumberInputCell
    {...props}
    isRequired
    max={props.rowData.availableNumberOfPacks}
  />
);

export const QuantityToReturnTable = React.memo(QuantityToReturnTableComponent);
