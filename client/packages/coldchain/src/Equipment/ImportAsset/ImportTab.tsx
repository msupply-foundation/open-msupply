import React, { FC } from 'react';
import { InlineProgress, Typography } from '@openmsupply-client/common';
import { ImportPanel } from './ImportPanel';
import { useTranslation } from '@common/intl';
import { Grid } from '@openmsupply-client/common';

interface EquipmentImportTabProps {
  importProgress: number;
  importErrorCount?: number;
}

export const EquipmentImportTab: FC<ImportPanel & EquipmentImportTabProps> = ({
  tab,
  importProgress,
  importErrorCount,
}) => {
  const t = useTranslation('coldchain');
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
