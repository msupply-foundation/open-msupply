import React, { FC, useState } from 'react';
import {
  useTranslation,
  DataTable,
  Box,
  BaseButton,
  DialogButton,
  Typography,
  useDialog,
  TableProvider,
  createTableStore,
  Grid,
} from '@openmsupply-client/common';
import { RepackEditForm } from './RepackEditForm';
import { Repack, useStock } from '@openmsupply-client/system';
import { RepackFragment, StockLineRowFragment } from '../../api';
import { useRepackColumns } from './column';

interface RepackModalControlProps {
  isOpen: boolean;
  onClose: () => void;
  stockLine: StockLineRowFragment | null;
}

interface UseDraftRepackControl {
  onChange: (patch: Partial<Repack>) => void;
  onInsert: () => Promise<void>;
  isLoading: boolean;
  draft?: Repack;
  isError: boolean;
}

const useDraftRepack = (seed: Repack): UseDraftRepackControl => {
  const [repack, setRepack] = useState<Repack>(() => ({ ...seed }));
  const { mutate, isLoading, isError } = useStock.repack.insert();

  const onChange = (patch: Partial<Repack>) => {
    setRepack({ ...repack, ...patch });
  };

  const onInsert = async () => mutate(repack);

  return {
    onChange,
    onInsert,
    isLoading,
    draft: repack,
    isError,
  };
};

export const RepackModal: FC<RepackModalControlProps> = ({
  isOpen,
  onClose,
  stockLine,
}) => {
  const t = useTranslation('inventory');
  const { Modal } = useDialog({ isOpen, onClose });
  const [invoiceId, setInvoiceId] = useState<string | undefined>(undefined);
  const [isNew, setIsNew] = useState<boolean>(false);

  const { data, isError, isLoading } = useStock.repack.list(
    stockLine?.id ?? ''
  );
  const { draft, onChange, onInsert } = useDraftRepack({
    stockLineId: stockLine?.id,
    newPackSize: 0,
    numberOfPacks: 0,
  });
  const { columns } = useRepackColumns();
  const displayMessage = invoiceId == undefined && !isNew;
  const showRepackDetail = invoiceId || isNew;

  const onRowClick = (rowData: RepackFragment) => {
    setInvoiceId(rowData.id);
    setIsNew(false);
  };

  const onNewClick = () => {
    setInvoiceId(undefined);
    setIsNew(true);
  };

  return (
    <Modal
      width={900}
      height={700}
      slideAnimation={false}
      title={t('title.repack-details')}
      okButton={
        <DialogButton
          variant="ok"
          disabled={draft?.newPackSize === 0 || draft?.numberOfPacks === 0}
          onClick={async () => {
            await onInsert();
            if (!isError) {
              onClose();
            }
          }}
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
    >
      <Box>
        <Grid
          container
          paddingBottom={1}
          alignItems="center"
          flexDirection="column"
        >
          <Typography sx={{ fontWeight: 'bold' }} variant="h6">
            {stockLine?.item.name}
          </Typography>
          <Typography sx={{ fontWeight: 'bold', marginBottom: 3 }}>
            {`${t('label.code')} : ${stockLine?.item.code}`}
          </Typography>
        </Grid>
        <Box display={'flex'}>
          <Box display={'flex'} flexDirection={'column'} width={'500px'}>
            <Box paddingBottom={2}>
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
            <Box display="flex" justifyContent="center">
              <BaseButton onClick={onNewClick}>{t('label.new')}</BaseButton>
            </Box>
          </Box>
          <Box paddingLeft={3} width={'400px'}>
            {displayMessage && (
              <Typography>{t('messages.no-repack-detail')}</Typography>
            )}
            {showRepackDetail && (
              <RepackEditForm
                invoiceId={invoiceId}
                onChange={onChange}
                stockLine={stockLine}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};
