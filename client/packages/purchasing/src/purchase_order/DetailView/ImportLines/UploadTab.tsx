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
import { importPurchaseOrderLinesToCsv } from '../utils';
import { getImportHelpers, ImportRow, ParsedLine } from './utils';

interface UploadTabProps {
  setLines: Dispatch<SetStateAction<ImportRow[]>>;
  setErrorMessage: (value: SetStateAction<string>) => void;
  setWarningMessage: (value: SetStateAction<string>) => void;
  onUploadComplete: () => void;
}

export const UploadTab = ({
  tab,
  setErrorMessage,
  setWarningMessage,
  setLines,
  onUploadComplete,
}: ImportPanel & UploadTabProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const LineBuffer: ImportRow[] = [];

  const exportCSV = useExportCSV();

  const csvExample = async () => {
    const exampleRows: Partial<ImportRow>[] = [
      {
        itemCode: t('label.code'),
        requestedPackSize: 0,
        requestedNumberOfUnits: 0,
        unit: '',
        supplierItemCode: '',
        pricePerUnitBeforeDiscount: 0,
        discountPercentage: 0,
        pricePerUnitAfterDiscount: 0,
        requestedDeliveryDate: '',
        expectedDeliveryDate: '',
        comment: '',
        note: '',
      },
    ];
    const csv = importPurchaseOrderLinesToCsv(exampleRows, t);
    exportCSV(csv, t('filename.pol'));
  };

  const processRow = (row: ParsedLine, index: number, rows: ImportRow[]) => {
    const { importRow, rowErrors, rowWarnings, addUniqueCombination, addCell } =
      getImportHelpers(row, rows, index, t);

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

    addCell('unit', 'label.unit');

    addCell('supplierItemCode', 'label.supplier-item-code');

    addCell(
      'pricePerUnitBeforeDiscount',
      'label.price-per-pack-before-discount',
      numString => parseFloat(numString)
    );

    addCell('discountPercentage', 'label.discount-percentage', numString =>
      parseFloat(numString)
    );

    addCell(
      'pricePerUnitAfterDiscount',
      'label.price-per-pack-after-discount',
      numString => parseFloat(numString)
    );

    addCell('requestedDeliveryDate', 'label.requested-delivery-date');

    addCell('expectedDeliveryDate', 'label.expected-delivery-date');

    addCell('comment', 'label.comment');

    addCell('note', 'label.notes');

    importRow.errorMessage = rowErrors.join(',');
    importRow.warningMessage = rowWarnings.join(',');

    return {
      importRow,
      hasErrors: rowErrors.length > 0,
      hasWarnings: rowWarnings.length > 0,
    };
  };

  const processUploadedDataChunk = (data: ParseResult<ParsedLine>) => {
    if (!data.data || !Array.isArray(data.data)) {
      setErrorMessage(t('messages.import-error'));
      return;
    }

    const rows: ImportRow[] = [];
    let hasErrors = false;
    let hasWarnings = false;

    data.data.forEach((row, index) => {
      const result = processRow(row, index, rows);
      rows.push(result.importRow);
      hasErrors = hasErrors || result.hasErrors;
      hasWarnings = hasWarnings || result.hasWarnings;
    });

    if (hasErrors) setErrorMessage(t('messages.import-error-on-upload'));
    if (hasWarnings) setWarningMessage(t('messages.import-warning-on-upload'));

    LineBuffer.push(...rows);
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
          setLines(LineBuffer);
          setIsLoading(false);
          onUploadComplete();
        },
      });
    } else {
      error(t('messages.error-no-file-selected'))();
    }
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
