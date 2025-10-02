import React, { useEffect, useState } from 'react';
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
} from '@openmsupply-client/common';

import { Environment } from '@openmsupply-client/config/src';

interface StaticFile {
  id: string;
  name: string;
  path: string;
}

interface FileListProps {
  id: string;
}

export const FileList = ({ id }: FileListProps) => {
  const t = useTranslation();
  const [files, setFiles] = useState<StaticFile[]>();

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const url = `${Environment.SYNC_FILES_URL}/sync_message/${id}/list_files`;
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          credentials: 'include',
        });
        const result = await response.json();

        setFiles(result);
      } catch (error) {
        console.error('Error fetching files:', error);
      }
    };
    fetchFiles();
  }, [id]);

  return (
    <Stack>
      <Typography fontWeight="bold">{t('label.files')}:</Typography>
      <List>
        {files?.map(file => (
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
                  {file.name}
                </Link>
              }
            />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
};
