import {
  DataTable,
  NumberInputCell,
  SupplierReturnLine,
  useColumns,
} from 'packages/common/src';
import React from 'react';

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
        {
          width: 100,
          setter: updateLine,
          Cell: props => (
            <NumberInputCell
              {...props}
              isRequired
              max={props.rowData.availableNumberOfPacks}
              min={0}
            />
          ),
        },
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
