import React from 'react';

import {
  DataTable,
  useColumns,
  TooltipTextCell,
  TableProvider,
  createTableStore,
} from '@openmsupply-client/common';

const packVariants = [
  { id: '1', level: 'Primary', name: 'Primary', packSize: 1, volumePerUnit: 1 },
  {
    id: '2',
    level: 'Secondary',
    name: 'Secondary',
    packSize: 1,
    volumePerUnit: 3,
  },
  {
    id: '3',
    level: 'Tertiary',
    name: 'Tertiary',
    packSize: 1,
    volumePerUnit: 1,
  },
];
export type PackagingVariant = (typeof packVariants)[number];

export const ItemPackagingVariantsTable = ({
  data,
}: {
  data: PackagingVariant[];
}) => {
  const columns = useColumns<PackagingVariant>([
    { key: 'level', Cell: TooltipTextCell, label: 'label.level' },
    { key: 'packSize', Cell: TooltipTextCell, label: 'label.pack-size' },
    {
      key: 'volumePerUnit',
      Cell: TooltipTextCell,
      label: 'label.volume-per-unit',
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
