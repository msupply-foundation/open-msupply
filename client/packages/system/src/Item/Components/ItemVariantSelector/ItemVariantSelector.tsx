import React, { PropsWithChildren } from 'react';
import {
  PaperPopoverSection,
  useTranslation,
  TableProvider,
  createTableStore,
  DataTable,
  NothingHere,
  PersistentPaperPopover,
} from '@openmsupply-client/common';
import { useItemVariantSelectorColumns } from './columns';
import { ItemVariantFragment } from '../../api';

interface ItemVariantSelectorProps {
  selectedId: string | null;
  variants: ItemVariantFragment[];
  isLoading?: boolean;
  onVariantSelected: (itemVariantId: string | null) => void;
  displayInDoses: boolean;
  disabled?: boolean;
}

export const ItemVariantSelector = ({
  children,
  selectedId,
  variants,
  isLoading = false,
  disabled = false,
  onVariantSelected,
  displayInDoses,
}: ItemVariantSelectorProps & PropsWithChildren) => {
  const t = useTranslation();
  const columns = useItemVariantSelectorColumns({
    selectedId,
    onVariantSelected,
    displayInDoses,
  });

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
              isDisabled={disabled}
              isLoading={isLoading}
              noDataElement={
                <NothingHere body={t('messages.no-item-variants')} />
              }
            />
          </PaperPopoverSection>
        }
      >
        {children}
      </PersistentPaperPopover>
    </TableProvider>
  );
};
