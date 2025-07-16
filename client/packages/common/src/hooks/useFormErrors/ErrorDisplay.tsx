import React from 'react';
import {
  List,
  ListItem,
  useTranslation,
  AlertIcon,
} from '@openmsupply-client/common';
import { Alert } from '@common/components';
import { useFormErrorContext } from './FormErrorContext';

export const ErrorDisplay = () => {
  const t = useTranslation();
  const { errors, displayRequiredErrors } = useFormErrorContext();

  const errorList = Object.entries(errors)
    .filter(([_, value]) => {
      if (value.error) return true;

      if (displayRequiredErrors && value.requiredError) return true;

      return false;
    })
    .map(([key, value]) => ({
      label: value.label ?? key,
      errorMessage: value.error ?? value.requiredError ?? '',
    }));

  if (errorList.length === 0) return null;

  return (
    <Alert
      severity="error"
      sx={{
        whiteSpace: 'pre-wrap',
        '& .MuiAlert-icon': { alignItems: 'center' },
      }}
      Icon={<AlertIcon fontSize="large" />}
    >
      {t('messages.alert-problem-with-form-input')}
      <List sx={{ m: 0, p: 0 }}>
        {errorList.map(({ label, errorMessage }) => {
          return (
            <ListItem
              key={label}
              sx={{ pt: 0, pb: 0, m: 0 }}
            >{`- ${label}: ${errorMessage}`}</ListItem>
          );
        })}
      </List>
    </Alert>
  );
};
