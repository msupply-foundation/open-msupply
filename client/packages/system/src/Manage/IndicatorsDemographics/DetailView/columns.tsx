import React, { useMemo } from 'react';
import {
  Box,
  ColumnDef,
  ColumnType,
  NumericTextInput,
  RecordPatch,
  useTranslation,
  NumberInputCell,
  TextInputCell,
} from '@openmsupply-client/common';
import { GENERAL_POPULATION_ID } from '../api';
import { HeaderData, Row } from '../types';

export const useIndicatorsDemographicsColumns = ({
  draft,
  setter,
  handlePopulationChange,
  handleGrowthChange,
  headerDraft,
}: {
  draft: Record<string, Row>;
  setter: (patch: RecordPatch<Row>) => void;
  handlePopulationChange: (patch: RecordPatch<Row>) => void;
  handleGrowthChange: (headerDraft: HeaderData) => void;
  headerDraft: HeaderData | undefined;
}) => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<Row>[] => {
      const columns: ColumnDef<Row>[] = [
        {
          accessorKey: 'name',
          header: t('label.name'),
          Cell: ({ cell, row: { original: row } }) => (
            <TextInputCell
              cell={cell}
              disabled={row.id === GENERAL_POPULATION_ID}
              updateFn={value => setter({ id: row.id, name: value })}
            />
          ),
        },
        {
          accessorKey: 'percentage',
          header: t('label.percentage'),
          Cell: ({ cell, row: { original: row } }) => (
            <NumberInputCell
              cell={cell}
              min={0}
              max={100}
              endAdornment="%"
              disabled={row.id === GENERAL_POPULATION_ID}
              updateFn={value =>
                setter({ id: row.id, percentage: value })
              }
            />
          ),
        },
        {
          id: 'population',
          accessorFn: row => Math.floor(row['0']),
          header: t('label.current-population'),
          Cell: ({ cell, row: { original: row } }) => (
            <NumberInputCell
              cell={cell}
              decimalLimit={0}
              disabled={row.id !== GENERAL_POPULATION_ID}
              updateFn={value =>
                handlePopulationChange({ id: row.id, '0': value })
              }
            />
          ),
        },
      ]

      for (let index = 1; index <= 5; index++) {
        const yearOffset = index as 1 | 2 | 3 | 4 | 5; // To apease the type checker
        columns.push({
          id: `year-${yearOffset}`,
          accessorFn: row => row[yearOffset],
          header: `${t('label.year')} ${yearOffset}`,
          columnType: ColumnType.Number,
          Header: ({ column }) => <Box display="flex" flexDirection="row" alignItems="center" gap={2}>
            {column.columnDef.header}
            <NumericTextInput
              value={headerDraft ? headerDraft[yearOffset].value : 0}
              min={0}
              max={100}
              endAdornment="%"
              onChange={value => {
                if (!headerDraft) return;
                handleGrowthChange({
                  ...headerDraft,
                  [yearOffset]: {
                    id: headerDraft[yearOffset].id,
                    value: value ?? 0,
                  },
                })
              }}
            />
          </Box>,
        });
      }

      return columns;
    },
    [draft]
  );

  return columns;
};