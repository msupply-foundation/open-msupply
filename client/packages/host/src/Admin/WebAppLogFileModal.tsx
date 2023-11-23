import React, { useState } from 'react';
import { useDialog } from '@common/hooks';
import { useTranslation } from '@common/intl';
import {
  BasicSpinner,
  DialogButton,
  DropdownMenu,
  DropdownMenuItem,
  Typography,
} from '@common/components';
import { useLog } from '@openmsupply-client/system';
import { Box } from 'packages/common/src';
import { LogDisplay } from './LogDisplay';
export const WebAppLogFileModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const t = useTranslation('common');
  const [logToRender, setLogToRender] = useState('');
  const { Modal } = useDialog({ isOpen });

  const { data, isError, isLoading } = useLog.document.listFileNames();

  if (isError) {
    return (
      <Modal
        title={t('heading.server-log')}
        okButton={<DialogButton variant="ok" onClick={onClose} />}
      >
        <Box sx={{ padding: 2 }}>
          <Typography sx={{ color: 'error.main' }}>
            {t('error.unable-to-load-data')}
          </Typography>
        </Box>
      </Modal>
    );
  }
  return (
    <Modal
      title={t('heading.server-log')}
      okButton={<DialogButton variant="ok" onClick={onClose} />}
    >
      {!isLoading && data ? (
        <div>
          <DropdownMenu
            label={logToRender.length > 0 ? logToRender : t('label.server-log')}
          >
            {data.fileNames?.map((fileName, i) => (
              <DropdownMenuItem
                key={i}
                onClick={() => {
                  setLogToRender(fileName);
                }}
              >{`${fileName}`}</DropdownMenuItem>
            ))}
          </DropdownMenu>

          {logToRender.length > 0 ? (
            <LogDisplay fileName={logToRender}></LogDisplay>
          ) : null}
        </div>
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
