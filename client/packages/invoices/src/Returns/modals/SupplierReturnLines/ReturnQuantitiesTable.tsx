import { DataTable, NumberInputCell, useColumns } from 'packages/common/src';
import React from 'react';
import { DraftSupplierReturnLine } from './useDraftSupplierReturnLines';

export const QuantityToReturnTableComponent = ({
  lines,
  updateLine,
}: {
  lines: DraftSupplierReturnLine[];
  updateLine: (line: Partial<DraftSupplierReturnLine> & { id: string }) => void;
}) => {
  const columns = useColumns<DraftSupplierReturnLine>(
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
              min={1}
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
