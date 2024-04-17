import React, { FC, useState } from 'react';
import Papa, { ParseResult } from 'papaparse';
import { ImportPanel } from './ImportPanel';
import { useNotification } from '@common/hooks';
import { InlineProgress, Typography, Upload } from '@common/components';
import { LocaleKey, TypedTFunction, useTranslation } from '@common/intl';
import {
  Grid,
  Stack,
  Link,
  FnUtils,
  FileUtils,
  AssetClassNode,
  AssetCategoryNode,
  AssetTypeNode,
} from '@openmsupply-client/common';
import * as AssetItemImportModal from './CatalogueItemImportModal';
import { ImportRow } from './CatalogueItemImportModal';
import { importRowToCsv } from '../utils';
import {
  useAssetData,
  AssetCatalogueItemFragment,
  AssetPropertyFragment,
} from '../api';

interface AssetItemUploadTabProps {
  setAssetItem: React.Dispatch<React.SetStateAction<ImportRow[]>>;
  setErrorMessage: (value: React.SetStateAction<string>) => void;
  assetClasses: AssetClassNode[];
  assetCategories: AssetCategoryNode[];
  assetTypes: AssetTypeNode[];
  onUploadComplete: () => void;
  catalogueItemData?: AssetCatalogueItemFragment[];
}

// introduce new interface to accommodate dynamic keys of parsed result
interface ParsedImport {
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
// This will need to change if we introduce properties on assets which are not always in the import
const getCell = (row: ParsedImport, index: AssetColumn) => {
  const rowKeys = Object.keys(row);
  const key = rowKeys[index] ?? '';
  return row[key] ?? '';
};

const processProperties = (
  properties: undefined | AssetPropertyFragment[],
  row: ParsedImport,
  importRow: ImportRow,
  rowErrors: string[],
  t: TypedTFunction<LocaleKey>
) => {
  properties?.forEach(property => {
    const value = row[property.name];

    if (!!value?.trim()) {
      if (!!property.allowedValues) {
        const allowedValues = property.allowedValues.split(',');
        if (allowedValues.every(v => v !== value)) {
          rowErrors.push(
            t('error.invalid-field-value', {
              field: property.name,
              value: value,
            })
          );
          return;
        }
      }
      switch (property.valueType) {
        case 'INTEGER':
        case 'FLOAT':
          if (Number.isNaN(Number(value))) {
            rowErrors.push(
              t('error.invalid-field-value', {
                field: property.name,
                value: value,
              })
            );
            return;
          }
          break;
        case 'BOOLEAN':
          const isTrue =
            value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
          importRow.properties[property.id] = {
            ...property,
            value: isTrue ? 'true' : 'false',
          };
          return;
        default:
          importRow.properties[property.id] = { ...property, value };
      }
    }
  });
};

export const AssetItemUploadTab: FC<ImportPanel & AssetItemUploadTabProps> = ({
  tab,
  setErrorMessage,
  setAssetItem,
  assetClasses,
  assetCategories,
  assetTypes,
  onUploadComplete,
}) => {
  const t = useTranslation('coldchain');
  const { error } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const AssetItemBuffer: AssetItemImportModal.ImportRow[] = [];
  const { data: properties } = useAssetData.utils.properties();

  const csvExample = async () => {
    const exampleRows: ImportRow[] = [
      {
        id: '',
        subCatalogue: 'General',
        code: 'A Unique Code for this item',
        class: 'Cold chain equipment',
        category: 'Refrigerators and freezers',
        type: 'Refrigerator',
        manufacturer: 'Some Manufacturer',
        model: 'Some Model',
        errorMessage: '',
        properties: {},
      },
    ];
    const csv = importRowToCsv(
      exampleRows,
      t,
      false, // exclude errors
      properties ? properties.map(p => p.name) : []
    );
    FileUtils.exportCSV(csv, t('filename.asset-import-example'));
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

  const processUploadedDataChunk = (data: ParseResult<ParsedImport>) => {
    if (!data.data || !Array.isArray(data.data)) {
      setErrorMessage(t('messages.import-error'));
    }

    const csvRows = data.data;

    const rows: ImportRow[] = [];
    let hasErrors = false;

    csvRows.map((row, _index) => {
      const importRow = { properties: {} } as ImportRow;
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
      importRow.code = code;

      // Class (lookup from assetClasses)

      const className = getCell(row, AssetColumn.CLASS);
      if (className === undefined || className.trim() === '') {
        rowErrors.push(
          t('error.field-must-be-specified', {
            field: t('label.class'),
          })
        );
      } else {
        importRow.class = className;
        importRow.classId = assetClasses.find(c => c.name === className)?.id;
        if (!importRow.classId) {
          rowErrors.push(
            t('error.invalid-field-value', {
              field: t('label.class'),
              value: className,
            })
          );
        }
      }

      // Category (lookup from assetCategories)

      const categoryName = getCell(row, AssetColumn.CATEGORY);
      if (categoryName === undefined || categoryName.trim() === '') {
        rowErrors.push(
          t('error.field-must-be-specified', {
            field: t('label.category'),
          })
        );
      } else {
        importRow.category = categoryName;
        importRow.categoryId = assetCategories.find(
          c => c.name === categoryName
        )?.id;
        if (!importRow.categoryId) {
          rowErrors.push(
            t('error.invalid-field-value', {
              field: t('label.category'),
              value: categoryName,
            })
          );
        }
      }

      // Look up Type from assetTypes

      const typeName = getCell(row, AssetColumn.TYPE);
      if (typeName === undefined || typeName.trim() === '') {
        rowErrors.push(
          t('error.field-must-be-specified', {
            field: t('label.type'),
          })
        );
      } else {
        importRow.type = typeName;
        importRow.typeId = assetTypes.find(c => c.name === typeName)?.id;
        if (!importRow.typeId) {
          rowErrors.push(
            t('error.invalid-field-value', {
              field: t('label.type'),
              value: typeName,
            })
          );
        }
      }

      // Manufacturer
      importRow.manufacturer = getCell(row, AssetColumn.MANUFACTURER);

      // Model
      const model = getCell(row, AssetColumn.MODEL);
      if (model === undefined || model.trim() === '') {
        rowErrors.push(
          t('error.field-must-be-specified', {
            field: t('label.model'),
          })
        );
      } else {
        importRow.model = model;
      }
      processProperties(properties, row, importRow, rowErrors, t);
      importRow.errorMessage = rowErrors.join(',');
      hasErrors = hasErrors || rowErrors.length > 0;
      rows.push(importRow);
    });

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
