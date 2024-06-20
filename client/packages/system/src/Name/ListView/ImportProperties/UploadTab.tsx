import { InlineProgress, Typography, Upload } from '@common/components';
import { ImportPanel } from './ImportPanel';
import { useTranslation } from '@common/intl';
import { Grid, Stack, Link, FileUtils } from 'packages/common/src';

import React, { FC, useState } from 'react';
import { ImportRow } from './PropertiesImportModal';
import { importFacilitiesPropertiesToCsv } from '../utils';
import { NameRowFragment } from '../../api';

interface UploadTabProps {
  setErrorMessage: (value: React.SetStateAction<string>) => void;
  setWarningMessage: (value: React.SetStateAction<string>) => void;
  facilities: NameRowFragment[] | undefined;
}

export const UploadTab: FC<ImportPanel & UploadTabProps> = ({
  tab,
  facilities,
}) => {
  const t = useTranslation();

  const csvExample = async () => {
    const facilityRows: ImportRow[] = facilities
      ? facilities.map(facilityNode => {
          return {
            code: facilityNode.code,
            name: facilityNode.name,
          };
        })
      : [];
    const csv = importFacilitiesPropertiesToCsv(
      facilityRows.map(
        (row: ImportRow): Partial<ImportRow> => ({
          code: row.code,
          name: row.name,
        })
      ),
      t
    );
    FileUtils.exportCSV(csv, t('filename.facilities-properties'));
  };

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
          <Link onClick={csvExample} to={''}>
            {t('heading.download-example')}
          </Link>
        </Typography>
      </Stack>
    </ImportPanel>
  );
};
