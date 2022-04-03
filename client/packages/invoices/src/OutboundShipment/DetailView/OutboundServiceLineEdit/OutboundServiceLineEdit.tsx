import React from 'react';
import {
  BasicSpinner,
  useNotification,
  ButtonWithIcon,
  Box,
  PlusCircleIcon,
  DataTable,
  useDialog,
  useTranslation,
  DialogButton,
  TableProvider,
  createTableStore,
} from '@openmsupply-client/common';
import { useOutbound } from '../../api';
import { useDraftServiceLines } from './useDraftServiceLines';
import { useServiceLineColumns } from './useServiceLineColumns';
interface OutboundServiceLineEditProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OutboundServiceLineEdit = ({
  isOpen,
  onClose,
}: OutboundServiceLineEditProps) => {
  const { error } = useNotification();
  const isDisabled = useOutbound.utils.isDisabled();
  const { Modal } = useDialog({ isOpen, onClose });
  const { lines, update, add, save, isLoading } = useDraftServiceLines();
  const columns = useServiceLineColumns(update);
  const t = useTranslation('distribution');

  return (
    <Modal
      title={t('heading.service-charges')}
      width={900}
      height={300}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            try {
              await save();
              onClose();
            } catch {
              error(t('error.failed-to-save-service-charges'))();
            }
          }}
        />
      }
    >
      {isLoading ? (
        <BasicSpinner messageKey="loading" />
      ) : (
        <Box height={300}>
          <Box
            flex={1}
            marginBottom={1}
            justifyContent="flex-end"
            display="flex"
          >
            <ButtonWithIcon
              disabled={isDisabled}
              color="primary"
              variant="outlined"
              onClick={add}
              label={`${t('label.add-charges')}`}
              Icon={<PlusCircleIcon />}
            />
          </Box>
          <TableProvider createStore={createTableStore}>
            <DataTable
              columns={columns}
              data={lines.filter(({ isDeleted }) => !isDeleted)}
              dense
            />
          </TableProvider>
        </Box>
      )}
    </Modal>
  );
};
