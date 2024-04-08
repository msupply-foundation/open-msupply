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
import * as AssetItemImportModal from './CatalogueItemImportModal';
import { ImportRow } from './CatalogueItemImportModal';
import { AssetCatalogueItemFragment } from '@openmsupply-client/system';
import { importRowToCsv } from '../utils';

interface AssetItemUploadTabProps {
  setAssetItem: React.Dispatch<React.SetStateAction<ImportRow[]>>;
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
  SUB_CATALOGUE = 0,
  CODE = 1,
  TYPE = 2,
  MANUFACTURER = 3,
  MODEL = 4,
  CLASS = 5,
  CATEGORY = 6,
}

// the row object indexes are returned in column order
// which allows us to index the keys
const getCell = (row: ParsedAsset, index: AssetColumn) => {
  const rowKeys = Object.keys(row);
  const key = rowKeys[index] ?? '';
  return row[key] ?? '';
};

export const AssetItemUploadTab: FC<ImportPanel & AssetItemUploadTabProps> = ({
  tab,
  setErrorMessage,
  setAssetItem,
  onUploadComplete,
}) => {
  const t = useTranslation('coldchain');
  const { error } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const AssetItemBuffer: AssetItemImportModal.ImportRow[] = [];

  const csvExample = async () => {
    const emptyRows: ImportRow[] = [];
    const csv = importRowToCsv(
      emptyRows.map((_row: ImportRow): Partial<ImportRow> => ({})),
      t
    );
    FileUtils.exportCSV(csv, t('filename.cce'));
  };

  const csvImport = <T extends File>(files: T[]) => {
    setErrorMessage('');
    AssetItemBuffer.length = 0; // Reset the import buffer
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
          setAssetItem(AssetItemBuffer);
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

    const csvRows = data.data;

    const rows: AssetItemImportModal.ImportRow[] = [];
    let hasErrors = false;

    csvRows.map((row, _index) => {
      const importRow = {} as AssetItemImportModal.ImportRow;
      const rowErrors: string[] = [];
      importRow.id = FnUtils.generateUUID();
      const subCatalogue = getCell(row, AssetColumn.SUB_CATALOGUE);
      if (subCatalogue && subCatalogue.trim() != '') {
        importRow.subCatalogue = subCatalogue.trim();
      } else {
        rowErrors.push(
          t('error.field-must-be-specified', {
            field: t('label.sub-catalogue'),
          })
        );
      }
      const code = getCell(row, AssetColumn.CODE);
      if (code === undefined || code.trim() === '') {
        rowErrors.push(
          t('error.field-must-be-specified', {
            field: t('label.catalogue-item-code'),
          })
        );
      }

      importRow.errorMessage = rowErrors.join(',');
      hasErrors = hasErrors || rowErrors.length > 0;
      rows.push(importRow);
    });

    // TODO:

    // Look up Type from assetTypes

    // Manufacturer

    // Model

    // Class (lookup from assetClasses)

    // Category (lookup from assetCategories)

    if (hasErrors) {
      setErrorMessage(t('messages.import-error-on-upload'));
    }
    AssetItemBuffer.push(...rows);
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
