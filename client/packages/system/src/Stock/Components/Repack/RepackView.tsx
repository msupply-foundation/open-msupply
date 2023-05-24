import React, { FC } from 'react';
import { useTranslation, DataTable, Box } from '@openmsupply-client/common';
import { useStock } from '@openmsupply-client/system';
import { useRepackColumns } from './column';

export const RepackView: FC<{ recordId: string }> = ({ recordId }) => {
  const t = useTranslation('inventory');
  const { data, isError, isLoading } = useStock.repack.list(recordId);
  const { columns } = useRepackColumns();

  return (
    <Box display={'flex'}>
      <Box width={'600px'}>
        <DataTable
          id="repack-list"
          columns={columns}
          data={data?.nodes}
          isLoading={isLoading}
          isError={isError}
          noDataMessage={t('messages.no-repacks')}
          overflowX="auto"
        />
      </Box>
    </Box>
  );
};
