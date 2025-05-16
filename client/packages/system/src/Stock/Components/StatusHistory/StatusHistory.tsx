import React, { ReactElement, useState } from 'react';
import {
  TableProvider,
  createTableStore,
  DataTable,
  useTranslation,
  useEditModal,
  Box,
  ButtonWithIcon,
  PlusCircleIcon,
} from '@openmsupply-client/common';

import { DraftStockLine, VvmStatusLogRowFragment } from '../../api';
import { useStatusHistoryColumns } from './useStatusHistoryColumns';
import { VvmStatusLogModal } from './VvmStatusLogModal';

interface StatusHistoryProps {
  draft: DraftStockLine;
  isLoading: boolean;
}

export const StatusHistory = ({
  draft,
  isLoading,
}: StatusHistoryProps): ReactElement => {
  const t = useTranslation();
  const { columns } = useStatusHistoryColumns();
  const [selectedStatusLog, setSelectedStatusLog] =
    useState<VvmStatusLogRowFragment>();
  const { onOpen, onClose, isOpen } = useEditModal<DraftStockLine>();

  const handleAddClick = () => {
    setSelectedStatusLog(undefined);
    onOpen();
  };

  const handleRowClick = (row: VvmStatusLogRowFragment) => {
    setSelectedStatusLog(row);
    onOpen();
  };

  return (
    <TableProvider createStore={createTableStore}>
      <Box width="100%">
        <DataTable
          id="stockline-status-history"
          columns={columns}
          data={draft?.vvmStatusLogs?.nodes ?? []}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          noDataMessage={t('messages.no-status-history')}
          overflowX="auto"
        />
        <Box
          sx={{
            p: 2,
            zIndex: 2,
            position: 'sticky',
            bottom: 0,
            backgroundColor: 'background.paper',
            borderTop: theme => `1px solid ${theme.palette.divider}`,
          }}
        >
          <ButtonWithIcon
            label={t('button.add-status-entry')}
            Icon={<PlusCircleIcon />}
            onClick={handleAddClick}
          />
        </Box>
      </Box>
      {isOpen && (
        <VvmStatusLogModal
          isOpen={isOpen}
          onClose={onClose}
          stockLineId={draft.id}
          selectedStatusLog={selectedStatusLog}
        />
      )}
    </TableProvider>
  );
};
