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
  useIsPackVariantsEnabled,
} from '@openmsupply-client/system';
import React from 'react';
import { GenerateCustomerReturnLineFragment } from '../../api';

export const QuantityReturnedTableComponent = ({
  lines,
  updateLine,
  isDisabled,
}: {
  lines: GenerateCustomerReturnLineFragment[];
  updateLine: (
    line: Partial<GenerateCustomerReturnLineFragment> & { id: string }
  ) => void;
  isDisabled: boolean;
}) => {
  const isPackVariantsEnabled = useIsPackVariantsEnabled();
  const columns = useColumns<GenerateCustomerReturnLineFragment>(
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
        ...(isPackVariantsEnabled
          ? {
              label: 'label.unit-variant-and-pack-size',
              minWidth: PACK_VARIANT_ENTRY_CELL_MIN_WIDTH,
            }
          : { label: 'label.pack-size' }),
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
          ] as ColumnDescription<GenerateCustomerReturnLineFragment>[])
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
      id="customer-return-line-quantity"
      columns={columns}
      data={lines}
      dense
    />
  );
};

export const QuantityReturnedTable = React.memo(QuantityReturnedTableComponent);

// Input cells can't be defined inline, otherwise they lose focus on re-render
const PackUnitEntryCell =
  // eslint-disable-next-line new-cap
  PackVariantEntryCell<GenerateCustomerReturnLineFragment>({
    getItemId: r => r.item.id,
    getUnitName: r => r.item.unitName || null,
  });

const NumberOfPacksReturnedInputCell: React.FC<
  CellProps<GenerateCustomerReturnLineFragment>
> = props => (
  <NumberInputCell
    {...props}
    isRequired
    max={props.rowData.numberOfPacksIssued ?? undefined}
  />
);
const expiryInputColumn =
  getExpiryDateInputColumn<GenerateCustomerReturnLineFragment>();
