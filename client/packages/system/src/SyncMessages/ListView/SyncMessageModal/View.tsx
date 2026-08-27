import React from 'react';
import {
  Alert,
  Box,
  InputWithLabelRow,
  ReadOnlyInput,
  Stack,
  SyncMessageNodeStatus,
  SyncMessageNodeType,
  TextArea,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { SyncMessageRowFragment } from '../../api';
import { statusMapping, typeMapping } from '../utils';
import { FileList } from './FileList';

interface ViewProps {
  data?: SyncMessageRowFragment;
}

export const View = ({ data }: ViewProps) => {
  const t = useTranslation();

  return (
    <Stack sx={{ padding: 2, gap: 2 }}>
      <Stack flexDirection="row">
        <Stack gap={2}>
          <InputWithLabelRow
            label={t('label.from')}
            Input={<ReadOnlyInput value={data?.fromStore?.storeName ?? ''} />}
          />
          <InputWithLabelRow
            label={t('label.to')}
            Input={<ReadOnlyInput value={data?.toStore?.storeName ?? ''} />}
          />
        </Stack>
        <Stack gap={2}>
          <InputWithLabelRow
            label={t('label.status')}
            Input={<ReadOnlyInput value={t(statusMapping(data?.status))} />}
          />
          <InputWithLabelRow
            label={t('label.type')}
            Input={<ReadOnlyInput value={t(typeMapping(data?.type))} />}
          />
        </Stack>
      </Stack>
      <Box>
        <Typography fontWeight="bold">
          {t('label.sync-message-body')}:
        </Typography>
        <TextArea
          fullWidth
          value={data?.body ?? ''}
          slotProps={{
            input: { sx: { backgroundColor: 'background.drawer' } },
          }}
          disabled
        />
      </Box>
      {data?.status === SyncMessageNodeStatus.Error && data?.errorMessage && (
        <Alert severity="error">{data.errorMessage}</Alert>
      )}
      {data?.type === SyncMessageNodeType.SupportUpload &&
        (data?.files?.nodes?.length ?? 0) > 0 && (
          <FileList
            files={data?.files?.nodes ?? []}
            syncMessageId={data?.id ?? ''}
          />
        )}
    </Stack>
  );
};
