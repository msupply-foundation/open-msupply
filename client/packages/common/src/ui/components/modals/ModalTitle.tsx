import React, { FC } from 'react';
import DialogTitle from '@mui/material/DialogTitle';

interface ModalTitleProps {
  title: string;
}

export const ModalTitle: FC<ModalTitleProps> = ({ title }) => (
  <DialogTitle
    sx={{
      color: theme => theme.typography.body1.color,
      fontSize: theme => theme.typography.body1.fontSize,
      fontWeight: 'bold',
    }}
  >
    {title}
  </DialogTitle>
);
