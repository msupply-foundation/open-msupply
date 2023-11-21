import React, { useState } from 'react';
import { useDialog } from '@common/hooks';
import { useTranslation } from '@common/intl';
import { BasicSpinner, DialogButton, Typography } from '@common/components';

export const WebAppLogFileModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const t = useTranslation('common');

  const { Modal } = useDialog({ isOpen });
  const [logText] = useState('asdfsdgsd');

  return (
    <Modal
      title={t('heading.server-log')}
      okButton={<DialogButton variant="ok" onClick={onClose} />}
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
