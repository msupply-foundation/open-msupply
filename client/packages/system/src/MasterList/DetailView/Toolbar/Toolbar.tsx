import React from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';

export const Toolbar = ({ description }: { description: string }) => {
  const t = useTranslation();

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid container>
        <Grid display="flex" flex={1} flexDirection="column" gap={1}>
          {description && (
            <InputWithLabelRow
              label={t('heading.description')}
              Input={
                <BufferedTextInput
                  disabled={true}
                  size="small"
                  sx={{ width: 250 }}
                  value={description}
                />
              }
            />
          )}
        </Grid>
        <Grid
          flexDirection="column"
          alignItems="flex-end"
          display="flex"
          gap={2}
        ></Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
