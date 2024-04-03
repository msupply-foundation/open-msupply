import React, { FC, useState } from 'react';
import Papa, { ParseResult } from 'papaparse';
import { ImportPanel } from './ImportPanel';
import { useNotification } from '@common/hooks';
import { InlineProgress, Typography, Upload } from '@common/components';
import { useTranslation } from '@common/intl';
import {
  Grid,
  Stack,
  Link,
  FnUtils,
  FileUtils,
} from '@openmsupply-client/common';
import * as EquipmentImportModal from './EquipmentImportModal';
import { ImportRow } from './EquipmentImportModal';
import { importEquipmentToCsv } from '../utils';
import { AssetCatalogueItemFragment } from '@openmsupply-client/system';

interface EquipmentUploadTabProps {
  setEquipment: React.Dispatch<React.SetStateAction<ImportRow[]>>;
  setErrorMessage: (value: React.SetStateAction<string>) => void;
  onUploadComplete: () => void;
  catalogueItemData?: AssetCatalogueItemFragment[];
}

// introduce new interface to accommodate dynamic keys of parsed result
interface ParsedAsset {
  id: string;
  [key: string]: string | undefined;
}

enum AssetColumn {
  ID = 0,
  ASSET_NUMBER = 1,
  CATALOGUE_ITEM_CODE = 2,
  NOTES = 3,
}

// the row object indexes are returned in column order
// which allows us to index the keys
const getCell = (row: ParsedAsset, index: AssetColumn) => {
  const rowKeys = Object.keys(row);
  const key = rowKeys[index] ?? '';
  return row[key] ?? '';
};

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
      emptyRows.map(
        (_row: ImportRow): Partial<ImportRow> => ({
          assetNumber: undefined,
          catalogueItemCode: undefined,
          id: undefined,
          notes: undefined,
        })
      ),
      t
    );
    FileUtils.exportCSV(csv, t('filename.cce'));
  };

  const csvImport = <T extends File>(files: T[]) => {
    setErrorMessage('');
    EquipmentBuffer.length = 0; // Reset the import buffer
    const csvFile = files[0];

    if (!csvFile?.name.endsWith('.csv')) {
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

  const processUploadedDataChunk = (data: ParseResult<ParsedAsset>) => {
    if (!data.data || !Array.isArray(data.data)) {
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
      const assetNumber = getCell(row, AssetColumn.ASSET_NUMBER);
      if (assetNumber && assetNumber.trim() != '') {
        importRow.assetNumber = assetNumber;
      } else {
        rowErrors.push(
          t('error.field-must-be-specified', { field: t('label.asset-number') })
        );
      }
      const code = getCell(row, AssetColumn.CATALOGUE_ITEM_CODE);
      if (code === undefined || code.trim() === '') {
        rowErrors.push(
          t('error.field-must-be-specified', {
            field: t('label.catalogue-item-code'),
          })
        );
      } else if (
        catalogueItemData?.filter(
          (item: { code: string | null | undefined }) => item.code == code
        ).length === 0
      ) {
        rowErrors.push(
          t('error.code-no-match', { field: t('label.catalogue-item-code') })
        );
      } else {
        importRow.catalogueItemCode = code;
      }
      // notes aren't essential for bulk upload
      if (getCell(row, AssetColumn.NOTES) !== undefined) {
        importRow.notes = getCell(row, AssetColumn.NOTES);
      }
      importRow.errorMessage = rowErrors.join(',');
      hasErrors = hasErrors || rowErrors.length > 0;
      rows.push(importRow);
    }
    if (hasErrors) {
      setErrorMessage(t('messages.import-error-on-upload'));
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
        <Typography textAlign="center">
          {t('messages.template-download-text')}
          <Link
            onClick={() => {
              csvExample();
            }}
            to={''}
          >
            {t('heading.download-example')}
          </Link>
        </Typography>
      </Stack>
    </ImportPanel>
  );
};
