import React from 'react';
import { SxProps } from '@mui/material';
import { useTranslation } from '@common/intl';
import { Alert } from '@common/components';
import { List, ListItem } from '@mui/material';
import { useFormErrorStore, selectVisibleError } from './store';

/**
 * Renders a summary of the visible errors for a given form. Hidden when there
 * are no visible errors.
 */
export const ErrorDisplay = ({
  formId,
  sx,
}: {
  formId: string;
  sx?: SxProps;
}) => {
  const t = useTranslation();
  const errors = useFormErrorStore(state => {
    const form = state.forms[formId];
    if (!form) return [];
    const list: { fieldId: string; label: string; message: string }[] = [];
    Object.entries(form.fields).forEach(([fieldId, entry]) => {
      const visible = selectVisibleError(entry, form.showRequired);
      if (visible) {
        list.push({
          fieldId,
          label: visible.label || fieldId,
          message: visible.message,
        });
      }
    });
    return list;
  }, errorListEquality);

  if (errors.length === 0) return null;

  return (
    <Alert
      severity="error"
      sx={{
        whiteSpace: 'pre-wrap',
        '& .MuiAlert-icon': { alignItems: 'center' },
        ...sx,
      }}
    >
      {t('messages.alert-problem-with-form-input')}
      <List sx={{ m: 0, p: 0 }}>
        {errors.map(({ fieldId, label, message }) => (
          <ListItem
            key={fieldId}
            sx={{ pt: 0, pb: 0, m: 0 }}
          >{`- ${label}: ${message}`}</ListItem>
        ))}
      </List>
    </Alert>
  );
};

const errorListEquality = (
  a: { fieldId: string; label: string; message: string }[],
  b: { fieldId: string; label: string; message: string }[]
): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (
      ai!.fieldId !== bi!.fieldId ||
      ai!.label !== bi!.label ||
      ai!.message !== bi!.message
    ) {
      return false;
    }
  }
  return true;
};
