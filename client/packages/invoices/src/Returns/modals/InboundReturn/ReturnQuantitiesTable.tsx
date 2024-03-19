import {
  BasicCell,
  CellProps,
  ColumnDescription,
  DataTable,
  Formatter,
  GeneratedInboundReturnLineNode,
  NumberInputCell,
  TextInputCell,
  getColumnLookupWithOverrides,
  getExpiryDateInputColumn,
  useColumns,
} from '@openmsupply-client/common';
import {
  PACK_VARIANT_ENTRY_CELL_MIN_WIDTH,
  PackVariantEntryCell,
} from '@openmsupply-client/system';
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
          accessor: ({ rowData }) => rowData.batch ?? '',
          setter: updateLine,
          Cell: TextInputCell,
        },
      ],
      [
        expiryInputColumn,
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
      getColumnLookupWithOverrides('packSize', {
        Cell: PackUnitEntryCell,
        setter: updateLine,
        label: 'label.unit-variant-and-pack-size',
        minWidth: PACK_VARIANT_ENTRY_CELL_MIN_WIDTH,
      }),
      ...(lines.some(l => l.numberOfPacksIssued !== null) // if any line has a value, show the column
        ? ([
            [
              'numberOfPacks',
              {
                label: 'label.pack-quantity-issued',
                width: 110,
                accessor: ({ rowData }) => rowData.numberOfPacksIssued ?? '--',
                Cell: BasicCell,
              },
            ],
          ] as ColumnDescription<GeneratedInboundReturnLineNode>[])
        : []),
      [
        'numberOfPacksReturned',
        {
          description: 'description.pack-quantity',
          width: 100,
          setter: updateLine,
          Cell: NumberOfPacksReturnedInputCell,
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

// Input cells can't be defined inline, otherwise they lose focus on re-render
// eslint-disable-next-line new-cap
const PackUnitEntryCell = PackVariantEntryCell<GeneratedInboundReturnLineNode>({
  getItemId: r => r.itemId,
  // getUnitName: r => r.item.unitName || null,
  getUnitName: () => null,
});

const NumberOfPacksReturnedInputCell: React.FC<
  CellProps<GeneratedInboundReturnLineNode>
> = props => (
  <NumberInputCell
    {...props}
    isRequired
    max={props.rowData.numberOfPacksIssued ?? undefined}
    min={0}
  />
);
const expiryInputColumn =
  getExpiryDateInputColumn<GeneratedInboundReturnLineNode>();
