import React, { FC } from 'react';
import { InlineProgress, Typography } from '@openmsupply-client/common';
import { ImportPanel } from './ImportPanel';
import { useTranslation } from '@common/intl';
import { Grid } from '@openmsupply-client/common';

interface ImportTabProps {
  importProgress: number;
  importErrorCount?: number;
}

export const ImportTab: FC<ImportPanel & ImportTabProps> = ({
  tab,
  importProgress,
  importErrorCount,
}) => {
  const t = useTranslation();
  return (
    <ImportPanel tab={tab}>
      <Grid
        container
        direction="column"
        justifyContent="center"
        style={{ minHeight: '50vh' }}
      >
        <Typography>
          {importErrorCount ?? 0 > 0
            ? '(' +
              t('messages.error-generic', { count: importErrorCount }) +
              ')'
            : ''}
        </Typography>
        <InlineProgress
          variant="determinate"
          color={'secondary'}
          value={importProgress}
        />
      </Grid>
    </ImportPanel>
  );
};
