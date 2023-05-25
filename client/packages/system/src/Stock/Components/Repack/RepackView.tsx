import React, { FC, useState } from 'react';
import {
  useTranslation,
  DataTable,
  Box,
  BaseButton,
} from '@openmsupply-client/common';
import { StockLineFragment, useStock } from '@openmsupply-client/system';
import { RepackFragment } from '../../api';
import { useRepackColumns } from './column';

interface RepackViewProps {
  stockLine: StockLineFragment | null;
}

export const RepackView: FC<RepackViewProps> = ({ stockLine }) => {
  const t = useTranslation('inventory');
  const { data, isError, isLoading } = useStock.repack.list(
    stockLine?.id ?? ''
  );
  const { columns } = useRepackColumns();
  const [_invoiceId, setInvoiceId] = useState<string | undefined>(undefined);
  const [_repackId, setRepackId] = useState<string | undefined>(undefined);
  const [_isNew, setIsNew] = useState<boolean>(false);

  const onRowClick = (rowData: RepackFragment) => {
    setInvoiceId(rowData.id);
    setRepackId(rowData.repackId);
    setIsNew(false);
  };

  const onNewClick = () => {
    setInvoiceId('');
    setIsNew(true);
  };

  return (
    <Box display={'flex'}>
      <Box display={'flex'} flexDirection={'column'} width={'500px'}>
        <Box paddingBottom={2}>
          <DataTable
            id="repack-list"
            columns={columns}
            data={data?.nodes}
            isLoading={isLoading}
            isError={isError}
            noDataMessage={t('messages.no-repacks')}
            overflowX="auto"
            onRowClick={onRowClick}
          />
        </Box>
        <BaseButton onClick={onNewClick}>New</BaseButton>
      </Box>
    </Box>
  );
};
