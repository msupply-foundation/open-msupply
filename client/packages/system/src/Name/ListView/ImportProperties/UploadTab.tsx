import { InlineProgress, Typography, Upload } from '@common/components';
import { ImportPanel } from './ImportPanel';
import { useTranslation } from '@common/intl';
import { Grid, Stack, Link } from 'packages/common/src';

import React, { FC, useState } from 'react';

interface UploadTabProps {
  setErrorMessage: (value: React.SetStateAction<string>) => void;
  setWarningMessage: (value: React.SetStateAction<string>) => void;
}

export const UploadTab: FC<ImportPanel & UploadTabProps> = ({ tab }) => {
  const t = useTranslation('coldchain');

  const [isLoading] = useState(false);

  return (
    <ImportPanel tab={tab}>
      {isLoading ? (
        <Grid
          container
          direction="column"
          justifyContent="center"
          style={{ minHeight: '75vh' }}
        >
          <InlineProgress variant={'indeterminate'} color={'secondary'} />
        </Grid>
      ) : null}
      <Stack spacing={2}>
        <Upload onUpload={() => {}} />
        <Typography textAlign="center">
          {t('messages.template-download-text')}
          <Link onClick={() => {}} to={''}>
            {t('heading.download-example')}
          </Link>
        </Typography>
      </Stack>
    </ImportPanel>
  );
};
