import React, { FC } from 'react';
import {
  Box,
  ButtonWithIcon,
  DataTable,
  PlusCircleIcon,
  TableProvider,
  Typography,
  createTableStore,
  useTranslation,
} from '@openmsupply-client/common';
import { RepackFragment, StockLineRowFragment, useStock } from '../../api';
import { useRepackColumns } from './column';
import { defaultRepack } from './RepackModal';
import { RepackEditForm } from './RepackEditForm';
import { Repack } from '../../types';

interface RepackFormProps {
  draft: Repack;
  stockLine: StockLineRowFragment | null;
  setInvoiceId: (invoiceId: string | undefined) => void;
  invoiceId: string | undefined;
  onChange: (patch: Repack) => void;
  setIsNew: (isNew: boolean) => void;
  isNew: boolean;
}

export const RepackForm: FC<RepackFormProps> = ({
  draft,
  stockLine,
  setInvoiceId,
  invoiceId,
  onChange,
  setIsNew,
  isNew,
}) => {
  const t = useTranslation('inventory');
  const { data, isError, isLoading } = useStock.repack.list(
    stockLine?.id ?? ''
  );
  const { columns } = useRepackColumns();

  // only display the message if there are lines to click on
  // if there are no lines, the 'click new' message is displayed closer to the action
  const displayMessage =
    invoiceId == undefined && !isNew && !!data?.nodes.length;
  const showRepackDetail = invoiceId || isNew;

  const onRowClick = (rowData: RepackFragment) => {
    onChange(defaultRepack(stockLine?.id));
    setInvoiceId(rowData.id);
    setIsNew(false);
  };

  const onNewClick = () => {
    onChange(defaultRepack(stockLine?.id));
    setInvoiceId(undefined);
    setIsNew(true);
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="flex-end"
        paddingBottom={1}
        marginTop={-3}
      >
        <Box flex={0}>
          <ButtonWithIcon
            label={t('label.new')}
            Icon={<PlusCircleIcon />}
            onClick={onNewClick}
          />
        </Box>
      </Box>
      {displayMessage && (
        <Box flex={1} display="flex" alignItems="flex-end">
          <Typography>{t('messages.no-repack-detail')}</Typography>
        </Box>
      )}
      <Box display="flex" flexDirection="column" height={435}>
        <Box display="flex" flexDirection="column" flex={1}>
          <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
            <TableProvider createStore={createTableStore}>
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
            </TableProvider>
          </Box>
        </Box>
        <Box paddingLeft={3} paddingTop={3} flex={1}>
          {showRepackDetail && (
            <RepackEditForm
              invoiceId={invoiceId}
              onChange={onChange}
              stockLine={stockLine}
              draft={draft}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};
