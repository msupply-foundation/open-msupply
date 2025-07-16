import React, { useEffect, useState } from 'react';
import { useTranslation } from '@common/intl';
import {
  BasicSpinner,
  DialogButton,
  DropdownMenu,
  DropdownMenuItem,
  Typography,
  Box,
  useDialog,
  useNotification,
  useExportLog,
} from '@openmsupply-client/common';
import { Capacitor } from '@capacitor/core';
import { useLog } from '@openmsupply-client/system';
import { LogTextDisplay } from './LogTextDisplay';

export const LogDisplay = ({
  fileName,
  logContent,
  setLogContent,
}: {
  fileName: string;
  setLogContent: (content: string[]) => void;
  logContent: string[];
}) => {
  const {
    logContents: { data, isLoading },
  } = useLog(fileName);

  useEffect(() => {
    if (!!data?.fileContent) {
      setLogContent(data.fileContent);
    }
  }, [data?.fileContent]);

  if (isLoading) {
    return <BasicSpinner />;
  }

  return !!logContent ? (
    <Box paddingTop={2} maxHeight={400}>
      <LogTextDisplay logText={logContent} />
    </Box>
  ) : null;
};

export const LogFileModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const t = useTranslation();
  const { success, warning } = useNotification();
  const [logToRender, setLogToRender] = useState('');
  const [logContent, setLogContent] = useState<string[]>([]);
  const { Modal } = useDialog({ isOpen, onClose });
  const exportLog = useExportLog();

  const [isSaving, setIsSaving] = useState(false);
  const noLog = logContent.length === 0;

  const {
    fileNames: { data, isLoading, isError },
  } = useLog();

  const isAndroid = Capacitor.isNativePlatform();

  const saveLog = async () => {
    if (noLog) {
      warning(t('message.nothing-to-save'))();
    } else if (isSaving) {
      warning(t('message.already-saving'))();
    } else {
      setIsSaving(true);
      exportLog(logContent.toString(), logToRender);
      setIsSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(logContent.toString()).then(() => {
      success(t('message.copy-success'))();
    });
  };

  if (isError || (data?.fileNames || []).length === 0) {
    return (
      <Modal
        title={t('heading.server-log')}
        okButton={<DialogButton variant="ok" onClick={onClose} />}
      >
        <Box sx={{ padding: 2 }} textAlign="center">
          <Typography>{t('error.unable-to-load-server-log')}</Typography>
        </Box>
      </Modal>
    );
  }

  return (
    <Modal
      title={t('heading.server-log')}
      okButton={<DialogButton variant="ok" onClick={onClose} />}
      width={850}
      height={700}
      copyButton={
        isAndroid ? (
          <></>
        ) : (
          <DialogButton
            variant="copy"
            onClick={
              noLog
                ? () => warning(t('message.nothing-to-copy'))()
                : copyToClipboard
            }
            color="primary"
          />
        )
      }
      saveButton={
        <DialogButton variant="save" onClick={saveLog} color="primary" />
      }
    >
      {isLoading ? (
        <BasicSpinner />
      ) : (
        <>
          <DropdownMenu
            label={logToRender ? logToRender : t('label.server-log')}
            selectSx={{ width: 400 }}
          >
            {logToRender && (
              <DropdownMenuItem
                onClick={() => {
                  setLogContent([]);
                }}
              >
                {logToRender}
              </DropdownMenuItem>
            )}
            {data?.fileNames
              ?.filter(
                fileName =>
                  fileName !== logToRender && fileName.includes('.log')
              )
              .sort()
              .map((fileName, i) => (
                <DropdownMenuItem
                  key={i}
                  onClick={() => {
                    setLogToRender(fileName);
                    setLogContent([]);
                  }}
                >
                  {fileName}
                </DropdownMenuItem>
              ))}
          </DropdownMenu>

          <LogDisplay
            fileName={logToRender}
            logContent={logContent}
            setLogContent={setLogContent}
          />
        </>
      )}
    </Modal>
  );
};
