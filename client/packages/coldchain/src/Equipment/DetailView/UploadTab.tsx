import React from 'react';
import { Box, Stack, useTranslation } from '@openmsupply-client/common';
import { IconButton, Typography, Upload } from '@common/components';
import { FileIcon, XCircleIcon } from '@common/icons';
import { AssetLogPanel } from '../Components';

const FileList = ({
  files,
  removeFile,
}: {
  files?: File[];
  removeFile: (filename: string) => void;
}) => {
  const t = useTranslation();
  return files === undefined ? null : (
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

export const UploadTab = ({ draft, onChange, value }: AssetLogPanel) => {
  const removeFile = (name: string) => {
    onChange({ files: draft.files?.filter(file => file.name !== name) });
  };

  const onUpload = (files: File[]) => {
    onChange({ files });
  };

  return (
    <AssetLogPanel value={value} draft={draft} onChange={onChange}>
      <Upload onUpload={onUpload} />
      <FileList files={draft.files} removeFile={removeFile} />
    </AssetLogPanel>
  );
};
