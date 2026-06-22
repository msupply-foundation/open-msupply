import React, { useEffect, useState } from 'react';
import {
  Box,
  Checkbox,
  Select,
  Stack,
  SyncMessageNodeType,
  TextArea,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { StoreSearchInput } from '@openmsupply-client/system/src/Store';
import { DraftSyncMessage } from '../../api/hooks/useSyncMessage';
import { typeMapping } from '../utils';

interface CreateProps {
  draft: DraftSyncMessage;
  setDraft: (input: DraftSyncMessage) => void;
}

export const Create = ({ draft, setDraft }: CreateProps) => {
  const t = useTranslation();
  const isSupportUpload = draft.type === SyncMessageNodeType.SupportUpload;

  const [selectedFiles, setSelectedFiles] = useState({
    logs: false,
    database: false,
  });

  useEffect(() => {
    const body = isSupportUpload ? JSON.stringify(selectedFiles) : '';
    setDraft({ ...draft, body });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiles, draft.type]);

  return (
    <Stack sx={{ padding: 2, gap: 2 }}>
      <Box>
        <Typography fontWeight="bold">{t('label.to-store')}:</Typography>
        <StoreSearchInput
          value={draft.toStore ?? undefined}
          onChange={store => setDraft({ ...draft, toStore: store })}
          onInputChange={() => {}}
        />
      </Box>

      <Box>
        <Typography fontWeight="bold">{t('label.type')}:</Typography>
        <Select
          fullWidth
          value={draft.type}
          onChange={event =>
            setDraft({
              ...draft,
              type: event.target.value as SyncMessageNodeType,
            })
          }
          // Remove filter once other types have functionalities e.g. processor to process data passed
          options={Object.values(SyncMessageNodeType)
            .filter(type => type === SyncMessageNodeType.SupportUpload)
            .map(type => ({ value: type, label: t(typeMapping(type)) }))}
        />
      </Box>

      <Stack flexDirection="column">
        <Typography fontWeight="bold">{t('label.include')}:</Typography>
        <Stack flexDirection="row" alignItems="center">
          <Checkbox
            disabled={!isSupportUpload}
            onChange={() =>
              setSelectedFiles(prev => ({ ...prev, logs: !prev.logs }))
            }
          />
          <Typography color={isSupportUpload ? 'textPrimary' : 'textDisabled'}>
            {t('label.logs')}
          </Typography>
        </Stack>
        <Stack flexDirection="row" alignItems="center">
          <Checkbox
            disabled={!isSupportUpload}
            onChange={() =>
              setSelectedFiles(prev => ({ ...prev, database: !prev.database }))
            }
          />
          <Typography color={isSupportUpload ? 'textPrimary' : 'textDisabled'}>
            {t('label.database-sqlite')}
          </Typography>
        </Stack>
      </Stack>

      <Box>
        <Typography fontWeight="bold">
          {t('label.sync-message-body')}:
        </Typography>
        <TextArea
          fullWidth
          value={draft.body}
          disabled={isSupportUpload}
          onChange={event => setDraft({ ...draft, body: event.target.value })}
          slotProps={{
            input: { sx: { backgroundColor: 'background.drawer' } },
          }}
        />
      </Box>
    </Stack>
  );
};
