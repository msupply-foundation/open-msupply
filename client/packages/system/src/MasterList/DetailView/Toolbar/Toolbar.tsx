import React, { FC } from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
} from '@openmsupply-client/common';
import { useMasterListFields } from '../../api';

export const Toolbar: FC = () => {
  const t = useTranslation('catalogue');

  const { name } = useMasterListFields();

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid container>
        <Grid item display="flex" flex={1} flexDirection="column" gap={1}>
          <InputWithLabelRow
            label={t('label.master-list-name')}
            Input={
              <BufferedTextInput
                disabled={true}
                size="small"
                sx={{ width: 250 }}
                value={name}
              />
            }
          />
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
