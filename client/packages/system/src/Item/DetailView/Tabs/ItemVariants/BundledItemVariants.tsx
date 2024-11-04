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
} from '@openmsupply-client/common';
import { BundledItemFragment } from '../../../api';

export const BundledItemVariants = ({
  data,
}: {
  data: BundledItemFragment[];
}) => {
  const t = useTranslation();

  const { isOpen, onClose, onOpen, entity } =
    useEditModal<BundledItemFragment>();

  const columns = useColumns<BundledItemFragment>([
    {
      key: 'name',
      Cell: TooltipTextCell,
      label: 'label.item-variant',
    },
    {
      key: 'ratio',
      Cell: TooltipTextCell,
      label: 'label.ratio',
      description: 'description.bundle-ratio',
    },
  ]);

  console.log(entity);

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        id="bundled-item-variants"
        data={data}
        columns={columns}
        onRowClick={row => onOpen(row)}
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
