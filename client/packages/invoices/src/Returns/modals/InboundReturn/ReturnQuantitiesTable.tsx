import {
  DataTable,
  GeneratedInboundReturnLineNode,
  NumberInputCell,
  useColumns,
} from '@openmsupply-client/common';
import React from 'react';

export const QuantityReturnedTableComponent = ({
  lines,
  updateLine,
}: {
  lines: GeneratedInboundReturnLineNode[];
  updateLine: (
    line: Partial<GeneratedInboundReturnLineNode> & { id: string }
  ) => void;
}) => {
  const columns = useColumns<GeneratedInboundReturnLineNode>(
    [
      'itemCode',
      'itemName',
      // 'itemUnit', // not implemented for now
      // 'location',
      'batch',
      'expiryDate',
      [
        'numberOfPacks',
        {
          label: 'label.pack-quantity-issued',
          width: 125,
          accessor: ({ rowData }) => rowData.numberOfPacksIssued,
        },
      ],
      [
        'numberOfPacksReturned',
        {
          width: 100,
          setter: updateLine,
          Cell: props => (
            <NumberInputCell
              {...props}
              isRequired
              max={props.rowData.numberOfPacksIssued ?? undefined}
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
      id="inbound-return-line-quantity"
      columns={columns}
      data={lines}
      dense
    />
  );
};

export const QuantityReturnedTable = React.memo(QuantityReturnedTableComponent);
