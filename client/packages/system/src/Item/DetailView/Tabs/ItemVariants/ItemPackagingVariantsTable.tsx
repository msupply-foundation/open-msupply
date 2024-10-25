import React from 'react';

import {
  DataTable,
  useColumns,
  TooltipTextCell,
  TableProvider,
  createTableStore,
  NumberInputCell,
  TextInputCell,
} from '@openmsupply-client/common';
import { PackagingVariantFragment } from '../../../api';

export const ItemPackagingVariantsTable = ({
  data,
  update,
}: {
  data: PackagingVariantFragment[];
  update?: (packagingVariants: PackagingVariantFragment[]) => void;
}) => {
  const updatePackaging = (
    packagingVariant?: Partial<PackagingVariantFragment>
  ) => {
    if (!packagingVariant || !update) return;

    const idx = data.findIndex(v => v.id === packagingVariant.id);

    if (idx !== -1) {
      const newPackagingVariants = [...data];
      newPackagingVariants[idx] = packagingVariant as PackagingVariantFragment; // TODO: remove `as` when column typing is improved!
      update(newPackagingVariants);
    }
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
      Cell: update ? NumberInputCell : TooltipTextCell,
      label: 'label.pack-size',
      setter: updatePackaging,
    },
    {
      key: 'volumePerUnit',
      Cell: update ? VolumeInputCell : TooltipTextCell,
      label: 'label.volume-per-unit',
      setter: updatePackaging,
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
  <NumberInputCell decimalLimit={2} {...props} />
);
