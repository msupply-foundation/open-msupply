import React, { FC } from 'react';
import DialogTitle from '@mui/material/DialogTitle';

interface ModalTitleProps {
  title: string;
  headerActions?: React.ReactNode;
}

export const ModalTitle: FC<ModalTitleProps> = ({ title, headerActions }) => (
  <DialogTitle
    sx={{
      color: theme => theme.typography.body1.color,
      fontSize: theme => theme.typography.body1.fontSize,
      fontWeight: 'bold',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}
  >
    {title}
    {headerActions}
  </DialogTitle>
);
