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
  const [logContent, setLogContent] = useState<string[]>([]);
  const { Modal } = useDialog({ isOpen });

  const {
    data: logFiles,
    isError,
    isLoading,
  } = useLog.document.listFileNames();

  // should add error condition for second hook also

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
      <>
        <div>
          <Typography>{logToRender}</Typography>
          <Typography>{logToRender}</Typography>
        </div>
        {!isLoading && logFiles ? (
          <div>
            <DropdownMenu label={t('label.server-log')}>
              {logFiles.fileNames?.map((fileName, i) => (
                <DropdownMenuItem
                  key={i}
                  onClick={() => {
                    setLogToRender(fileName);
                  }}
                >{`${fileName}`}</DropdownMenuItem>
              ))}
            </DropdownMenu>

            {logToRender && (
              <LogDisplay
                fileName={logToRender}
                setLogContent={setLogContent}
              ></LogDisplay>
            )}
          </div>
        ) : (
          <BasicSpinner />
        )}
      </>
    </Modal>
  );
};
