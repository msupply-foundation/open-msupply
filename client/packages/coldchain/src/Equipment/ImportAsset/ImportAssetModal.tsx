import React from 'react';
import {
  useNotification,
  useDialog,
  useTranslation,
  DialogButton,
  TabContext,
  useTabs,
} from '@openmsupply-client/common';
import { UploadTab } from './UploadTab';

interface ImportAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

enum Tabs {
  Upload = 'Upload',
}

export const ImportAssetModal = ({
  isOpen,
  onClose,
}: ImportAssetModalProps) => {
  const { currentTab } = useTabs(Tabs.Upload);
  const t = useTranslation('coldchain');
  const { error } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose });

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      title={t('heading.import-cold-chain-equipment')}
      width={700}
      height={100}
      cancelButton={<DialogButton variant="cancel" onClick={handleClose} />}
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            try {
              console.info('clicked');
            } catch (e) {
              error('error');
            }
          }}
        />
      }
    >
      <TabContext value={currentTab}>
        <UploadTab />
      </TabContext>
    </Modal>
  );
};
