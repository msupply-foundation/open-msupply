import React, { useMemo } from 'react';
import {
  TextWithTooltipCell,
  MaterialTable,
  useSimpleMaterialTable,
  ColumnDef,
  useTranslation,
} from '@openmsupply-client/common';
import { PackagingVariantFragment } from '../../../api';
import { TextInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/TextInputCell';
import { NumberInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/NumberInputCell';

export const ItemPackagingVariantsTable = ({
  data,
  update,
}: {
  data: PackagingVariantFragment[];
  update?: (packagingVariant: Partial<PackagingVariantFragment>) => void;
}) => {
  const t = useTranslation();

  const updatePackaging = (
    packagingVariant?: Partial<PackagingVariantFragment>
  ) => {
    if (!packagingVariant || !update) return;

    update(packagingVariant);
  };

  const columns = useMemo(
    (): ColumnDef<PackagingVariantFragment>[] => [
      {
        accessorKey: 'packagingLevel',
        header: t('label.level'),
        Cell: TextWithTooltipCell,
        size: 100,
      },
      {
        accessorKey: 'name',
        header: t('label.name'),
        Cell: update ? ({ cell, row: { original: row } }) => <TextInputCell
          cell={cell}
          updateFn={value => updatePackaging({ id: row.id, name: value })}
        /> : TextWithTooltipCell,
        size: 150,
      },
      {
        accessorKey: 'packSize',
        header: t('label.pack-size'),
        Cell: update ? ({ cell, row: { original: row } }) => <NumberInputCell
          cell={cell}
          updateFn={value => updatePackaging({ id: row.id, packSize: value })}
          min={1}
          decimalLimit={0}
          error={cell.getValue() === 0}
        /> : TextWithTooltipCell,
        size: 100,
      },
      {
        accessorKey: 'volumePerUnit',
        header: t('label.volume-per-unit'),
        Cell: update ? ({ cell, row: { original: row } }) => <NumberInputCell
          cell={cell}
          updateFn={value => updatePackaging({ id: row.id, volumePerUnit: value })}
          min={1}
          error={cell.getValue() === 0}
        /> : TextWithTooltipCell,
        size: 100,
      },
    ],
    []
  );

  const table = useSimpleMaterialTable<PackagingVariantFragment>({
    tableId: 'item-variant-packaging',
    data,
    columns,
  });

  return <MaterialTable table={table} />;
};
