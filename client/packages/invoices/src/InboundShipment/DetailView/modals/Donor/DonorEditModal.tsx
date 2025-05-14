import React, { useEffect, useState } from 'react';
import {
  Autocomplete,
  Box,
  useDialog,
  DialogButton,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useName } from 'packages/system/src';

interface DonorEditModalProps {
  donorId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DonorOption {
  label: string;
  value: string;
  id: string;
}

export const DonorEditModal = ({
  donorId,
  isOpen,
  onClose,
}: DonorEditModalProps) => {
  const { error } = useNotification();
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose });

  const [val, setVal] = useState<DonorOption | undefined>();

  const { data } = useName.document.donors();

  const donorOptions = data?.nodes.map(node => ({
    label: node.name,
    value: node.id,
    id: node.id,
  }));

  useEffect(() => {
    const donor = donorOptions?.find(donor => (donor.id = donorId));
    donor && setVal(donor);
  }, [donorId, data]);

  const handleSave = () => {
    console.log('TODO add update donor id');
  };

  return (
    <Modal
      title={t('heading.service-charges')}
      width={900}
      height={300}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            try {
              await handleSave();
              onClose();
            } catch {
              error(t('error.failed-to-save-service-charges'))();
            }
          }}
        />
      }
    >
      <Box height={300}>
        <Box flex={1} marginBottom={1} justifyContent="flex-end" display="flex">
          <Autocomplete value={val} options={donorOptions ?? []} />
          <Autocomplete options={[]} />
        </Box>
      </Box>
    </Modal>
  );
};
