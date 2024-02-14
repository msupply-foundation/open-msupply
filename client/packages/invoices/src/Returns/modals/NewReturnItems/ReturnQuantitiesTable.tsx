import {
  CellProps,
  DataTable,
  NumberInputCell,
  useColumns,
} from 'packages/common/src';
import React from 'react';
import { DraftReturnLine } from './useDraftReturnLines';

const QuantityToReturnCell = (props: CellProps<DraftReturnLine>) => (
  <NumberInputCell
    {...props}
    isRequired
    max={props.rowData.availableNumberOfPacks}
    min={1}
  />
);

export const QuantityToReturnTableComponent = ({
  lines,
  updateLine,
}: {
  lines: DraftReturnLine[];
  updateLine: (line: Partial<DraftReturnLine> & { id: string }) => void;
}) => {
  const columns = useColumns<DraftReturnLine>(
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
