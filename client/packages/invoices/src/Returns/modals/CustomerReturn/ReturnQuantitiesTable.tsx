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
  useTranslation,
} from '@openmsupply-client/common';
import {
  getVolumePerPackFromVariant,
  ItemVariantInputCell,
  useIsItemVariantsEnabled,
} from '@openmsupply-client/system';
import React, { useMemo } from 'react';
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
  const t = useTranslation();
  const showItemVariantsColumn = useIsItemVariantsEnabled();

  const columnDefinitions = useMemo(() => {
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
        setter: patch =>
          updateLine({
            ...patch,
            volumePerPack: getVolumePerPackFromVariant(patch) ?? 0,
          }),
        Cell: props => (
          <ItemVariantInputCell {...props} itemId={props.rowData.item.id} />
        ),
        getIsDisabled: () => isDisabled,
      });

    columnDefinitions.push(
      [
        expiryInputColumn,
        {
          width: 160,
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
        Cell: PackSizeEntryCell<GenerateCustomerReturnLineFragment>,
        setter: patch =>
          updateLine({
            ...patch,
            volumePerPack: getVolumePerPackFromVariant(patch) ?? 0,
          }),
        getIsDisabled: () => isDisabled,
        label: 'label.pack-size',
      })
    );

    // if any line has a value, show the column
    if (lines.some(l => !!l.numberOfPacksIssued)) {
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

    columnDefinitions.push(
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
      {
        key: 'volumePerPack',
        label: t('label.volume-per-pack'),
        Cell: NumberInputCell,
        cellProps: { decimalLimit: 10 },
        width: 100,
        accessor: ({ rowData }) => rowData?.volumePerPack,
        setter: updateLine,
        getIsDisabled: () => isDisabled,
      }
    );
    return columnDefinitions;
  }, [isDisabled, lines, showItemVariantsColumn]);

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
