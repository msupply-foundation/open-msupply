import {
  BasicCell,
  DataTable,
  Formatter,
  GeneratedInboundReturnLineNode,
  NumberInputCell,
  TextInputCell,
  getExpiryDateInputColumn,
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
      [
        'batch',
        {
          width: 125,
          setter: updateLine,
          Cell: TextInputCell,
        },
      ],
      [
        getExpiryDateInputColumn<GeneratedInboundReturnLineNode>(),
        {
          width: 150,
          setter: l =>
            updateLine({
              ...l,
              expiryDate: l.expiryDate
                ? Formatter.naiveDate(new Date(l.expiryDate))
                : null,
            }),
        },
      ],
      [
        // TODO: PACK VARIANTS HERE
        'packSize',
        {
          width: 100,
          setter: updateLine,
          Cell: props => <NumberInputCell {...props} isRequired min={1} />,
        },
      ],
      [
        'numberOfPacks',
        {
          label: 'label.pack-quantity-issued',
          width: 110,
          accessor: ({ rowData }) => rowData.numberOfPacksIssued ?? '--',
          Cell: BasicCell,
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
