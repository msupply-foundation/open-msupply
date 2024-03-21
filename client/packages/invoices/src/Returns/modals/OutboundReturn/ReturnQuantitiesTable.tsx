import {
  DataTable,
  NumberInputCell,
  OutboundReturnLineNode,
  useColumns,
} from '@openmsupply-client/common';
import React from 'react';

export const QuantityToReturnTableComponent = ({
  lines,
  updateLine,
}: {
  lines: OutboundReturnLineNode[];
  updateLine: (line: Partial<OutboundReturnLineNode> & { id: string }) => void;
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
