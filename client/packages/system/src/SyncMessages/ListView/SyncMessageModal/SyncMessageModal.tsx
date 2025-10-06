import React, { ReactElement } from 'react';
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
}: SyncMessageModalProps): ReactElement => {
  const t = useTranslation();
  const { Modal } = useDialog({
    onClose,
    isOpen,
  });

  const {
    query: { data },
    create: { create },
    draft,
    setDraft,
  } = useSyncMessage(lineId);

  const handleSaveClick = async () => {
    await create();
    onClose();
  };

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
        <DialogButton
          variant="save"
          onClick={handleSaveClick}
          disabled={mode === ModalMode.Update}
        />
      }
    >
      {mode === ModalMode.Create ? (
        <Create t={t} draft={draft} setDraft={setDraft} />
      ) : (
        <View t={t} data={data} />
      )}
    </Modal>
  );
};
