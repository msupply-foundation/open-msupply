import React, { PropsWithChildren } from 'react';
import {
  PaperPopoverSection,
  useTranslation,
  NothingHere,
  PersistentPaperPopover,
  useSimpleMaterialTable,
  MaterialTable,
  usePopover,
} from '@openmsupply-client/common';
import { useItemVariantSelectorColumns } from './columns';
import { ItemVariantFragment } from '../../api';

interface ItemVariantSelectorProps {
  selectedId?: string | null;
  variants: ItemVariantFragment[];
  isLoading?: boolean;
  onVariantSelected: (itemVariantId: string | null) => void;
  disabled?: boolean;
  isVaccine?: boolean;
}

export const ItemVariantSelector = ({
  children,
  selectedId,
  variants,
  isLoading = false,
  disabled = false,
  onVariantSelected,
  isVaccine,
}: ItemVariantSelectorProps & PropsWithChildren) => {
  const t = useTranslation();
  const popoverControls = usePopover();

  const columns = useItemVariantSelectorColumns({
    selectedId,
    onVariantSelected,
    isVaccine,
  });

  const table = useSimpleMaterialTable<ItemVariantFragment>({
    tableId: 'item-variant-selector',
    columns,
    data: variants,
    isLoading,
    getIsRestrictedRow: disabled ? () => true : undefined,
    enableBottomToolbar: false,
    noDataElement: <NothingHere body={t('messages.no-item-variants')} />,
  });

  return (
    <PersistentPaperPopover
      popoverControls={popoverControls}
      placement="bottom"
      width={850}
      Content={
        <PaperPopoverSection>
          <MaterialTable table={table} />
        </PaperPopoverSection>
      }
    >
      {children}
    </PersistentPaperPopover>
  );
};
