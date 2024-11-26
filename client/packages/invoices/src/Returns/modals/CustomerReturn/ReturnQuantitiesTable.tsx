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

  const columnDefinitions: ColumnDescription<GenerateCustomerReturnLineFragment>[] =
    ['itemCode', 'itemName'];

  columnDefinitions.push([
    'batch',
    {
      width: 125,
      accessor: ({ rowData }) => rowData.batch ?? '',
      setter: updateLine,
      Cell: props => (
        <TextInputCell {...props} isRequired autocompleteName="batch" />
      ),
      getIsDisabled: () => isDisabled,
    },
  ]);

  if (showItemVariantsColumn)
    columnDefinitions.push({
      key: 'itemVariantId',
      label: 'label.item-variant',
      width: 170,
      setter: updateLine,
      Cell: props => (
        <ItemVariantInputCell {...props} itemId={props.rowData.item.id} />
      ),
      getIsDisabled: () => isDisabled,
    });

  columnDefinitions.push(
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
    })
  );

  if (lines.some(l => l.numberOfPacksIssued !== null)) {
    // if any line has a value, show the column

    columnDefinitions.push([
      'numberOfPacks',
      {
        label: 'label.pack-quantity-issued',
        width: 110,
        accessor: ({ rowData }) => rowData.numberOfPacksIssued ?? '--',
        Cell: BasicCell,
        getIsDisabled: () => isDisabled,
      },
    ]);
  }

  columnDefinitions.push([
    'numberOfPacksReturned',
    {
      description: 'description.pack-quantity',
      width: 100,
      setter: updateLine,
      getIsDisabled: () => isDisabled,
      Cell: NumberOfPacksReturnedInputCell,
    },
  ]);

  const columns = useColumns(columnDefinitions, {}, [
    updateLine,
    lines,
    columnDefinitions,
  ]);

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
