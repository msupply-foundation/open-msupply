import React, { useMemo } from 'react';
import {
  ColumnDef,
  TextWithTooltipCell,
  useTranslation,
} from '@openmsupply-client/common';
import { RadioCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components';
import { ItemVariantFragment } from '../../api';

interface ItemVariantSelectorColumnProps {
  selectedId?: string | null;
  onVariantSelected: (itemVariantId: string | null) => void;
  isVaccine?: boolean;
}

export const useItemVariantSelectorColumns = ({
  selectedId,
  onVariantSelected,
  isVaccine,
}: ItemVariantSelectorColumnProps) => {
  const t = useTranslation();

  const columns = useMemo(() => {
    const cols: ColumnDef<ItemVariantFragment>[] = [
      {
        id: 'itemVariantSelector',
        header: '',
        size: 50,
        accessorKey: 'id',
        Cell: ({ cell }) => (
          <RadioCell
            cell={cell}
            selectedId={selectedId}
            onSelected={onVariantSelected}
            groupName="item-variant-selector"
          />
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        accessorKey: 'name',
        header: t('label.name'),
        size: 300,
        Cell: TextWithTooltipCell,
      },
      {
        id: 'manufacturer',
        header: t('label.manufacturer'),
        size: 250,
        accessorFn: row => row.manufacturer?.name || '',
        Cell: TextWithTooltipCell,
      },
      {
        accessorKey: 'vvmStatus',
        header: t('label.vvm-status'),
        Cell: TextWithTooltipCell,
        includeColumn: isVaccine,
      },
    ];

    return cols;
  }, [selectedId, onVariantSelected, isVaccine, t]);

  return { columns };
};
