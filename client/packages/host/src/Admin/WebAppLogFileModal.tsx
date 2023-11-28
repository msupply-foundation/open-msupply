import React, { useState } from 'react';
import { useDialog, useNativeClient } from '@common/hooks';
import { useTranslation } from '@common/intl';
import {
  BasicSpinner,
  DialogButton,
  DropdownMenu,
  DropdownMenuItem,
  LoadingButton,
  Typography,
} from '@common/components';
import { useLog } from '@openmsupply-client/system';
import { Box, CopyIcon } from 'packages/common/src';
import { LogTextDisplay } from './LogTextDisplay';

export const LogDisplay = ({
  fileName,
  setLogContent,
}: {
  fileName: string;
  setLogContent: (content: string[]) => void;
}) => {
  const { data, isLoading } = useLog.document.logContentsByFileName(fileName);

  if (data?.fileContent !== undefined && data?.fileContent !== null) {
    setLogContent(data?.fileContent);
  }

  if (isLoading) {
    return (
      <>
        <BasicSpinner></BasicSpinner>
      </>
    );
  } else {
    return (
      <>
        {Array.isArray(data?.fileContent) && data?.fileContent != undefined ? (
          <LogTextDisplay logText={data?.fileContent}></LogTextDisplay>
        ) : null}
      </>
    );
  }
};

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
  const { saveFile } = useNativeClient();
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: logFiles,
    isError,
    isLoading: logListLoading,
  } = useLog.document.listFileNames();

  const saveLog = async () => {
    setIsSaving(true);
    await saveFile({
      content: logContent.toString(),
      filename: 'exported_log.txt',
    });
  };

  // should add error condition for second hook

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
      copyContent={
        <LoadingButton
          isLoading={logListLoading}
          onClick={() => {
            navigator.clipboard.writeText(logContent.toString());
          }}
          startIcon={<CopyIcon />}
        />
      }
      cancelButton={
        <DialogButton
          variant="save"
          onClick={saveLog}
          disabled={!logContent || isSaving}
        />
      }
    >
      <>
        <div>
          <Typography>{logToRender}</Typography>
        </div>
        {!logListLoading ? (
          <div>
            <DropdownMenu label={t('label.server-log')}>
              {logFiles?.fileNames?.map((fileName, i) => (
                <DropdownMenuItem
                  key={i}
                  onClick={() => {
                    setLogToRender(fileName);
                  }}
                >{`${fileName}`}</DropdownMenuItem>
              ))}
            </DropdownMenu>

            <LogDisplay
              fileName={logToRender}
              setLogContent={setLogContent}
            ></LogDisplay>
          </div>
        ) : (
          <BasicSpinner />
        )}
      </>
    </Modal>
  );
};
