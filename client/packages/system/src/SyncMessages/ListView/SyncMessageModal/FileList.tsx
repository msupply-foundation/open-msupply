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
  SyncFileReferenceNodeStatus,
  Chip,
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config/src';
import { SyncFileReferenceFragment } from '@openmsupply-client/system';

interface FileListProps {
  files: SyncFileReferenceFragment[];
  syncMessageId: string;
}

export const FileList = ({ files, syncMessageId }: FileListProps) => {
  const t = useTranslation();

  const getStatusColor = (status: SyncFileReferenceNodeStatus) => {
    switch (status) {
      case SyncFileReferenceNodeStatus.Done:
        return 'success';
      case SyncFileReferenceNodeStatus.Error:
      case SyncFileReferenceNodeStatus.PermanentFailure:
        return 'error';
      case SyncFileReferenceNodeStatus.InProgress:
        return 'info';
      case SyncFileReferenceNodeStatus.New:
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: SyncFileReferenceNodeStatus) => {
    switch (status) {
      case SyncFileReferenceNodeStatus.Done:
        return t('label.done');
      case SyncFileReferenceNodeStatus.Error:
        return t('label.error');
      case SyncFileReferenceNodeStatus.PermanentFailure:
        return t('label.permanent-failure');
      case SyncFileReferenceNodeStatus.InProgress:
        return t('label.in-progress');
      case SyncFileReferenceNodeStatus.New:
        return t('label.new');
      default:
        return status;
    }
  };

  return (
    <Stack>
      <Typography fontWeight="bold">{t('label.files')}:</Typography>
      <List>
        {files.length > 0 ? (
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
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Link
                      to={`${Environment.SYNC_FILES_URL}/sync_message/${syncMessageId}/${file.id}`}
                      target="_blank"
                    >
                      {file.fileName}
                    </Link>
                    <Chip
                      label={getStatusLabel(file.status)}
                      color={getStatusColor(file.status)}
                      size="small"
                    />
                  </Stack>
                }
                secondary={
                  file.error ? (
                    <Typography variant="caption" color="error.main">
                      {file.error}
                    </Typography>
                  ) : null
                }
              />
            </ListItem>
          ))
        ) : (
          <Typography>{t('label.no-files-found')}</Typography>
        )}
      </List>
    </Stack>
  );
};
