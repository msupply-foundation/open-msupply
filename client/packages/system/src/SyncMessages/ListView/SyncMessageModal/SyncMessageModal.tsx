import React from 'react';
import {
  DialogButton,
  ModalMode,
  useDialog,
  useTranslation,
} from '@openmsupply-client/common';
import { useSyncMessage } from '../../api/hooks';
import { View } from './View';
import { Create } from './Create';

interface SyncMessageModalProps {
  onClose: () => void;
  isOpen: boolean;
  mode: ModalMode | null;
  lineId?: string;
}

export const SyncMessageModal = ({
  lineId,
  onClose,
  isOpen,
  mode,
}: SyncMessageModalProps) => {
  const t = useTranslation();
  const { Modal } = useDialog({ onClose, isOpen });

  const {
    query: { data },
    create: { create, isCreating },
    draft,
    setDraft,
  } = useSyncMessage(lineId);

  const isCreate = mode === ModalMode.Create;

  const handleSaveClick = async () => {
    await create();
    onClose();
  };

  return (
    <Modal
      width={600}
      title={isCreate ? t('title.create-message') : t('title.message')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        isCreate ? (
          <DialogButton
            variant="save"
            onClick={handleSaveClick}
            disabled={isCreating}
          />
        ) : undefined
      }
    >
      {isCreate ? (
        <Create draft={draft} setDraft={setDraft} />
      ) : (
        <View data={data} />
      )}
    </Modal>
  );
};
