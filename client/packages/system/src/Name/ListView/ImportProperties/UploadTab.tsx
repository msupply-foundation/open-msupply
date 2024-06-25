import React, { FC, useState } from 'react';
import Papa, { ParseResult } from 'papaparse';
import { InlineProgress, Typography, Upload } from '@common/components';
import { ImportPanel } from './ImportPanel';
import { useTranslation } from '@common/intl';
import {
  Grid,
  Stack,
  Link,
  FileUtils,
  PropertyNode,
  useNotification,
  NamePropertyNode,
} from '@openmsupply-client/common';

import { ImportRow } from './PropertiesImportModal';
import { importFacilitiesPropertiesToCsv } from '../utils';
import { FacilityNameRowFragment } from '../../api/operations.generated';
import { processProperties } from '../../../utils';

interface UploadTabProps {
  setFacilityProperties: React.Dispatch<React.SetStateAction<ImportRow[]>>;
  setErrorMessage: (value: React.SetStateAction<string>) => void;
  facilities: FacilityNameRowFragment[] | undefined;
  onUploadComplete: () => void;
  properties: NamePropertyNode[] | undefined;
}
interface ParsedImport {
  id: string;
  [key: string]: string | undefined;
}

enum FacilitiesColumn {
  CODE = 0,
  NAME = 1,
}

const getCell = (row: ParsedImport, index: FacilitiesColumn) => {
  const rowKeys = Object.keys(row);
  const key = rowKeys[index] ?? '';
  return row[key] ?? '';
};

export const UploadTab: FC<ImportPanel & UploadTabProps> = ({
  tab,
  facilities,
  setErrorMessage,
  setFacilityProperties,
  onUploadComplete,
  properties,
}) => {
  const t = useTranslation();
  const { error } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const FacilityPropertyBuffer: ImportRow[] = [];
  // TODO filter name properties for facility properties?
  const propertyNodes: PropertyNode[] | undefined = properties
    ?.map(property => {
      return { ...property.property };
    })
    .sort();

  const csvExample = async () => {
    const facilityRows: ImportRow[] = facilities
      ? facilities.map(facilityNode => {
          return {
            id: facilityNode.id,
            code: facilityNode.code,
            name: facilityNode.name,
            properties: facilityNode.properties
              ? JSON.parse(facilityNode.properties)
              : {},
          };
        })
      : [];
    const csv = importFacilitiesPropertiesToCsv(
      facilityRows,
      t,
      propertyNodes ? propertyNodes?.map(p => p.key) : []
    );
    FileUtils.exportCSV(csv, t('filename.facilities-properties'));
  };

  const csvImport = <T extends File>(files: T[]) => {
    setErrorMessage('');
    FacilityPropertyBuffer.length = 0; // Reset the import buffer
    const csvFile = files[0];

    if (!csvFile?.name.endsWith('.csv')) {
      setErrorMessage(t('messages.invalid-file'));
      return;
    }

    if (csvFile) {
      setIsLoading(true);
      Papa.parse(csvFile, {
        delimiter: ',',
        quoteChar: '"',
        header: true,
        worker: true,
        skipEmptyLines: 'greedy',
        fastMode: false,
        chunkSize: 100 * 1024, // 100kb
        chunk: processUploadedDataChunk,
        complete: () => {
          setFacilityProperties(FacilityPropertyBuffer);
          setIsLoading(false);
          onUploadComplete();
        },
      });
    }
    error(t('messages.error-no-file-selected'));
  };

  const processUploadedDataChunk = (data: ParseResult<ParsedImport>) => {
    if (!data.data || !Array.isArray(data.data)) {
      setErrorMessage(
        t('messages.upload-error', {
          error: t('messages.no-data-found'),
        })
      );
    }

    if (data.errors.length > 0) {
      setErrorMessage(
        t('messages.upload-error', {
          error: data.errors[0]?.message + ' ROW: ' + data.errors[0]?.row,
        })
      );
    }

    const csvRows = data.data;

    const rows: ImportRow[] = [];
    let hasErrors = false;

    csvRows.map((row, _index) => {
      const importRow = { properties: {} } as ImportRow;
      const rowErrors: string[] = [];
      const code = getCell(row, FacilitiesColumn.CODE);
      if (code === undefined || code.trim() === '') {
        rowErrors.push(
          t('error.field-must-be-specified', {
            field: t('label.code'),
          })
        );
      }

      const id = facilities?.find(facility => facility.code == code)?.id;
      importRow.id = id ?? '';

      importRow.code = code;

      const name = getCell(row, FacilitiesColumn.NAME);
      if (name === undefined || name.trim() === '') {
        rowErrors.push(
          t('error.field-must-be-specified', {
            field: t('label.name'),
          })
        );
      }
      importRow.name = name;

      processProperties(propertyNodes ?? [], row, importRow, rowErrors, t);
      importRow.errorMessage = rowErrors.join(',');
      hasErrors = hasErrors || rowErrors.length > 0;
      rows.push(importRow);
    });

    if (hasErrors) {
      setErrorMessage(t('messages.import-error-on-upload'));
    }
    FacilityPropertyBuffer.push(...rows);
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
          <Link onClick={csvExample} to={''}>
            {t('messages.properties-download-example')}
          </Link>
          {t('messages.properties-template-download-text')}
        </Typography>
      </Stack>
    </ImportPanel>
  );
};
