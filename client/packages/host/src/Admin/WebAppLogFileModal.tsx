import React, { useEffect, useState } from 'react';
import { useDialog, useNotification, useWebClient } from '@common/hooks';
import { useTranslation } from '@common/intl';
import {
  BasicSpinner,
  DialogButton,
  DropdownMenu,
  DropdownMenuItem,
  Typography,
  Box,
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
    if (fileName) {
      mutateAsync(fileName);
    }
  }, [fileName]);

  useEffect(() => {
    if (!!data?.fileContent) {
      setLogContent(data.fileContent);
    }
  }, [data]);

  return isLoading ? (
    <BasicSpinner />
  ) : (
    <>
      {!!data?.fileContent ? (
        <Box paddingTop={2} maxHeight={400}>
          <LogTextDisplay logText={data?.fileContent}></LogTextDisplay>
        </Box>
      ) : null}
    </>
  );
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

  if (isError) {
    return (
      <Modal
        title={t('heading.server-log')}
        okButton={<DialogButton variant="ok" onClick={onClose} />}
      >
        <Box sx={{ padding: 2 }} textAlign="center">
          <Typography>{t('error.unable-to-server-log')}</Typography>
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
      {!isLoading ? (
        <>
          <DropdownMenu
            label={logToRender ? logToRender : t('label.server-log')}
          >
            {data?.fileNames?.map((fileName, i) => (
              <DropdownMenuItem
                key={i}
                onClick={() => {
                  setLogToRender(fileName);
                }}
              >{`${fileName}`}</DropdownMenuItem>
            ))}
          </DropdownMenu>

          <LogDisplay fileName={logToRender} setLogContent={setLogContent} />
        </>
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
