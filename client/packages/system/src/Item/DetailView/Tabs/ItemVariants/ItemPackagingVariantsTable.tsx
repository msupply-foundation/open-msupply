import React from 'react';

import {
  DataTable,
  useColumns,
  TooltipTextCell,
  TableProvider,
  createTableStore,
} from '@openmsupply-client/common';
import { PackagingVariantFragment } from '../../../api';

export const ItemPackagingVariantsTable = ({
  data,
}: {
  data: PackagingVariantFragment[];
}) => {
  const columns = useColumns<PackagingVariantFragment>([
    { key: 'name', Cell: TooltipTextCell, label: 'label.level' },
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
