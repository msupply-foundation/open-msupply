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
  // what to do here if there are multiple items? Some might have PV and others not...
  // const { packVariantExists } = usePackVariant(item?.id || '', null);

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
        'packSize',
        {
          width: 100,
          setter: updateLine,
          Cell: props => <NumberInputCell {...props} isRequired min={1} />,
        },
      ],
      // TODO: implement pack variant
      // getColumnLookupWithOverrides('packSize', {
      //   Cell: PackUnitEntryCell,
      //   setter: updateLine,
      //   ...(packVariantExists
      //     ? {
      //         label: 'label.unit-variant-and-pack-size',
      //         minWidth: PACK_VARIANT_ENTRY_CELL_MIN_WIDTH,
      //       }
      //     : { label: 'label.pack-size' }),
      // }),
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
          description: 'description.pack-quantity',
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
