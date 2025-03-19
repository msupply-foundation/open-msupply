import React from 'react';
import { useTranslation } from '@common/intl';
import {
  Box,
  FileUtils,
  IconButton,
  Link,
  Stack,
  Typography,
  useNotification,
} from '@openmsupply-client/common';
import { Capacitor } from '@capacitor/core';
import { FileIcon, XCircleIcon } from '@common/icons';
import { Environment } from '@openmsupply-client/config/src';

type SyncFile = Pick<File, 'name'> & { id?: string };

export const FileList = ({
  assetId,
  files,
  noFilesMessage,
  padding = 0,
  removeFile,
  tableName = 'asset',
}: {
  assetId: string;
  files?: SyncFile[];
  noFilesMessage?: string;
  padding?: number;
  tableName?: string;
  removeFile?: (filename: string, id?: string) => void;
}) => {
  const t = useTranslation();
  const { error } = useNotification();

  if (files === undefined || files.length === 0) {
    return noFilesMessage === undefined ? null : (
      <Typography sx={{ color: 'gray.main', paddingLeft: 2 }}>
        {noFilesMessage}
      </Typography>
    );
  }

  const isAndroid = Capacitor.getPlatform() === 'android';

  return (
    <Stack
      justifyContent="center"
      flexWrap="wrap"
      alignContent="center"
      paddingTop={4 * padding}
    >
      {files?.map((file, idx) => (
        <Box
          key={`${idx}_${file.name}`}
          display="flex"
          padding={padding}
          sx={{ width: '100%' }}
        >
          <FileIcon sx={{ stroke: theme => theme.palette.gray.main }} />
          <Typography
            sx={{ width: '100%', color: 'gray.main', paddingLeft: 1 }}
          >
            {file.id ? (
              isAndroid ? (
                <span
                  onClick={async () => {
                    try {
                      await FileUtils.openAndroidFile({
                        id: file.id as string,
                        name: file.name,
                        tableName,
                        assetId,
                      });
                    } catch (err) {
                      error(`Error: ${(err as Error).message}`)();
                    }
                  }}
                >
                  {file.name}
                </span>
              ) : (
                <Link
                  to={`${Environment.SYNC_FILES_URL}/${tableName}/${assetId}/${file.id}`}
                  target="_blank"
                >
                  {file.name}
                </Link>
              )
            ) : (
              file.name
            )}
          </Typography>
          {!!removeFile && (
            <IconButton
              onClick={() => removeFile(file.name, file.id)}
              icon={
                <XCircleIcon sx={{ fill: theme => theme.palette.gray.main }} />
              }
              label={t('button.remove-file')}
            />
          )}
        </Box>
      ))}
    </Stack>
  );
};
