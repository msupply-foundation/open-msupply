import React from 'react';

import {
  DataTable,
  useColumns,
  TooltipTextCell,
  TableProvider,
  createTableStore,
  FlatButton,
  useTranslation,
  PlusCircleIcon,
  useEditModal,
  IconButton,
  DeleteIcon,
} from '@openmsupply-client/common';
import {
  BundledItemFragment,
  ItemVariantFragment,
  useDeleteBundledItem,
} from '../../../api';
import { BundledItemModal } from './BundledItemModal';

export const BundledItemVariants = ({
  data,
  variant,
}: {
  data: BundledItemFragment[];
  variant: ItemVariantFragment;
}) => {
  const t = useTranslation();

  const { isOpen, onClose, onOpen, entity } =
    useEditModal<BundledItemFragment>();

  const deleteBundledItem = useDeleteBundledItem({ itemId: variant.itemId });

  const columns = useColumns<BundledItemFragment>([
    {
      key: 'name',
      Cell: TooltipTextCell,
      label: 'label.item-variant',
      accessor: ({ rowData }) =>
        `${rowData.bundledItemVariant?.itemName} - ${rowData.bundledItemVariant?.name}`,
    },
    {
      key: 'ratio',
      Cell: TooltipTextCell,
      label: 'label.ratio',
      description: 'description.bundle-ratio',
    },
    {
      key: 'delete',
      width: 50,
      Cell: props => (
        <IconButton
          icon={<DeleteIcon fontSize="small" color="primary" />}
          label={t('label.delete')}
          onClick={e => {
            e.stopPropagation();
            deleteBundledItem(props.rowData.id);
          }}
        />
      ),
    },
  ]);

  return (
    <TableProvider createStore={createTableStore}>
      {isOpen && (
        <BundledItemModal onClose={onClose} bundle={entity} variant={variant} />
      )}
      <DataTable
        id="bundled-item-variants"
        data={data}
        columns={columns}
        onRowClick={row => onOpen(row)}
        noDataMessage={t('messages.no-bundled-items')}
        dense
      />
      <FlatButton
        label={t('label.add-bundled-item')}
        onClick={() => onOpen()}
        startIcon={<PlusCircleIcon />}
        color="primary"
      />
    </TableProvider>
  );
};
