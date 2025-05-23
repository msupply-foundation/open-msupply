import React from 'react';
import {
  PaperPopoverSection,
  useTranslation,
  TableProvider,
  createTableStore,
  DataTable,
  NothingHere,
  EditIcon,
  PersistentPaperPopover,
} from '@openmsupply-client/common';
import { useItemVariantSelectorColumns } from './columns';
import { ItemVariantFragment } from '../../api';

interface ItemVariantSelectorProps {
  selectedId: string | null;
  variants?: ItemVariantFragment[];
  isLoading?: boolean;
  onVariantSelected: (itemVariantId: string | null) => void;
  displayInDoses: boolean;
}

export const ItemVariantSelector = ({
  selectedId,
  variants,
  isLoading = false,
  onVariantSelected,
  displayInDoses,
}: ItemVariantSelectorProps) => {
  const t = useTranslation();
  const columns = useItemVariantSelectorColumns({
    selectedId,
    onVariantSelected,
    displayInDoses,
  });

  if (!variants) return null;

  return (
    <TableProvider createStore={createTableStore}>
      <PersistentPaperPopover
        placement="bottom"
        width={850}
        Content={
          <PaperPopoverSection>
            <DataTable
              id="item-variant-selector"
              columns={columns}
              data={variants ?? []}
              isLoading={isLoading}
              noDataElement={
                <NothingHere body={t('messages.no-item-variants')} />
              }
            />
          </PaperPopoverSection>
        }
      >
        <EditIcon style={{ fontSize: 16, fill: 'none' }} />
      </PersistentPaperPopover>
    </TableProvider>
  );
};
