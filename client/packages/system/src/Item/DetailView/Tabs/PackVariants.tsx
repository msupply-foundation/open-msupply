import React, { FC } from 'react';
import { VariantFragment } from '../../api';
import {
  Box,
  DataTable,
  TableProvider,
  useColumns,
  createTableStore,
  NothingHere,
  useTranslation,
} from '@openmsupply-client/common';
import { usePackVariant } from '../../context';

const PackVariantTable: FC<{ itemId?: string }> = ({ itemId }) => {
  const { variantsControl } = usePackVariant(itemId ?? '', null);
  const t = useTranslation('catalogue');

  const columns = useColumns<VariantFragment>([
    'packSize',
    {
      key: 'abbreviation',
      label: 'label.abbreviation',
      accessor: ({ rowData }) => rowData?.shortName,
      sortable: false,
    },
    {
      key: 'longName',
      label: 'label.name',
      accessor: ({ rowData }) => rowData?.longName,
      sortable: false,
    },
  ]);

  return (
    <DataTable
      id="item-variants-detail"
      data={variantsControl?.variants ?? []}
      columns={columns}
      noDataElement={<NothingHere body={t('error.no-item-variants')} />}
    />
  );
};

interface PackVariantsTabProps {
  itemId?: string;
}

export const PackVariantsTab: FC<PackVariantsTabProps> = ({ itemId }) => {
  return (
    <Box justifyContent="center" display="flex" flex={1} paddingTop={3}>
      <Box flex={1} display="flex" style={{ maxWidth: 1000 }}>
        <TableProvider createStore={createTableStore}>
          <PackVariantTable itemId={itemId} />
        </TableProvider>
      </Box>
    </Box>
  );
};
