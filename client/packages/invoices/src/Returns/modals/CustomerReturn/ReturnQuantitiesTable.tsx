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
  ItemVariantInputCell,
  useIsItemVariantsEnabled,
} from '@openmsupply-client/system';
import React from 'react';
import { GenerateCustomerReturnLineFragment } from '../../api';
import { PackSizeEntryCell } from '@openmsupply-client/system';

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
  const showItemVariantsColumn = useIsItemVariantsEnabled();

  const columns = useColumns<GenerateCustomerReturnLineFragment>(
    [
      'itemCode',
      'itemName',
      ...((showItemVariantsColumn
        ? [
            {
              key: 'itemVariantId',
              label: 'label.item-variant',
              width: 170,
              setter: updateLine,
              Cell: props => (
                <ItemVariantInputCell
                  {...props}
                  itemId={props.rowData.item.id}
                />
              ),
              getIsDisabled: () => isDisabled,
            },
          ]
        : []) as ColumnDescription<GenerateCustomerReturnLineFragment>[]),
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
        label: 'label.pack-size',
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
  PackSizeEntryCell<GenerateCustomerReturnLineFragment>({});

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
