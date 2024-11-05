import React from 'react';

import {
  DataTable,
  useColumns,
  TooltipTextCell,
  TableProvider,
  createTableStore,
  NumberInputCell,
  TextInputCell,
  CellProps,
} from '@openmsupply-client/common';
import { PackagingVariantFragment } from '../../../api';

export const ItemPackagingVariantsTable = ({
  data,
  update,
}: {
  data: PackagingVariantFragment[];
  update?: (packagingVariant: Partial<PackagingVariantFragment>) => void;
}) => {
  const updatePackaging = (
    packagingVariant?: Partial<PackagingVariantFragment>
  ) => {
    if (!packagingVariant || !update) return;

    update(packagingVariant);
  };
  const columns = useColumns<PackagingVariantFragment>([
    {
      key: 'packagingLevel',
      Cell: TooltipTextCell,
      label: 'label.level',
    },
    {
      key: 'name',
      Cell: update ? TextInputCell : TooltipTextCell,
      label: 'label.name',
      setter: updatePackaging,
    },
    {
      key: 'packSize',
      Cell: update ? PackSizeInputCell : TooltipTextCell,
      label: 'label.pack-size',
      setter: updatePackaging,
    },
    {
      key: 'volumePerUnit',
      Cell: update ? VolumeInputCell : TooltipTextCell,
      label: 'label.volume-per-unit',
      setter: updatePackaging,
      width: 150,
    },
  ]);

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        id="item-variant-packaging"
        data={data}
        columns={columns}
        dense
      />
    </TableProvider>
  );
};

// Input cells can't be defined inline, otherwise they lose focus on re-render
const VolumeInputCell = (props: CellProps<PackagingVariantFragment>) => (
  <NumberInputCell decimalLimit={10} {...props} />
);

// Input cells can't be defined inline, otherwise they lose focus on re-render
const PackSizeInputCell = (props: CellProps<PackagingVariantFragment>) => (
  <NumberInputCell decimalLimit={10} {...props} />
);
