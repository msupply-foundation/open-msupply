import React, { useState } from 'react';
import {
  BasicSpinner,
  Box,
  useDialog,
  DialogButton,
} from '@openmsupply-client/common';

interface InputModalProps {
  isOpen: boolean;
  Input: React.ReactNode;
  onClose: () => void;
  title: string;
  onChange: () => Promise<void> | void;
}

export const InputModal = ({
  Input,
  onChange,
  isOpen,
  onClose,
  title,
}: InputModalProps) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const [loading, setLoading] = useState(false);

  return (
    <Modal
      title={title}
      width={500}
      height={200}
      cancelButton={
        <DialogButton disabled={loading} variant="cancel" onClick={onClose} />
      }
      okButton={
        <DialogButton
          disabled={loading}
          variant="ok"
          onClick={async () => {
            setLoading(true);
            await onChange();
            setLoading(false);
            onClose();
          }}
        />
      }
    >
      <Box flex={1} display="flex" justifyContent="center" marginTop="30px">
        {!loading ? (
          Input
        ) : (
          <Box sx={{ height: 50 }}>
            <BasicSpinner messageKey="saving" />
          </Box>
        )}
      </Box>
    </Modal>
  );
};
