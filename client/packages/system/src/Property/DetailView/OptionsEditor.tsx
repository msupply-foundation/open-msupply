import React from 'react';
import {
  BasicTextInput,
  Box,
  ButtonWithIcon,
  DeleteIcon,
  IconButton,
  InputWithLabelRow,
  PlusCircleIcon,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { DraftOption } from './useDraftPropertyOptions';

interface OptionsEditorProps {
  rows: DraftOption[];
  addRow: () => void;
  updateRow: (id: string, patch: Partial<DraftOption>) => void;
  removeRow: (id: string) => void;
  restoreRow: (id: string) => void;
}

// One row of an option in the editor — name + translation key + delete/restore.
const OptionRow = ({
  row,
  updateRow,
  removeRow,
  restoreRow,
}: {
  row: DraftOption;
  updateRow: OptionsEditorProps['updateRow'];
  removeRow: OptionsEditorProps['removeRow'];
  restoreRow: OptionsEditorProps['restoreRow'];
}) => {
  const t = useTranslation();
  return (
    <Box
      display="flex"
      gap={1}
      alignItems="center"
      sx={{
        opacity: row.isDeleted ? 0.5 : 1,
        py: 0.5,
        '&:not(:last-child)': { borderBottom: '1px dashed' },
      }}
    >
      <BasicTextInput
        value={row.name}
        onChange={e => updateRow(row.id, { name: e.target.value })}
        disabled={row.isDeleted}
        placeholder={t('label.name')}
        sx={{ flex: 1, maxWidth: 220 }}
      />
      <BasicTextInput
        value={row.translationKey ?? ''}
        onChange={e =>
          updateRow(row.id, { translationKey: e.target.value || null })
        }
        disabled={row.isDeleted}
        placeholder={t('label.property-translation-key')}
        sx={{ flex: 1, maxWidth: 220 }}
      />
      {row.isDeleted ? (
        <IconButton
          icon={<PlusCircleIcon />}
          label={t('button.restore-option')}
          onClick={() => restoreRow(row.id)}
        />
      ) : (
        <IconButton
          icon={<DeleteIcon />}
          label={t('button.delete-option')}
          onClick={() => removeRow(row.id)}
        />
      )}
    </Box>
  );
};

export const OptionsEditor = ({
  rows,
  addRow,
  updateRow,
  removeRow,
  restoreRow,
}: OptionsEditorProps) => {
  const t = useTranslation();

  return (
    <InputWithLabelRow
      label={t('label.property-options')}
      labelProps={{
        sx: { textAlign: 'end', alignSelf: 'flex-start', pt: 0.5 },
      }}
      labelWidth="140px"
      Input={
        <Box display="flex" flexDirection="column" gap={0.5} flex={1}>
          {rows.length === 0 && (
            <Typography color="text.secondary" sx={{ pb: 1 }}>
              {t('label.no-property-options')}
            </Typography>
          )}
          {rows.map(row => (
            <OptionRow
              key={row.id}
              row={row}
              updateRow={updateRow}
              removeRow={removeRow}
              restoreRow={restoreRow}
            />
          ))}
          <Box>
            <ButtonWithIcon
              Icon={<PlusCircleIcon />}
              label={t('button.add-option')}
              onClick={addRow}
            />
          </Box>
        </Box>
      }
    />
  );
};
