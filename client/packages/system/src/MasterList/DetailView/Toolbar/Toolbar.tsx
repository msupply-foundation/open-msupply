import React, { FC } from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';
import { useMasterList } from '../../api';

export const Toolbar: FC = () => {
  const t = useTranslation('catalogue');

  const { description } = useMasterList.document.fields();

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid container>
        <Grid item display="flex" flex={1} flexDirection="column" gap={1}>
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
          item
          flexDirection="column"
          alignItems="flex-end"
          display="flex"
          gap={2}
        ></Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
