import React from 'react';
import { useTranslation } from '@common/intl';
import {
  Box,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@openmsupply-client/common';
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
  if (files === undefined || files.length === 0) {
    return noFilesMessage === undefined ? null : (
      <Typography sx={{ color: 'gray.main', paddingLeft: 2 }}>
        {noFilesMessage}
      </Typography>
    );
  }

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
              <Link
                to={`${Environment.SYNC_FILES_URL}/${tableName}/${assetId}/${file.id}`}
                target="_blank"
              >
                {file.name}
              </Link>
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
