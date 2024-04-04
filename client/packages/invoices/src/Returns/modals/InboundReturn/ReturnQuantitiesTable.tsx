import {
  BasicCell,
  CellProps,
  ColumnDescription,
  DataTable,
  Formatter,
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
import { GenerateInboundReturnLineFragment } from '../../api';

export const QuantityReturnedTableComponent = ({
  lines,
  updateLine,
  isDisabled,
}: {
  lines: GenerateInboundReturnLineFragment[];
  updateLine: (
    line: Partial<GenerateInboundReturnLineFragment> & { id: string }
  ) => void;
  isDisabled: boolean;
}) => {
  const columns = useColumns<GenerateInboundReturnLineFragment>(
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
          getIsDisabled: () => isDisabled,
        },
      ],
      [
        expiryInputColumn,
        {
          width: 150,
          getIsDisabled: () => isDisabled,
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
        getIsDisabled: () => isDisabled,
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
                getIsDisabled: () => isDisabled,
              },
            ],
          ] as ColumnDescription<GenerateInboundReturnLineFragment>[])
        : []),
      [
        'numberOfPacksReturned',
        {
          description: 'description.pack-quantity',
          width: 100,
          setter: updateLine,
          getIsDisabled: () => isDisabled,
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
const PackUnitEntryCell =
  PackVariantEntryCell<GenerateInboundReturnLineFragment>({
    getItemId: r => r.item.id,
    getUnitName: r => r.item.unitName || null,
  });

const NumberOfPacksReturnedInputCell: React.FC<
  CellProps<GenerateInboundReturnLineFragment>
> = props => (
  <NumberInputCell
    {...props}
    isRequired
    max={props.rowData.numberOfPacksIssued ?? undefined}
    min={0}
  />
);
const expiryInputColumn =
  getExpiryDateInputColumn<GenerateInboundReturnLineFragment>();
