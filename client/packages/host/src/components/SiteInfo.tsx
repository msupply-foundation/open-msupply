import React, { FC } from 'react';
import {
  frontEndHostUrl,
  Grid,
  IconButton,
  NativeMode,
  Typography,
  useNativeClient,
} from '@openmsupply-client/common';
import { EditIcon } from '@common/icons';
import { useTranslation } from '@common/intl';

const RowWithLabel = ({
  label,
  contents,
}: {
  label: string;
  contents: React.ReactNode;
}) => (
  <Grid item display="flex" flex={1} gap={1} justifyContent="flex-end">
    <Grid item justifyContent="flex-end" flex={0} display="flex">
      <Typography fontWeight={700}>{label}</Typography>
    </Grid>
    <Grid item flex={0} display="flex">
      {contents}
    </Grid>
  </Grid>
);

export const SiteInfo: FC<{ siteName?: string | null }> = ({ siteName }) => {
  const { connectedServer, goBackToDiscovery, mode } = useNativeClient();
  const t = useTranslation();
  if (!connectedServer) return null;

  return (
    <>
      {siteName && (
        <RowWithLabel
          label={t('label.site')}
          contents={<Typography whiteSpace="nowrap">{siteName}</Typography>}
        />
      )}
      {mode === NativeMode.Client && (
        <RowWithLabel
          label={`${t('label.server')}:`}
          contents={
            <>
              <Typography whiteSpace="nowrap">
                {frontEndHostUrl(connectedServer)}
              </Typography>
              <IconButton
                label={t('messages.change-server')}
                icon={<EditIcon style={{ height: 16, width: 16 }} />}
                onClick={() => goBackToDiscovery()}
              />
            </>
          }
        />
      )}
    </>
  );
};
