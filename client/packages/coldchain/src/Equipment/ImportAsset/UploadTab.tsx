import React, { FC, useState } from 'react';
import Papa, { ParseResult } from 'papaparse';
import { ImportPanel } from './ImportPanel';
import { useNotification } from '@common/hooks';
import { InlineProgress, Typography, Upload } from '@common/components';
import {
  DateUtils,
  LocaleKey,
  TypedTFunction,
  useTranslation,
} from '@common/intl';
import {
  Grid,
  Stack,
  Link,
  FnUtils,
  FileUtils,
  Formatter,
  useIsCentralServerApi,
} from '@openmsupply-client/common';
import * as EquipmentImportModal from './EquipmentImportModal';
import { ImportRow } from './EquipmentImportModal';
import { importEquipmentToCsv } from '../utils';
import {
  AssetCatalogueItemFragment,
  useStore,
} from '@openmsupply-client/system';

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

const formatDate = (value: string): string | null =>
  Formatter.naiveDate(DateUtils.getDateOrNull(value));

function getImportHelpers<T, P>(
  row: P,
  rows: T[],
  index: number,
  t: TypedTFunction<LocaleKey>
) {
  const importRow = {
    id: FnUtils.generateUUID(),
  } as T;
  const rowErrors: string[] = [];

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
      rowErrors.push(t('error.duplicate-asset-number'));
    }
  };

  function addLookup<K>(
    key: keyof T,
    lookupData: K[],
    lookupFn: (item: K) => string | null | undefined,
    localeKey: LocaleKey,
    formatter?: (value: string) => unknown
  ) {
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
    if (lookupData.filter(l => lookupFn(l) === value).length === 0) {
      rowErrors.push(t('error.code-no-match', { field: t(localeKey) }));
      return;
    }
    addCell(key, localeKey, formatter);
  }

  return { addLookup, addCell, addRequired, addUnique, importRow, rowErrors };
}

export const EquipmentUploadTab: FC<ImportPanel & EquipmentUploadTabProps> = ({
  tab,
  setErrorMessage,
  setEquipment,
  onUploadComplete,
  catalogueItemData,
}) => {
  const t = useTranslation('coldchain');
  const isCentralServer = useIsCentralServerApi();
  const { data: stores } = useStore.document.list();
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
          store: undefined,
          notes: undefined,
          serialNumber: undefined,
          installationDate: undefined,
        })
      ),
      t,
      isCentralServer
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

    const rows: ImportRow[] = [];
    let hasErrors = false;

    data.data.forEach((row, index) => {
      const { addLookup, addCell, addUnique, importRow, rowErrors } =
        getImportHelpers(row, rows, index, t);
      const lookupCode = (item: { code: string | null | undefined }) =>
        item.code;
      const lookupStore = (store: { code: string }) => store.code;

      addUnique('assetNumber', 'label.asset-number');
      addLookup(
        'catalogueItemCode',
        catalogueItemData ?? [],
        lookupCode,
        'label.catalogue-item-code'
      );
      if (isCentralServer) {
        addLookup(
          'store',
          stores?.nodes ?? [],
          lookupStore,
          'label.store',
          s => stores?.nodes?.find(store => store.code === s)
        );
      }
      addCell('notes', 'label.asset-notes');
      addCell('installationDate', 'label.installation-date', formatDate);
      addCell('serialNumber', 'label.serial');
      importRow.errorMessage = rowErrors.join(',');
      hasErrors = hasErrors || rowErrors.length > 0;
      rows.push(importRow);
      if (hasErrors) {
        setErrorMessage(t('messages.import-error-on-upload'));
      }
    });
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
