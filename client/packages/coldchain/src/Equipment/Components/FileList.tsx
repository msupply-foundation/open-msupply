import React, { useEffect } from 'react';
import { useTranslation } from '@common/intl';
import {
  Box,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@openmsupply-client/common';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import {
  FileOpener,
  FileOpenerOptions,
} from '@capacitor-community/file-opener';
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

  console.log('files', files);

  const openAndroidFile = async () => {
    console.log('OPEN THIS FILE');
    try {
      // console.log('URI is', JSON.stringify(uriResult, null, 2));

      // Use different approaches based on platform
      if (Capacitor.getPlatform() !== 'android') {
        console.warn('This method is specifically for Android');
        return;
      }

      // Get the full URI for the file
      const uriResult = await Filesystem.getUri({
        path: 'static_files/sync_files/asset/019582e8-2da0-71ee-ba70-e2e451f8869a/01958349-95f8-7590-b420-61d05790b89b_Lorem Ipsum.pdf',
        directory: Directory.Data,
      });

      console.log('File URI', JSON.stringify(uriResult, null, 2));

      const fileOpenerOptions: FileOpenerOptions = {
        filePath: uriResult.uri,
        contentType: 'application/pdf',
        openWithDefault: true,
      };

      await FileOpener.open(fileOpenerOptions);

      console.log('File shared successfully');
    } catch (error) {
      console.error('Error opening file:', error);
      throw error;
    }
  };

  console.log('THIS IS A LOG');

  // useEffect(() => {
  //   Filesystem.readdir({
  //     directory: Directory.Data,
  //     path: 'static_files/sync_files/asset/019582e8-2da0-71ee-ba70-e2e451f8869a',
  //   })
  //     .then(result =>
  //       console.log('Files result', JSON.stringify(result, null, 2))
  //     )
  //     .catch(err => console.log('File Error:', err.message));
  //   Filesystem.writeFile({
  //     path: 'documents.txt',
  //     data: 'This is a test',
  //     directory: Directory.Documents,
  //     encoding: Encoding.UTF8,
  //   });
  //   Filesystem.writeFile({
  //     path: 'data.txt',
  //     data: 'This is a test',
  //     directory: Directory.Data,
  //     encoding: Encoding.UTF8,
  //   });
  // }, []);

  return (
    <Stack
      justifyContent="center"
      flexWrap="wrap"
      alignContent="center"
      paddingTop={4 * padding}
    >
      <div onClick={() => openAndroidFile()}>CLICK ME FOR FILE</div>
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
