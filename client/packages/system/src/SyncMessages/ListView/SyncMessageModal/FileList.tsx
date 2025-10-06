import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
  FileIcon,
  Stack,
  Typography,
  useTranslation,
  SyncMessageNodeStatus,
  SyncFileReferenceNode,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config/src';

interface FileListProps {
  id: string;
  status: SyncMessageNodeStatus;
}

export const FileList = ({ id, status }: FileListProps) => {
  const t = useTranslation();
  const files: SyncFileReferenceNode[] = [];

  return (
    <Stack>
      <Typography fontWeight="bold">{t('label.files')}:</Typography>
      <List>
        {files && files.length > 0 ? (
          files.map(file => (
            <ListItem
              key={file.id}
              sx={{
                mb: 0.5,
                borderRadius: 1,
                transition: 'background 0.2s',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemIcon>
                <FileIcon />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Link
                    to={`${Environment.SYNC_FILES_URL}/sync_message/${id}/${file.id}`}
                    target="_blank"
                  >
                    {file.fileName}
                  </Link>
                }
              />
            </ListItem>
          ))
        ) : status === SyncMessageNodeStatus.New ? (
          <Typography fontStyle="italic">
            {t('label.processing-files')}
          </Typography>
        ) : (
          <Typography>{t('label.no-files-found')}</Typography>
        )}
      </List>
    </Stack>
  );
};
