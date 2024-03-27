import React from 'react';
import { useTranslation } from '@common/intl';
import { Box, IconButton, Stack, Typography } from '@openmsupply-client/common';
import { FileIcon, XCircleIcon } from '@common/icons';

export const FileList = ({
  files,
  noFilesMessage,
  removeFile,
}: {
  files?: File[];
  noFilesMessage?: string;
  removeFile: (filename: string) => void;
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
      paddingTop={2}
    >
      {files?.map(file => (
        <Box key={file.name} display="flex" padding={2}>
          <FileIcon sx={{ stroke: theme => theme.palette.gray.main }} />
          <Typography
            sx={{ width: '300px', color: 'gray.main', paddingLeft: 1 }}
          >
            {file.name}
          </Typography>
          <IconButton
            onClick={() => removeFile(file.name)}
            icon={
              <XCircleIcon sx={{ fill: theme => theme.palette.gray.main }} />
            }
            label={t('button.remove-file')}
          />
        </Box>
      ))}
    </Stack>
  );
};
