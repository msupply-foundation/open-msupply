import React, { useMemo, useState } from 'react';
import { DeleteIcon, FilterIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import {
  BasicTextInput,
  Box,
  ColumnDef,
  IconButton,
  InputAdornment,
  MaterialTable,
  NothingHere,
  RegexUtils,
  TextWithTooltipCell,
  useSimpleMaterialTable,
  TextInputCell,
} from '@openmsupply-client/common';
import { useDebounceCallback } from '@common/hooks';
import { checkInvalidVariables, Translation } from './helpers';
import {
  TranslationOption,
  TranslationSearchInput,
} from './TranslationSearchInput';

export const TranslationsTable = ({
  translations,
  setTranslations,
  showValidationErrors,
}: {
  translations: Translation[];
  setTranslations: React.Dispatch<React.SetStateAction<Translation[]>>;
  showValidationErrors: boolean;
}) => {
  const t = useTranslation();

  const [filter, setFilter] = useState('');

  const onAdd = (options: TranslationOption[]) => {
    if (options.length === 0) return;
    const newLines = options.map(option => ({
      id: option.key,
      key: option.key,
      default: option.default,
      custom: option.default,
      isNew: true,
    }));
    setTranslations(translations => [...newLines, ...translations]);
  };

  // Debounce updates to the translations array so that typing in a cell
  // doesn't trigger a full table re-render on every keystroke.
  // The TextInputCell's internal useBufferState keeps the input responsive.
  const debouncedSetTranslations = useDebounceCallback(
    (updater: (prev: Translation[]) => Translation[]) =>
      setTranslations(updater),
    [],
    300
  );

  const columns = useMemo(
    (): ColumnDef<Translation>[] => [
      {
        accessorKey: 'key',
        header: t('label.key'),
        Cell: TextWithTooltipCell,
        size: 150,
      },
      {
        accessorKey: 'default',
        header: t('label.default'),
        size: 300,
        Cell: ({ cell }) => (
          <Box style={{ whiteSpace: 'normal' }}>{cell.getValue<string>()}</Box>
        ),
      },
      {
        accessorKey: 'custom',
        header: t('label.custom'),
        Cell: ({ cell, row }) => {
          const showInvalid = row.original.isInvalid && showValidationErrors;
          return (
            <TextInputCell
              cell={cell}
              updateFn={value => {
                const isInvalid = checkInvalidVariables({
                  ...row.original,
                  custom: value,
                });
                debouncedSetTranslations(translations =>
                  translations.map(tr =>
                    tr.id === row.original.id
                      ? { ...tr, custom: value, isInvalid }
                      : tr
                  )
                );
              }}
              multiline
              sx={{
                ...(showInvalid
                  ? {
                    borderColor: theme => theme.palette.error.main,
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderRadius: '8px',
                  }
                  : undefined),
              }}
            />
          );
        },
        size: 300,
      },
      {
        id: 'delete',
        header: t('label.delete'),
        size: 50,
        Cell: ({ row }) => (
          <IconButton
            icon={<DeleteIcon sx={{ height: '0.9em' }} />}
            label={t('label.delete')}
            onClick={() =>
              setTranslations(translations =>
                translations.filter(tr => tr.id !== row.original.id)
              )
            }
          />
        ),
      },
    ],
    [showValidationErrors]
  );

  // Memoize to avoid creating a new array reference on every render,
  // which would cause TranslationSearchInput to re-render unnecessarily.
  const existingKeys = useMemo(
    () => translations.map(tr => tr.key),
    [translations]
  );

  const filteredTranslations = useMemo(() => {
    if (!filter.trim()) return translations;
    const searchTerm = RegexUtils.escapeChars(filter);
    return translations.filter(
      tr =>
        RegexUtils.includes(searchTerm, tr.key) ||
        RegexUtils.includes(searchTerm, tr.default) ||
        RegexUtils.includes(searchTerm, tr.custom)
    );
  }, [translations, filter]);

  const table = useSimpleMaterialTable<Translation>({
    tableId: 'custom-translations-input-table',
    data: filteredTranslations,
    columns,
    getIsPlaceholderRow: row => row.original.isNew ?? false,
    noDataElement: (
      <NothingHere
        body={
          filter
            ? t('messages.no-matching-translations')
            : t('message.add-a-translation')
        }
      />
    ),
  });

  return (
    <>
      <Box display="flex" flexDirection="column" gap={1} marginBottom="8px">
        <TranslationSearchInput onChange={onAdd} existingKeys={existingKeys} />
        <BasicTextInput
          fullWidth
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder={t('placeholder.filter-translations')}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <FilterIcon sx={{ color: 'gray.main' }} fontSize="small" />
                </InputAdornment>
              ),
              sx: {
                backgroundColor: theme => theme.palette.background.drawer,
              },
            },
          }}
        />
      </Box>

      <MaterialTable table={table} />
    </>
  );
};
