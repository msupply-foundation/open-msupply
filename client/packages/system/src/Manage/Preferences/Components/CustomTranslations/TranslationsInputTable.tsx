import React, { useEffect, useMemo } from 'react';
import { DeleteIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import {
  alpha,
  AppSxProp,
  Box,
  ColumnDef,
  IconButton,
  MaterialTable,
  NothingHere,
  TextWithTooltipCell,
  useRowStyle,
  useSimpleMaterialTable,
} from '@openmsupply-client/common';
import { checkInvalidVariables, Translation } from './helpers';
import {
  TranslationOption,
  TranslationSearchInput,
} from './TranslationSearchInput';
import { TextInputCell } from '@openmsupply-client/common/src/ui/layout/tables/material-react-table/components/TextInputCell';

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

  const { setRowStyles } = useRowStyle();

  useEffect(() => {
    const newLines = translations.filter(tr => tr.isNew).map(tr => tr.id);

    const style: AppSxProp = {
      backgroundColor: theme =>
        `${alpha(theme.palette.secondary.main, 0.1)} !important`,
    };
    setRowStyles(newLines, style);
  }, [translations, setRowStyles]);

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
        Cell: ({ cell }) => (<Box style={{ whiteSpace: 'normal' }}>{cell.getValue<string>()}</Box>),
      },
      {
        accessorKey: 'custom',
        header: t('label.custom'),
        Cell: ({ cell, row }) => {
          const showInvalid = row.original.isInvalid && showValidationErrors;
          return <TextInputCell
            cell={cell}
            updateFn={value => {
              const isInvalid = checkInvalidVariables({ ...row.original, custom: value });
              setTranslations(translations =>
                translations.map(tr =>
                  tr.id === row.original.id ? { ...tr, custom: value, isInvalid } : tr
                )
              );
            }}
            multiline
            sx={{
              ...(showInvalid ? {
                borderColor: theme => theme.palette.error.main,
                borderWidth: '2px',
                borderStyle: 'solid',
                borderRadius: '8px',
              } : undefined),
            }}
          />
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

  const table = useSimpleMaterialTable<Translation>({
    tableId: 'custom-translations-input-table',
    data: translations,
    columns,
    noDataElement: <NothingHere body={t('message.add-a-translation')} />,
  });

  return (
    <>
      <Box display="flex" justifyContent="flex-start" marginBottom="8px">
        <TranslationSearchInput
          onChange={onAdd}
          existingKeys={translations.map(t => t.key)}
        />
      </Box>

      <MaterialTable table={table} />
    </>
  );
};
