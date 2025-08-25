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
import { useSyncMessageLine } from '../api/hooks';

interface SyncMessageModalProps {
  lineId?: string;
  onClose: () => void;
  onOpen: () => void;
  isOpen: boolean;
}

export const SyncMessageModal = ({
  lineId,
  onClose,
  onOpen,
  isOpen,
}: SyncMessageModalProps): ReactElement => {
  const { Modal } = useDialog({
    onClose,
    isOpen,
  });

  const {
    query: { data },
  } = useSyncMessageLine(lineId);

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
              Input={<ReadOnlyInput value={data?.toStoreId ?? ''} />}
            />
            <InputWithLabelRow
              label="To Store"
              Input={<ReadOnlyInput value={data?.fromStoreId ?? ''} />}
            />
          </Box>
          <Box>
            <InputWithLabelRow
              label="To Store"
              Input={<ReadOnlyInput value={data?.status} />}
            />
            <InputWithLabelRow
              label="To Store"
              Input={<ReadOnlyInput value={data?.type} />}
            />
          </Box>
        </Stack>
        <Box>
          <Typography fontWeight="bold">Body</Typography>
          <TextArea
            fullWidth
            value={data?.body ?? ''}
            slotProps={{
              input: { sx: { backgroundColor: 'background.drawer' } },
            }}
          />
        </Box>
      </Stack>
    </Modal>
  );
};
