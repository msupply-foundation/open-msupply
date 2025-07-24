import React, { useEffect } from 'react';
import { IconButton } from '@common/components';
import { DeleteIcon } from '@common/icons';
import { useTranslation } from '@common/intl';
import {
  alpha,
  AppSxProp,
  Box,
  DataTable,
  TextInputCell,
  TooltipTextCell,
  useColumns,
  useRowStyle,
} from '@openmsupply-client/common';
import { Translation } from './helpers';
import {
  TranslationOption,
  TranslationSearchInput,
} from './TranslationSearchInput';

export const TranslationsTable = ({
  translations,
  setTranslations,
}: {
  translations: Translation[];
  setTranslations: React.Dispatch<React.SetStateAction<Translation[]>>;
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

  const columns = useColumns<Translation>([
    {
      key: 'key',
      Cell: TooltipTextCell,
      label: 'label.key',
      width: 200,
    },
    {
      key: 'default',
      Cell: TooltipTextCell,
      label: 'label.default',
      width: 300,
    },
    {
      key: 'custom',
      Cell: TextInputCell,
      label: 'label.custom',
      cellProps: {
        fullWidth: true,
      },
      setter: input => {
        setTranslations(translations =>
          translations.map(tr =>
            tr.id === input.id ? { ...tr, ...input } : tr
          )
        );
      },
    },
    {
      key: 'delete',
      width: 50,
      Cell: ({ rowData }) => (
        <IconButton
          icon={<DeleteIcon sx={{ height: '0.9em' }} />}
          label={t('label.delete')}
          onClick={() =>
            setTranslations(translations =>
              translations.filter(tr => tr.id !== rowData.id)
            )
          }
        />
      ),
    },
  ]);

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

  return (
    <>
      <Box display="flex" justifyContent="flex-start" marginBottom="8px">
        <TranslationSearchInput
          onChange={onAdd}
          existingKeys={translations.map(t => t.key)}
        />
      </Box>

      <DataTable
        id={'translations-list'}
        columns={columns}
        data={translations}
        noDataMessage={t('message.add-a-translation')}
        dense
      />
    </>
  );
};
