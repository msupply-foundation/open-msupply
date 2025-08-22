import React, { ReactElement } from 'react';
import {
  Box,
  DialogButton,
  InputWithLabelRow,
  ReadOnlyInput,
  Stack,
  TextArea,
  Typography,
  useDialog,
} from '@openmsupply-client/common';
import { SyncMessageRowFragment } from '../api';

interface SyncMessageModalProps {
  lineId?: string;
  onClose: () => void;
  onOpen: () => void;
  isOpen: boolean;
  // temporary props - replace with actual api single sync message call
  selectedSyncMessage?: SyncMessageRowFragment;
}

export const SyncMessageModal = ({
  lineId,
  onClose,
  onOpen,
  isOpen,
  selectedSyncMessage,
}: SyncMessageModalProps): ReactElement => {
  const { Modal } = useDialog({
    onClose,
    isOpen,
  });

  console.info('SyncMessageModal lineId:', lineId);

  return (
    <Modal
      width={600}
      title={'Sync Message Details'}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={<DialogButton variant="save" onClick={onOpen} />}
    >
      <Stack
        sx={{
          padding: 2,
          gap: 2,
        }}
      >
        <Stack flexDirection="row">
          <Box>
            <InputWithLabelRow
              label="To Store"
              Input={
                <ReadOnlyInput value={selectedSyncMessage?.toStoreId ?? ''} />
              }
            />
            <InputWithLabelRow
              label="To Store"
              Input={
                <ReadOnlyInput value={selectedSyncMessage?.fromStoreId ?? ''} />
              }
            />
          </Box>
          <Box>
            <InputWithLabelRow
              label="To Store"
              Input={<ReadOnlyInput value={selectedSyncMessage?.status} />}
            />
            <InputWithLabelRow
              label="To Store"
              Input={<ReadOnlyInput value={selectedSyncMessage?.type} />}
            />
          </Box>
        </Stack>
        <Box>
          <Typography fontWeight="bold">Body</Typography>
          <TextArea
            fullWidth
            value={selectedSyncMessage?.body ?? ''}
            slotProps={{
              input: { sx: { backgroundColor: 'background.drawer' } },
            }}
          />
        </Box>
      </Stack>
    </Modal>
  );
};
