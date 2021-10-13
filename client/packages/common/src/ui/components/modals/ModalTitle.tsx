import React, { FC } from 'react';
import DialogTitle from '@mui/material/DialogTitle';
import { LocaleKey, useTranslation } from '../../../intl/intlHelpers';

interface ModalTitleProps {
  title: LocaleKey;
}

export const ModalTitle: FC<ModalTitleProps> = ({ title }) => {
  const t = useTranslation();

  return (
    <DialogTitle
      sx={{
        color: theme => theme.typography.body1.color,
        fontSize: theme => theme.typography.body1.fontSize,
        fontWeight: 'bold',
      }}
    >
      {t(title)}
    </DialogTitle>
  );
};
