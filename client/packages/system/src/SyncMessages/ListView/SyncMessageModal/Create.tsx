import React, { useEffect, useState } from 'react';
import {
  Box,
  Checkbox,
  DropdownMenu,
  DropdownMenuItem,
  LocaleKey,
  Stack,
  SyncMessageNodeType,
  TextArea,
  TypedTFunction,
  Typography,
} from '@openmsupply-client/common';
import { StoreSearchInput } from '@openmsupply-client/system/src/Store';
import { SyncMessageRowFragment } from '../../api';
import { typeMapping } from '../utils';

interface CreateProps {
  t: TypedTFunction<LocaleKey>;
  draft: SyncMessageRowFragment;
  setDraft: (input: SyncMessageRowFragment) => void;
}

export const Create = ({ t, draft, setDraft }: CreateProps) => {
  const syncMessageTypes = Object.values(SyncMessageNodeType);

  const [selectedFiles, setSelectedFiles] = useState({
    logs: false,
    database: false,
  });

  useEffect(() => {
    const body =
      draft?.type === SyncMessageNodeType.SupportUpload
        ? JSON.stringify({
            logs: selectedFiles.logs,
            database: selectedFiles.database,
          })
        : '';

    setDraft({
      ...draft,
      body,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiles, draft?.type]);

  return (
    <Stack
      sx={{
        padding: 2,
        gap: 2,
      }}
    >
      <Box>
        <Typography fontWeight="bold">{t('label.to-store')}:</Typography>
        <StoreSearchInput
          value={draft?.toStore ?? undefined}
          onChange={store =>
            setDraft({
              ...draft,
              toStore: store,
            })
          }
          onInputChange={() => {}}
        />
      </Box>
      <Box>
        <Typography fontWeight="bold">{t('label.type')}:</Typography>
        <DropdownMenu
          sx={{
            width: '100%',
            '& .MuiInputBase-root': {
              backgroundColor: 'background.drawer',
            },
            '& .MuiFormLabel-root': {
              color: 'gray.dark',
            },
          }}
          selectSx={{ width: '100%' }}
          label={t(typeMapping(draft?.type))}
        >
          {syncMessageTypes
            // Remove filter once other types have functionalities e.g. processor to process data passed
            .filter(type => type === SyncMessageNodeType.SupportUpload)
            .map(
              (type, index) =>
                type && (
                  <DropdownMenuItem
                    key={index}
                    value={type}
                    sx={{ fontSize: 14 }}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        type,
                      })
                    }
                  >
                    {t(typeMapping(type))}
                  </DropdownMenuItem>
                )
            )}
        </DropdownMenu>
      </Box>
      <Stack flexDirection="column">
        <Typography fontWeight="bold">{t('label.include')}:</Typography>
        <Stack flexDirection="row" alignItems="center">
          <Checkbox
            disabled={draft?.type !== SyncMessageNodeType.SupportUpload}
            onChange={() =>
              setSelectedFiles({
                ...selectedFiles,
                logs: !selectedFiles.logs,
              })
            }
          />
          <Typography
            color={
              draft?.type !== SyncMessageNodeType.SupportUpload
                ? 'textDisabled'
                : 'textPrimary'
            }
          >
            {t('label.logs')}
          </Typography>
        </Stack>
        <Stack flexDirection="row" alignItems="center">
          <Checkbox
            disabled={draft?.type !== SyncMessageNodeType.SupportUpload}
            onChange={() =>
              setSelectedFiles({
                ...selectedFiles,
                database: !selectedFiles.database,
              })
            }
          />
          <Typography
            color={
              draft?.type !== SyncMessageNodeType.SupportUpload
                ? 'textDisabled'
                : 'textPrimary'
            }
          >
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
          value={draft?.body}
          disabled={draft?.type === SyncMessageNodeType.SupportUpload}
          onChange={event => {
            setDraft({
              ...draft,
              body: event.target.value,
            });
          }}
          slotProps={{
            input: { sx: { backgroundColor: 'background.drawer' } },
          }}
        />
      </Box>
    </Stack>
  );
};
