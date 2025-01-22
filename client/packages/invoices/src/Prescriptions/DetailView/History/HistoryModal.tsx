import React from 'react';
import {
  Grid,
  useDialog,
  Box,
  useTranslation,
  ModalMode,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  useKeyboardHeightAdjustment,
  DataTable,
} from '@openmsupply-client/common';
import { Draft } from '../../..';

import { useHistoryColumns } from './columns';

interface HistoryModalModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: Draft | null;
  mode: ModalMode | null;
}

export const HistoryModal: React.FC<HistoryModalModalProps> = ({
  isOpen,
  onClose,
}) => {
  const columns = useHistoryColumns();
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(700);

  return (
    <Modal title={t('heading.history')} height={height} width={1000}>
      <Grid container gap={0.5}>
        <Box
          style={{
            maxHeight: 300,
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
            overflowY: 'auto',
          }}
        >
          <TableProvider
            createStore={createTableStore}
            queryParamsStore={createQueryParamsStore({
              initialSortBy: { key: 'expiryDate' },
            })}
          >
            <DataTable
              id="prescription-line-edit"
              columns={columns}
              data={[]}
              dense
            />
          </TableProvider>
        </Box>
      </Grid>
    </Modal>
  );
};
