import React, { useMemo } from 'react';
import {
  ColumnDef,
  TextWithTooltipCell,
  useTranslation,
  MRTRadioCell,
} from '@openmsupply-client/common';
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

  return useMemo((): ColumnDef<ItemVariantFragment>[] => {
    return [
      {
        id: 'itemVariantSelector',
        header: '',
        size: 50,
        accessorKey: 'id',
        Cell: ({ cell, row }) => (
          <MRTRadioCell
            cell={cell}
            selectedId={selectedId}
            onSelected={onVariantSelected}
            groupName={`item-variant-selector-${row.original.itemId}`}
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
  }, [selectedId, onVariantSelected, isVaccine]);
};
