import React, { useState } from 'react';
import Papa, { ParseResult } from 'papaparse';
import {
  Grid,
  Stack,
  Link,
  FnUtils,
  LocaleKey,
  TypedTFunction,
  useTranslation,
  InlineProgress,
  Typography,
  useNotification,
  UploadFile,
  useExportCSV,
} from '@openmsupply-client/common';
import {} from '@openmsupply-client/system';
import { ImportRow } from './PurchaseOrderLineImportModal';
import { ImportPanel } from './ImportPanel';
import * as PurchaseOrderLineImportModal from './PurchaseOrderLineImportModal';
import { importPurchaseOrderLinesToCsv } from '../utils';

interface UploadTabProps {
  setEquipment: React.Dispatch<React.SetStateAction<ImportRow[]>>;
  setErrorMessage: (value: React.SetStateAction<string>) => void;
  setWarningMessage: (value: React.SetStateAction<string>) => void;
  onUploadComplete: () => void;
}

// introduce new interface to accommodate dynamic keys of parsed result
interface ParsedAsset {
  id: string;
  [key: string]: string | undefined;
}

function getImportHelpers<T, P>(
  row: P,
  rows: T[],
  index: number,
  t: TypedTFunction<LocaleKey>
) {
  const importRow = {
    id: FnUtils.generateUUID(),
    properties: {},
  } as T;
  const rowErrors: string[] = [];
  const rowWarnings: string[] = [];

  const addCell = (
    key: keyof T,
    localeKey: LocaleKey,
    formatter?: (value: string) => unknown
  ) => {
    const prop = t(localeKey) as keyof P;
    const value = row[prop] ?? '';
    if (value !== undefined) {
      (importRow[key] as unknown) = formatter
        ? formatter(value as string)
        : value;
    }
  };

  const addRequired = (
    key: keyof T,
    localeKey: LocaleKey,
    formatter?: (value: string) => unknown
  ) => {
    const prop = t(localeKey) as keyof P;
    const value = row[prop] ?? '';

    if (value === undefined || (value as string).trim() === '') {
      rowErrors.push(
        t('error.field-must-be-specified', {
          field: t(localeKey),
        })
      );
      return;
    }

    addCell(key, localeKey, formatter);
  };

  const addSoftRequired = (
    key: keyof T,
    localeKey: LocaleKey,
    formatter?: (value: string) => unknown
  ) => {
    const prop = t(localeKey) as keyof P;
    const value = row[prop] ?? '';

    if (value === undefined || (value as string).trim() === '') {
      rowWarnings.push(
        t('warning.field-not-parsed', {
          field: t(localeKey),
        })
      );
      return;
    }

    if (
      formatter &&
      value &&
      (formatter(value as string) === undefined ||
        formatter(value as string) === null)
    ) {
      rowWarnings.push(
        t('warning.field-not-parsed', {
          field: t(localeKey),
        })
      );
      return;
    }
    addCell(key, localeKey, formatter);
  };

  const addUnique = (
    key: keyof T,
    localeKey: LocaleKey,
    formatter?: (value: string) => unknown
  ) => {
    const prop = t(localeKey) as keyof P;
    const value = row[prop] ?? '';

    addRequired(key, localeKey, formatter);

    // check for duplicates
    if (rows.some((r, i) => r[key] === value && index !== i)) {
      rowErrors.push(
        t('error.duplicated-field', {
          field: t(localeKey),
        })
      );
    }
  };

  function addLookup<K>(
    key: keyof T,
    lookupData: K[],
    lookupFn: (item: K) => string | null | undefined,
    localeKey: LocaleKey,
    required: boolean,
    formatter?: (value: string) => unknown
  ) {
    const prop = t(localeKey) as keyof P;
    const value = row[prop] ?? '';
    if (value === undefined || (value as string).trim() === '') {
      if (required) {
        rowErrors.push(
          t('error.field-must-be-specified', {
            field: t(localeKey),
          })
        );
      }
      return;
    }
    if (lookupData.filter(l => lookupFn(l) === value).length === 0) {
      rowErrors.push(t('error.code-no-match', { field: t(localeKey) }));
      return;
    }
    addCell(key, localeKey, formatter);
  }

  return {
    addLookup,
    addCell,
    addRequired,
    addSoftRequired,
    addUnique,
    importRow,
    rowErrors,
    rowWarnings,
  };
}

export const UploadTab = ({
  tab,
  setErrorMessage,
  setWarningMessage,
  setEquipment,
  onUploadComplete,
}: ImportPanel & UploadTabProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const LineBuffer: PurchaseOrderLineImportModal.ImportRow[] = [];

  const exportCSV = useExportCSV();

  const csvExample = async () => {
    const exampleRows: Partial<ImportRow>[] = [
      {
        id: t('label.id'),
        purchaseOrderId: t('label.purchaseOrderId'),
        itemId: t('label.itemId'),
      },
    ];
    const csv = importPurchaseOrderLinesToCsv(exampleRows, t);
    exportCSV(csv, t('filename.cce'));
  };

  const csvImport = <T extends File>(files: T[]) => {
    setErrorMessage('');
    LineBuffer.length = 0; // Reset the import buffer
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
          setEquipment(LineBuffer);
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

    const rows: ImportRow[] = [];
    let hasErrors = false;

    data.data.forEach((row, index) => {
      const { addUnique, importRow, rowErrors, rowWarnings } = getImportHelpers(
        row,
        rows,
        index,
        t
      );
      console.log('Processing row:', row, index);

      addUnique('id', 'label.id');
      addUnique('purchaseOrderId', 'label.purchase-order-id');
      addUnique('itemId', 'label.item-id');

      importRow.errorMessage = rowErrors.join(',');
      importRow.warningMessage = rowWarnings.join(',');
      hasErrors = hasErrors || rowErrors.length > 0;
      const hasWarnings = rowWarnings.length > 0;
      rows.push(importRow);
      if (hasErrors) {
        setErrorMessage(t('messages.import-error-on-upload'));
      }
      if (hasWarnings) {
        setWarningMessage(t('messages.import-warning-on-upload'));
      }
    });
    console.log('Processed rows:', rows);
    LineBuffer.push(...rows);
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
      <Stack spacing={2} alignItems={'center'}>
        <UploadFile onUpload={csvImport} />
        <Typography>
          {t('messages.template-download-text')}
          <Link onClick={csvExample} to={''}>
            {t('heading.download-example')}
          </Link>
        </Typography>
      </Stack>
    </ImportPanel>
  );
};
