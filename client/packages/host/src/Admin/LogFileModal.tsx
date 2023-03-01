import React, { useEffect, useState } from 'react';

import { useDialog, useNativeClient } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { BasicSpinner, DialogButton, Typography } from '@common/components';

export const LogFileModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const t = useTranslation('common');
  const { Modal } = useDialog({ isOpen });
  const { readLog } = useNativeClient();
  const [logText, setLogText] = useState<string>('');

  useEffect(() => {
    readLog().then(setLogText);
  }, []);

  return (
    <Modal
      title={t('heading.server-log')}
      okButton={<DialogButton variant="ok" onClick={onClose} />}
      width={950}
    >
      {logText ? (
        <Typography
          sx={{ overflow: 'scroll', whiteSpace: 'pre' }}
          component="div"
        >{`${logText}`}</Typography>
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
