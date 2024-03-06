import React, { useEffect, useState } from 'react';

import { useDialog, useNativeClient } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { BasicSpinner, DialogButton } from '@openmsupply-client/common';
import { LogTextDisplay } from './LogTextDisplay';

export const AndroidLogFileModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen });
  const { readLog, saveFile } = useNativeClient();
  const [logText, setLogText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const saveLog = async () => {
    setIsSaving(true);
    await saveFile({ content: logText, filename: 'exported_log.txt' });
    setIsSaving(false);
  };

  useEffect(() => {
    readLog().then(setLogText);
  }, []);

  return (
    <Modal
      title={t('heading.server-log')}
      okButton={<DialogButton variant="ok" onClick={onClose} />}
      cancelButton={
        <DialogButton
          variant="save"
          onClick={saveLog}
          disabled={!logText || isSaving}
        />
      }
      width={950}
    >
      {logText ? (
        <LogTextDisplay logText={logText}></LogTextDisplay>
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
