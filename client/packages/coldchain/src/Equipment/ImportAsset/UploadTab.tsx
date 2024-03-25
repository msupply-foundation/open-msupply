import React, { FC, useState } from 'react';
import Papa from 'papaparse';
import { ImportPanel } from './ImportPanel';
import { useNotification } from '@common/hooks';
import { InlineProgress, Typography, Upload } from '@common/components';
import { useTranslation } from '@common/intl';
import {
  Grid,
  Stack,
  Paper,
  Link,
  FnUtils,
  FileUtils,
  InsertAssetInput,
} from '@openmsupply-client/common';
import * as EquipmentImportModal from './EquipmentImportModal';
import { ImportRow, toInsertEquipmentInput } from './EquipmentImportModal';
import { importEquipmentToCsv } from '../utils';
import { AssetCatalogueItemFragment } from '@openmsupply-client/system';
interface EquipmentUploadTabProps {
  setEquipment: React.Dispatch<React.SetStateAction<ImportRow[]>>;
  setErrorMessage: (value: React.SetStateAction<string>) => void;
  onUploadComplete: () => void;
  catalogueItemData?: AssetCatalogueItemFragment[];
}

export const EquipmentUploadTab: FC<ImportPanel & EquipmentUploadTabProps> = ({
  tab,
  setErrorMessage,
  setEquipment,
  onUploadComplete,
  catalogueItemData,
}) => {
  const t = useTranslation('coldchain');
  const { error } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const EquipmentBuffer: EquipmentImportModal.ImportRow[] = [];

  const csvExample = async () => {
    const emptyRows: ImportRow[] = [];
    const csv = importEquipmentToCsv(
      emptyRows.map((row: ImportRow): InsertAssetInput => {
        return toInsertEquipmentInput(row, catalogueItemData);
      }),
      t
    );
    FileUtils.exportCSV(csv, t('filename.cce'));
  };

  const csvImport = (files: any) => {
    setErrorMessage('');
    EquipmentBuffer.length = 0; // Reset the import buffer
    const csvFile = files[0];

    if (!csvFile.name.endsWith('.csv')) {
      setErrorMessage(t('messages.invalid-file'));
      return;
    }

    if (csvFile) {
      setIsLoading(true);
      Papa.parse(csvFile, {
        header: true,
        worker: true,
        skipEmptyLines: true,
        chunkSize: 100 * 1024, // 100kb
        chunk: processUploadedDataChunk,
        complete: () => {
          setEquipment(EquipmentBuffer);
          setIsLoading(false);
          onUploadComplete();
        },
      });
    }
    error(t('messages.error-no-file-selected'));
  };

  const processUploadedDataChunk = (data: any) => {
    if (!data.data || !Array.isArray(data.data)) {
      // Don't think this is likely to happen...
      console.info('data not data');
      setErrorMessage(t('messages.import-error'));
    }

    const rows: EquipmentImportModal.ImportRow[] = [];
    let hasErrors = false;
    for (const row of data.data) {
      const importRow = {} as EquipmentImportModal.ImportRow;
      const rowErrors: string[] = [];
      if (row.id && row.id.trim() != '') {
        importRow.id = row.id;
        importRow.isUpdate = true;
      } else {
        importRow.id = FnUtils.generateUUID();
        importRow.isUpdate = false;
      }
      if (row[t('label.asset-number')] !== undefined) {
        importRow.assetNumber = row[t('label.asset-number')];
      } else {
        rowErrors.push(
          t('error.field-must-be-specified', { field: 'AssetNumber' })
        );
      }
      if (row[t('label.catalogue-item-code')] !== undefined) {
        importRow.catalogueItemCode = row[t('label.catalogue-item-code')];
      } else {
        rowErrors.push(
          t('error.field-must-be-specified', { field: 'CatalogueItemId' })
        );
      }
      // notes aren't essential for bulk upload
      if (row[t('label.asset-notes')] !== undefined) {
        importRow.notes = row[t('label.asset-notes')];
      }
      importRow.errorMessage = rowErrors.join(',');
      hasErrors = hasErrors || rowErrors.length > 0;
      rows.push(importRow);
    }
    if (hasErrors) {
      setErrorMessage(t('messages.import-error'));
    }
    EquipmentBuffer.push(...rows);
  };

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
        <Upload onUpload={csvImport} />
        <Paper>
          <Typography variant="h4" textAlign="center">
            {'import this'}
          </Typography>
          {/* <Typography>{t('text.importing-manufacturers-p1')}</Typography> */}
          <Typography>
            <Link
              onClick={() => {
                csvExample();
              }}
              to={''}
            >
              {'download example'}
            </Link>
          </Typography>
          {/* <Typography>{t('text.importing-manufacturers-p2')}</Typography>
          <Typography>{t('text.importing-manufacturers-p3')}</Typography>
          <Typography>{t('text.importing-manufacturers-p4')}</Typography>
          <Typography>{t('text.importing-manufacturers-p5')}</Typography> */}
        </Paper>
      </Stack>
    </ImportPanel>
  );
};
