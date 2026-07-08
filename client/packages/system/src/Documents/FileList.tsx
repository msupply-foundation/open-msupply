import React, { useState } from 'react';
import {
  Box,
  FileUtils,
  IconButton,
  InlineSpinner,
  Link,
  Stack,
  Typography,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { Capacitor } from '@capacitor/core';
import { FileIcon, XCircleIcon } from '@common/icons';
import { Environment } from '@openmsupply-client/config';

export type SyncFile = Pick<File, 'name'> & {
  id?: string;
  /** Record the file is linked to. Falls back to `assetId` when omitted. */
  recordId?: string;
  /** Whether this file shows a delete (✕) action. Defaults to true. */
  canDelete?: boolean;
};

interface FileListProps {
  /** Fallback record id used to build download/delete URLs for files without their own `recordId`. */
  assetId: string;
  files?: SyncFile[];
  /** Optional bold heading rendered above the list (and empty state). */
  heading?: string;
  noFilesMessage?: string;
  padding?: number;
  tableName?: string;
  removeFile?: (filename: string, id?: string, recordId?: string) => void;
}

const Heading = ({ text }: { text: string }) => (
  <Typography sx={{ fontWeight: 'bold', fontSize: 20, paddingBottom: 2 }}>
    {text}
  </Typography>
);

export const FileList = ({
  assetId,
  files,
  heading,
  noFilesMessage,
  padding = 0,
  removeFile,
  tableName = 'asset',
}: FileListProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const [loadingIndex, setLoadingIndex] = useState<number>();

  if (files === undefined || files.length === 0) {
    if (noFilesMessage === undefined && heading === undefined) return null;
    return (
      <>
        {heading && <Heading text={heading} />}
        {noFilesMessage && (
          <Typography sx={{ color: 'gray.main', paddingLeft: 2 }}>
            {noFilesMessage}
          </Typography>
        )}
      </>
    );
  }

  const isAndroid = Capacitor.getPlatform() === 'android';

  return (
    <>
      {heading && <Heading text={heading} />}
      <Stack
        justifyContent="center"
        flexWrap="wrap"
        alignContent="center"
        paddingTop={4 * padding}
      >
        {files?.map((file, idx) => {
          const recordId = file.recordId ?? assetId;
          const showRemove =
            !!removeFile && file.canDelete !== false && idx !== loadingIndex;
          return (
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
                        setLoadingIndex(idx);
                        try {
                          await FileUtils.openAndroidFile({
                            id: file.id as string,
                            name: file.name,
                            tableName,
                            assetId: recordId,
                          });
                        } catch (err) {
                          error(`Error: ${(err as Error).message}`)();
                        }
                        setLoadingIndex(undefined);
                      }}
                    >
                      {file.name}
                    </span>
                  ) : (
                    <Link
                      to={`${Environment.SYNC_FILES_URL}/${tableName}/${recordId}/${file.id}`}
                      target="_blank"
                    >
                      {file.name}
                    </Link>
                  )
                ) : (
                  file.name
                )}
              </Typography>
              {showRemove && (
                <IconButton
                  onClick={() => removeFile(file.name, file.id, recordId)}
                  icon={
                    <XCircleIcon
                      sx={{ fill: theme => theme.palette.gray.main }}
                    />
                  }
                  label={t('button.remove-file')}
                />
              )}
              {idx === loadingIndex && <InlineSpinner />}
            </Box>
          );
        })}
      </Stack>
    </>
  );
};
