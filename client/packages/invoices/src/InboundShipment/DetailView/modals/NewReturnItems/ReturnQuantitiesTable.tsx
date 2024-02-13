import {
  CellProps,
  DataTable,
  NonNegativeIntegerCell,
  SupplierReturnLine,
  useColumns,
} from 'packages/common/src';
import React from 'react';

const QuantityToReturnCell = (props: CellProps<SupplierReturnLine>) => (
  <NonNegativeIntegerCell {...props} isRequired />
);

export const QuantityToReturnTableComponent = ({
  lines,
  updateLine,
}: {
  lines: SupplierReturnLine[];
  updateLine: (line: Partial<SupplierReturnLine> & { id: string }) => void;
}) => {
  const columns = useColumns<SupplierReturnLine>(
    [
      'itemCode',
      'itemName',
      // 'itemUnit', // not implemented for now
      // 'location',
      'batch',
      'expiryDate',
      'availableNumberOfPacks',
      [
        'numberOfPacksToReturn',
        { Cell: QuantityToReturnCell, width: 100, setter: updateLine },
      ],
    ],
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

export const QuantityToReturnTable = React.memo(QuantityToReturnTableComponent);
