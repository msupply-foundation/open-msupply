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
} from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config/src';
import { SyncMessageRowFragment } from '../../api';

interface FileListProps {
  data: SyncMessageRowFragment;
}

export const FileList = ({ data }: FileListProps) => {
  const t = useTranslation();

  return (
    <Stack>
      <Typography fontWeight="bold">{t('label.files')}:</Typography>
      <List>
        {data?.files?.nodes && data?.files?.nodes.length > 0 ? (
          data?.files?.nodes.map(file => (
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
                    to={`${Environment.SYNC_FILES_URL}/sync_message/${data?.id}/${file.id}`}
                    target="_blank"
                  >
                    {file.fileName}
                  </Link>
                }
              />
            </ListItem>
          ))
        ) : data?.status === SyncMessageNodeStatus.New ? (
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
