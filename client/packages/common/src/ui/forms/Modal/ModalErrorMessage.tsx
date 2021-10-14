import * as React from 'react';
import { Typography } from '@mui/material';
import { useFormContext, get, FieldErrors, Message } from 'react-hook-form';

export type ModalErrorMessageProps = {
  errors?: FieldErrors;
  name: string;
  message?: Message;
};
export const ModalErrorMessage: React.FC<ModalErrorMessageProps> = ({
  errors,
  name,
  message,
}) => {
  const methods = useFormContext();
  const error = get(errors || methods.formState.errors, name);

  if (!error) {
    return null;
  }

  const { message: messageFromRegister } = error;
  return (
    <Typography sx={{ color: 'error.main', fontSize: '12px' }}>
      {messageFromRegister || message}
    </Typography>
  );
};
