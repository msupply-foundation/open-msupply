import {
  CellProps,
  DataTable,
  NonNegativeIntegerCell,
  SupplierReturnLine,
  useColumns,
} from 'packages/common/src';
import React from 'react';

const QuantityToReturnCell = ({
  rowData,
  ...props
}: CellProps<SupplierReturnLine>) => (
  <NonNegativeIntegerCell
    {...props}
    isRequired // TODO?
    rowData={rowData}
  />
);

export const QuantityToReturnTableComponent = ({
  lines,
  updateLine,
  isDisabled = false,
}: {
  lines: SupplierReturnLine[];
  updateLine: (line: Partial<SupplierReturnLine> & { id: string }) => void;
  isDisabled?: boolean;
}) => {
  const columns = useColumns<SupplierReturnLine>(
    [
      'itemCode',
      'itemName',
      'itemUnit',
      'location',
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
      isDisabled={isDisabled}
      columns={columns}
      data={lines}
      noDataMessage="Add a new line" // TODO
      dense
    />
  );
};

export const QuantityToReturnTable = React.memo(QuantityToReturnTableComponent);
