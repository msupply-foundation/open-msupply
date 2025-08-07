import React, { Dispatch, SetStateAction, useState } from 'react';
import Papa, { ParseResult } from 'papaparse';
import {
  Grid,
  Stack,
  Link,
  useTranslation,
  InlineProgress,
  Typography,
  useNotification,
  UploadFile,
  useExportCSV,
  ImportPanel,
} from '@openmsupply-client/common';
import {} from '@openmsupply-client/system';
import { ImportRow } from './PurchaseOrderLineImportModal';
import * as PurchaseOrderLineImportModal from './PurchaseOrderLineImportModal';
import { importPurchaseOrderLinesToCsv } from '../utils';
import { getImportHelpers, ParsedLine } from './utils';

interface UploadTabProps {
  setEquipment: Dispatch<SetStateAction<ImportRow[]>>;
  setErrorMessage: (value: SetStateAction<string>) => void;
  setWarningMessage: (value: SetStateAction<string>) => void;
  onUploadComplete: () => void;
}

// introduce new interface to accommodate dynamic keys of parsed result

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
        itemCode: t('label.code'),
        requestedPackSize: 0,
        requestedNumberOfUnits: 0,
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

  const processUploadedDataChunk = (data: ParseResult<ParsedLine>) => {
    if (!data.data || !Array.isArray(data.data)) {
      setErrorMessage(t('messages.import-error'));
    }

    const rows: ImportRow[] = [];
    let hasErrors = false;

    data.data.forEach((row, index) => {
      const {
        importRow,
        rowErrors,
        rowWarnings,
        addUniqueCombination,
        addCell,
      } = getImportHelpers(row, rows, index, t);

      addUniqueCombination([
        {
          key: 'itemCode',
          localeKey: 'label.code',
        },
        {
          key: 'requestedPackSize',
          localeKey: 'label.pack-size',
          formatter: numString => parseFloat(numString),
        },
      ]);

      addCell('requestedNumberOfUnits', 'label.requested', numString =>
        parseFloat(numString)
      );

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
