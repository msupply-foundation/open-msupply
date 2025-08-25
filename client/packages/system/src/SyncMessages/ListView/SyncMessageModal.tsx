import React, { ReactElement } from 'react';
import {
  Box,
  DialogButton,
  InputWithLabelRow,
  ModalMode,
  ReadOnlyInput,
  Stack,
  TextArea,
  Typography,
  useDialog,
  useTranslation,
} from '@openmsupply-client/common';
import { useSyncMessageLine } from '../api/hooks';
import { statusMapping } from './utils';

// TODO:
// FE: Add Status and Type mapping
// BE: Add loaders for store IDs
// BE: Add Upload Status to Sync message - needs writing a migration
// FE: And Add File Handling - still brainstorming implementation

interface SyncMessageModalProps {
  onClose: () => void;
  onOpen: () => void;
  isOpen: boolean;
  mode: ModalMode | null;
  lineId?: string;
}

export const SyncMessageModal = ({
  lineId,
  onClose,
  onOpen,
  isOpen,
  mode,
}: SyncMessageModalProps): ReactElement => {
  const t = useTranslation();
  const { Modal } = useDialog({
    onClose,
    isOpen,
  });

  const {
    query: { data },
  } = useSyncMessageLine(lineId);

  const status = statusMapping(data?.status);

  return (
    <Modal
      width={600}
      title={
        mode === ModalMode.Create
          ? t('title.create-message')
          : t('title.message')
      }
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
          <Stack gap={2}>
            <InputWithLabelRow
              label={t('label.from')}
              Input={<ReadOnlyInput value={data?.fromStoreId ?? ''} />}
            />
            <InputWithLabelRow
              label={t('label.to')}
              Input={<ReadOnlyInput value={data?.toStoreId ?? ''} />}
            />
          </Stack>
          <Stack gap={2}>
            <InputWithLabelRow
              label={t('label.status')}
              Input={<ReadOnlyInput value={t(status)} />}
            />
            <InputWithLabelRow
              label={t('label.type')}
              Input={<ReadOnlyInput value={data?.type} />}
            />
          </Stack>
        </Stack>
        <Box>
          <Typography fontWeight="bold">{t('label.body')}:</Typography>
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
