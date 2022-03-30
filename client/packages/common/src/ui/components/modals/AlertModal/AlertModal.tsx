import React, { useContext } from 'react';
import { AlertModalContext } from './AlertModalContext';
export interface AlertModalProps {
  important?: boolean;
  message: React.ReactNode;
  open: boolean;
  onOk: () => void;
  title: string;
}

// This is really just a convenience component
// allowing you to use the modal in a declarative syntax
// without creating multiple overlaying modals
// Set the important prop only if this is a critical alert
// which should only be superceded by other critical alerts
// Apart from the important / non-important distinction,
// the latest caller wins, and will be displayed
export const AlertModal: React.FC<AlertModalProps> = ({
  important,
  message,
  onOk,
  open,
  title,
}) => {
  const alertContext = useContext(AlertModalContext);
  const {
    setState,
    open: isCurrentlyOpen,
    important: isCurrentlyImportant,
  } = alertContext;

  React.useEffect(() => {
    if (isCurrentlyOpen && !!isCurrentlyImportant && !important) return;
    setState({ important, message, onOk, open, title });
  }, [important, message, onOk, open, title]);

  return <></>;
};
