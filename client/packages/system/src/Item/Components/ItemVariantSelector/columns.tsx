import React from 'react';
import {
  ColumnDescription,
  RadioCell,
  TooltipTextCell,
  useColumns,
} from '@openmsupply-client/common';
import { ItemVariantFragment } from '../../api';

interface ItemVariantSelectorColumnProps {
  selectedId: string | null;
  onVariantSelected: (itemVariantId: string | null) => void;
  isVaccine?: boolean;
}

export const useItemVariantSelectorColumns = ({
  selectedId,
  onVariantSelected,
  isVaccine,
}: ItemVariantSelectorColumnProps) => {
  const columnDefinition: ColumnDescription<ItemVariantFragment>[] = [
    {
      key: 'itemVariantSelector',
      Cell: props => (
        <RadioCell
          {...props}
          selectedId={selectedId}
          onSelected={onVariantSelected}
          groupName="item-variant-selector"
        />
      ),
      accessor: ({ rowData }) => rowData.id,
      width: 50,
    },
    [
      'name',
      {
        Cell: TooltipTextCell,
        width: 300,
      },
    ],
  ];

  columnDefinition.push({
    key: 'manufacturer',
    label: 'label.manufacturer',
    width: 250,
    Cell: TooltipTextCell,
    accessor: ({ rowData }) => rowData.manufacturer?.name,
  });

  if (isVaccine) {
    columnDefinition.push({
      key: 'vvmType',
      label: 'label.vvm-type',
    });
  }

  return useColumns(columnDefinition, {}, [selectedId, onVariantSelected]);
};
