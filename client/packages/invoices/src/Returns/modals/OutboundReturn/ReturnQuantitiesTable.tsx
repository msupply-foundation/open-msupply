import {
  DataTable,
  NumberInputCell,
  OutboundReturnLineNode,
  useColumns,
  CellProps,
} from '@openmsupply-client/common';
import React from 'react';

export const QuantityToReturnTableComponent = ({
  lines,
  updateLine,
  isDisabled,
}: {
  lines: OutboundReturnLineNode[];
  updateLine: (line: Partial<OutboundReturnLineNode> & { id: string }) => void;
  isDisabled: boolean;
}) => {
  const columns = useColumns<OutboundReturnLineNode>(
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
          getIsDisabled: () => isDisabled,
          Cell: NumberOfPacksToReturnReturnInputCell,
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

// Input cells can't be defined inline, otherwise they lose focus on re-render
const NumberOfPacksToReturnReturnInputCell: React.FC<
  CellProps<OutboundReturnLineNode>
> = props => (
  <NumberInputCell
    {...props}
    isRequired
    max={props.rowData.availableNumberOfPacks}
    min={0}
  />
);

export const QuantityToReturnTable = React.memo(QuantityToReturnTableComponent);
