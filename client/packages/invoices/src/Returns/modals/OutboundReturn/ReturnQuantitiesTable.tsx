import {
  DataTable,
  NumberInputCell,
  useColumns,
  CellProps,
} from '@openmsupply-client/common';
import { PackVariantCell } from '@openmsupply-client/system';
import React from 'react';
import { GenerateOutboundReturnLineFragment } from '../../api';

export const QuantityToReturnTableComponent = ({
  lines,
  updateLine,
  isDisabled,
}: {
  lines: GenerateOutboundReturnLineFragment[];
  updateLine: (
    line: Partial<GenerateOutboundReturnLineFragment> & { id: string }
  ) => void;
  isDisabled: boolean;
}) => {
  const columns = useColumns<GenerateOutboundReturnLineFragment>(
    [
      'itemCode',
      'itemName',
      // 'itemUnit', // not implemented for now
      // 'location',
      'batch',
      'expiryDate',
      {
        key: 'packUnit',
        label: 'label.pack',
        sortable: false,
        // eslint-disable-next-line new-cap
        Cell: PackVariantCell({
          getItemId: row => row.item.id,
          getPackSizes: row => [row.packSize],
          getUnitName: row => row.item.unitName || null,
        }),
      },
      [
        'availableNumberOfPacks',
        {
          description: 'description.pack-quantity',
        },
      ],
      [
        'numberOfPacksToReturn',
        {
          description: 'description.pack-quantity',
          width: 100,
          setter: updateLine,
          getIsDisabled: () => isDisabled,
          Cell: NumberOfPacksToReturnReturnInputCell,
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

// Input cells can't be defined inline, otherwise they lose focus on re-render
const NumberOfPacksToReturnReturnInputCell: React.FC<
  CellProps<GenerateOutboundReturnLineFragment>
> = props => (
  <NumberInputCell
    {...props}
    isRequired
    max={props.rowData.availableNumberOfPacks}
    min={0}
  />
);

export const QuantityToReturnTable = React.memo(QuantityToReturnTableComponent);
