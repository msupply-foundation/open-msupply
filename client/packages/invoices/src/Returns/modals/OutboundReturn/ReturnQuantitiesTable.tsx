import {
  DataTable,
  NumberInputCell,
  useColumns,
  CellProps,
  ColumnDescription,
} from '@openmsupply-client/common';
import {
  getPackVariantCell,
  usePackVariantsEnabled,
} from '@openmsupply-client/system';
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
  const packVariantsEnabled = usePackVariantsEnabled();

  const columnDescriptions: ColumnDescription<GenerateOutboundReturnLineFragment>[] =
    [
      'itemCode',
      'itemName',
      // 'location',
      'batch',
      'expiryDate',
    ];

  if (packVariantsEnabled) {
    columnDescriptions.push({
      key: 'packUnit',
      label: 'label.pack',
      sortable: false,
      // eslint-disable-next-line new-cap
      Cell: getPackVariantCell({
        getItemId: row => row.item.id,
        getPackSizes: row => [row.packSize],
        getUnitName: row => row.item.unitName || null,
      }),
    });
  } else {
    columnDescriptions.push(
      [
        'itemUnit',
        {
          accessor: ({ rowData }) => rowData.item.unitName ?? '',
        },
      ],
      'packSize'
    );
  }

  columnDescriptions.push(
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
    ]
  );

  const columns = useColumns<GenerateOutboundReturnLineFragment>(
    columnDescriptions,
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
