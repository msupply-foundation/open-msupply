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
  useWebClient,
} from '@openmsupply-client/common';
import { useLog } from '@openmsupply-client/system';
import { LogTextDisplay } from './LogTextDisplay';

export const LogDisplay = ({
  fileName,
  setLogContent,
}: {
  fileName: string;
  setLogContent: (content: string[]) => void;
}) => {
  const { mutateAsync, data, isLoading } =
    useLog.document.logContentsByFileName();

  useEffect(() => {
    if (!!fileName) {
      mutateAsync(fileName);
    }
  }, [fileName]);

  useEffect(() => {
    if (!!data?.fileContent) {
      setLogContent(data.fileContent);
    }
  }, [data]);

  if (isLoading) {
    return <BasicSpinner />;
  }

  return !!data?.fileContent ? (
    <Box paddingTop={2} maxHeight={400}>
      <LogTextDisplay logText={data?.fileContent} />
    </Box>
  ) : null;
};

export const WebAppLogFileModal = ({
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
  const { Modal } = useDialog({ isOpen });
  const { saveFile } = useWebClient();
  const [isSaving, setIsSaving] = useState(false);
  const noLog = logContent.length === 0;

  const { data, isError, isLoading } = useLog.document.listFileNames();

  const saveLog = async () => {
    if (noLog) {
      warning(t('message.nothing-to-save'))();
    } else if (isSaving) {
      warning(t('message.already-saving'))();
    } else {
      setIsSaving(true);
      saveFile({
        content: logContent.toString(),
        filename: logToRender,
      });
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
        <DialogButton
          variant="copy"
          onClick={
            noLog
              ? () => warning(t('message.nothing-to-copy'))()
              : copyToClipboard
          }
          color="primary"
        />
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
              ?.filter(fileName => fileName !== logToRender)
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

          <LogDisplay fileName={logToRender} setLogContent={setLogContent} />
        </>
      )}
    </Modal>
  );
};
