import React, { useMemo } from 'react';
import {
  FlatButton,
  useTranslation,
  PlusCircleIcon,
  useEditModal,
  IconButton,
  DeleteIcon,
  MaterialTable,
  useSimpleMaterialTable,
  ColumnDef,
  TextWithTooltipCell,
  useIsCentralServerApi,
  DetailSection,
  NothingHere,
} from '@openmsupply-client/common';
import {
  AncillaryItemFragment,
  ItemFragment,
  useDeleteAncillaryItem,
} from '../../../api';
import { AncillarySupplyModal } from './AncillarySupplyModal';
import { formatRatio } from './ratio';

export const AncillarySupplies = ({ item }: { item: ItemFragment }) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();

  const { isOpen, onClose, onOpen, entity } =
    useEditModal<AncillaryItemFragment>();

  return (
    <DetailSection title={t('title.ancillary-supplies')}>
      {isOpen && (
        <AncillarySupplyModal
          onClose={onClose}
          existing={entity}
          item={item}
        />
      )}

      <AncillarySuppliesTable
        item={item}
        onOpen={isCentralServer ? onOpen : undefined}
      />
    </DetailSection>
  );
};

const AncillarySuppliesTable = ({
  item,
  onOpen,
}: {
  item: ItemFragment;
  onOpen?: (row?: AncillaryItemFragment) => void;
}) => {
  const t = useTranslation();
  const deleteAncillaryItem = useDeleteAncillaryItem({ itemId: item.id });

  const columns = useMemo(
    (): ColumnDef<AncillaryItemFragment>[] => {
      const cols: ColumnDef<AncillaryItemFragment>[] = [
        {
          id: 'name',
          accessorFn: row => row.ancillaryItem?.name ?? '',
          header: t('label.ancillary-item'),
          Cell: TextWithTooltipCell,
        },
        {
          id: 'code',
          accessorFn: row => row.ancillaryItem?.code ?? '',
          header: t('label.code'),
          Cell: TextWithTooltipCell,
          size: 120,
        },
        {
          id: 'ratio',
          accessorFn: row =>
            formatRatio(row.itemQuantity, row.ancillaryQuantity),
          header: t('label.ratio'),
          description: t('description.ancillary-ratio'),
          Cell: TextWithTooltipCell,
          size: 120,
        },
      ];
      if (onOpen) {
        cols.push({
          accessorKey: 'delete',
          header: t('label.delete'),
          size: 50,
          Cell: ({ row: { original: row } }) => (
            <IconButton
              icon={<DeleteIcon fontSize="small" color="primary" />}
              label={t('label.delete')}
              onClick={e => {
                e.stopPropagation();
                deleteAncillaryItem(row.id);
              }}
            />
          ),
        });
      }
      return cols;
    },
    [onOpen, deleteAncillaryItem, t]
  );

  const table = useSimpleMaterialTable<AncillaryItemFragment>({
    tableId: 'ancillary-supplies',
    data: item.ancillaryItems,
    columns,
    onRowClick: onOpen,
    bottomToolbarContent: onOpen ? (
      <FlatButton
        label={t('label.add-ancillary-item')}
        onClick={() => onOpen()}
        startIcon={<PlusCircleIcon />}
        color="primary"
      />
    ) : undefined,
    noDataElement: <NothingHere body={t('messages.no-ancillary-items')} />,
  });

  return <MaterialTable table={table} />;
};
