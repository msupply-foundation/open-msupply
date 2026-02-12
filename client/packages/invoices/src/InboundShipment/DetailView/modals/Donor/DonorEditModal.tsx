import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  useDialog,
  DialogButton,
  useNotification,
  useTranslation,
  Select,
  ApplyToLinesInput,
} from '@openmsupply-client/common';
import { useName } from '@openmsupply-client/system';
import { useInbound } from '../../../api';

interface DonorEditModalProps {
  invoiceId: string;
  donorId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DonorOption {
  label: string;
  value: string | null;
  id: string | null;
}

export const DonorEditModal = ({
  invoiceId,
  donorId,
  isOpen,
  onClose,
}: DonorEditModalProps) => {
  const { error } = useNotification();
  const t = useTranslation();
  const { Modal } = useDialog({
    isOpen,
    onClose,
    disableMobileFullScreen: true,
  });
  const { mutateAsync } = useInbound.document.update();

  const [donor, setDonor] = useState<DonorOption | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [method, setMethod] = useState(ApplyToLinesInput.None);

  const width = '350px';

  const { data } = useName.document.donors();

  const donorOptions: DonorOption[] = useMemo(
    () =>
      data?.nodes.map(node => ({
        label: node.name,
        value: node.id,
        id: node.id,
      })) ?? [],
    [data]
  );

  useEffect(() => {
    const donorFound = donorOptions?.find(donor => donor.id === donorId);
    if (donorFound) {
      setDonor(donorFound);
      setIsDirty(false);
    }
  }, [donorId, donorOptions]);

  const confirm = () =>
    mutateAsync({
      id: invoiceId,
      defaultDonorUpdate: {
        donorId: donor?.id ?? null,
        applyToLines: method,
      },
    });

  return (
    <Modal
      title={t('heading.donor-update')}
      width={600}
      sx={{ '& .MuiDialogContent-root': { paddingTop: 0 } }}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          disabled={!isDirty}
          onClick={async () => {
            try {
              await confirm();
              onClose();
            } catch {
              error(t('error.failed-to-save-donor-charges'))();
            }
          }}
        />
      }
    >
      <Box display="flex" width="100%" justifyContent="center" padding={3}>
        <Box display="flex" flexDirection="column" gap={2}>
          <Autocomplete
            value={donor}
            options={donorOptions ?? []}
            fullWidth={true}
            onChange={(_e, value) => {
              setDonor(value);
              setIsDirty(true);
            }}
            clearable
            width={width}
            inputProps={{
              label: t('label.donor'),
              placeholder: t('label.no-donor-selected'),
            }}
          />
          <Select
            label={t('label.apply-donor-which-lines')}
            value={method ?? ''}
            options={[
              {
                label: t('label.all-lines'),
                value: ApplyToLinesInput.AssignToAll,
              },
              {
                label: t('label.apply-donor-existing'),
                value: ApplyToLinesInput.UpdateExistingDonor,
              },
              {
                label: t('label.apply-donor-unassigned'),
                value: ApplyToLinesInput.AssignIfNone,
              },
              {
                label: t('label.none'),
                value: ApplyToLinesInput.None,
              },
            ]}
            onChange={e => {
              const newMethod = e.target.value as ApplyToLinesInput;
              setMethod(newMethod);

              // If not applying change to any lines, is dirty should only
              // get set if the shipment donor changes
              if (newMethod !== ApplyToLinesInput.None) {
                setIsDirty(true);
              }
            }}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
      </Box>
    </Modal>
  );
};
