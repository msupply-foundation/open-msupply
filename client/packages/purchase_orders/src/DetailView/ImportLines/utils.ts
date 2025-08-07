import { LocaleKey, TypedTFunction } from '@common/intl';
import { ImportRow } from './PurchaseOrderLineImportModal';
import { FnUtils } from '@common/utils';

export interface ParsedLine {
  id: string;
  [key: string]: string | undefined;
}

export const getImportHelpers = (
  row: ParsedLine,
  rows: ImportRow[],
  index: number,
  t: TypedTFunction<LocaleKey>
) => {
  const importRow: ImportRow = {
    id: FnUtils.generateUUID(),
    itemCode: '',
    errorMessage: '',
    warningMessage: '',
  };
  const rowErrors: string[] = [];
  const rowWarnings: string[] = [];

  const addCell = (
    key: keyof ImportRow,
    localeKey: LocaleKey,
    formatter?: (value: string) => unknown
  ) => {
    const prop = t(localeKey) as keyof ImportRow;
    const value = row[prop] ?? '';
    if (value !== undefined) {
      (importRow[key] as unknown) = formatter
        ? formatter(value as string)
        : value;
    }
  };

  const addUniqueCombination = (
    inputs: {
      key: keyof ImportRow;
      localeKey: LocaleKey;
      formatter?: (value: string) => unknown;
    }[]
  ) => {
    // add all column values in the row
    inputs.forEach(({ key, localeKey, formatter }) => {
      addCell(key, localeKey, formatter);
    });

    // TODO add mapping check with hash maps for optimisation

    if (
      rows.some((r, i) => {
        return inputs.every(({ key, localeKey, formatter }) => {
          const prop = t(localeKey) as keyof ParsedLine;
          const value = row[prop] ?? '';
          const rValue = r[key] as string | undefined;
          return (
            rValue !== undefined &&
            rValue === (formatter ? formatter(value as string) : value) &&
            index !== i
          );
        });
      })
    ) {
      rowErrors.push(
        t('error.duplicated-combination', {
          fields: inputs.map(({ localeKey }) => t(localeKey)).join(', '),
        })
      );
    }
  };

  return {
    addCell,
    addUniqueCombination,
    importRow,
    rowErrors,
    rowWarnings,
  };
};
