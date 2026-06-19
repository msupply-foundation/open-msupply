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
} from '@openmsupply-client/common';
import { Capacitor } from '@capacitor/core';
import {
  LogFileContent,
  useDownloadLogFile,
  useLog,
} from '@openmsupply-client/system';
import { LogTextDisplay } from './LogTextDisplay';

const formatMb = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

export const LogDisplay = ({
  fileName,
  onContentLoaded,
}: {
  fileName: string;
  onContentLoaded: (content: LogFileContent) => void;
}) => {
  const t = useTranslation();
  const {
    logContents: { data, isLoading },
  } = useLog(fileName);

  useEffect(() => {
    if (data) {
      onContentLoaded(data);
    }
  }, [data]);

  if (isLoading) {
    return <BasicSpinner />;
  }

  if (!data?.text) {
    return null;
  }

  return (
    <Box paddingTop={2}>
      {data.truncated && (
        <Typography
          component="div"
          sx={{
            fontStyle: 'italic',
            color: 'text.secondary',
            paddingBottom: 0.5,
          }}
        >
          {t('message.log-truncated', {
            shown: formatMb(data.text.length),
            total: formatMb(data.totalSize),
          })}
        </Typography>
      )}
      <LogTextDisplay logText={data.text} />
    </Box>
  );
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
  const [logContent, setLogContent] = useState<LogFileContent | undefined>();
  const { Modal } = useDialog({ isOpen, onClose });
  const downloadLogFile = useDownloadLogFile();

  const [isSaving, setIsSaving] = useState(false);
  const noLog = !logContent?.text;

  const {
    fileNames: { data, isLoading, isError },
  } = useLog();

  const isAndroid = Capacitor.isNativePlatform();

  const saveLog = async () => {
    if (!logContent?.text) {
      warning(t('message.nothing-to-save'))();
      return;
    }
    if (isSaving) {
      warning(t('message.already-saving'))();
      return;
    }
    setIsSaving(true);
    try {
      // Download the full log as a gzip archive (the viewer only holds the tail).
      await downloadLogFile(logToRender);
    } catch {
      warning(t('error.unable-to-load-server-log'))();
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(logContent?.text ?? '').then(() => {
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
                  setLogContent(undefined);
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
                    setLogContent(undefined);
                  }}
                >
                  {fileName}
                </DropdownMenuItem>
              ))}
          </DropdownMenu>

          <LogDisplay fileName={logToRender} onContentLoaded={setLogContent} />
        </>
      )}
    </Modal>
  );
};
