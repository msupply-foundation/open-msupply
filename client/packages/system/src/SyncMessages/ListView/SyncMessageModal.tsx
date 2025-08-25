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
import { statusMapping, typeMapping } from './utils';

// TODO:
// BE: Add Upload Type to Sync message - needs writing a migration
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
  const type = typeMapping(data?.type);

  return (
    <Modal
      width={600}
      title={
        mode === ModalMode.Create
          ? t('title.create-message')
          : t('title.message')
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton variant="save" onClick={onOpen} disabled={true} /> // Remove disable once update mutation is implemented
      }
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
              Input={<ReadOnlyInput value={data?.fromStore?.storeName ?? ''} />}
            />
            <InputWithLabelRow
              label={t('label.to')}
              Input={<ReadOnlyInput value={data?.toStore?.storeName ?? ''} />}
            />
          </Stack>
          <Stack gap={2}>
            <InputWithLabelRow
              label={t('label.status')}
              Input={<ReadOnlyInput value={t(status)} />}
            />
            <InputWithLabelRow
              label={t('label.type')}
              Input={<ReadOnlyInput value={t(type)} />}
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
