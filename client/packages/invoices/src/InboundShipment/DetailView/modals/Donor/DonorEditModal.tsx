import React, { useEffect, useState } from 'react';
import {
  Autocomplete,
  Box,
  useDialog,
  DialogButton,
  useNotification,
  useTranslation,
  InputWithLabelRow,
  UpdateDonorMethodInput,
  Typography,
  LocaleKey,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useName } from 'packages/system/src';
import { getDonorUpdateKeys } from 'packages/system/src/utils';
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

interface MethodOption {
  label: string;
  value: UpdateDonorMethodInput;
  message: LocaleKey;
}

export const DonorEditModal = ({
  invoiceId,
  donorId,
  isOpen,
  onClose,
}: DonorEditModalProps) => {
  const { error } = useNotification();
  const t = useTranslation();
  const { Modal } = useDialog({ isOpen, onClose });
  const { mutateAsync } = useInbound.document.update();
  const defaultMethod = {
    label: t(getDonorUpdateKeys(UpdateDonorMethodInput.None).label),
    value: UpdateDonorMethodInput.None,
    message: getDonorUpdateKeys(UpdateDonorMethodInput.None).message,
  };

  const [donor, setDonor] = useState<DonorOption | undefined>();
  const [method, setMethod] = useState<MethodOption>(defaultMethod);

  const width = '350px';

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.update-all-children-lines'),
  });

  const { data } = useName.document.donors();

  const donorOptions: DonorOption[] =
    data?.nodes.map(node => ({
      label: node.name,
      value: node.id,
      id: node.id,
    })) ?? [];

  const nullOption = {
    label: t('label.set-to-none'),
    value: null,
    id: null,
  };

  donorOptions.push(nullOption);

  type IsMethod = keyof typeof UpdateDonorMethodInput;
  const methodOptions: MethodOption[] = (
    Object.keys(UpdateDonorMethodInput) as Array<IsMethod>
  ).map(key => {
    const valueKeys = getDonorUpdateKeys(UpdateDonorMethodInput[key]);
    return {
      label: t(valueKeys.label),
      value: UpdateDonorMethodInput[key],
      message: valueKeys.message,
    };
  });

  useEffect(() => {
    const donorFound = donorOptions?.find(donor => (donor.id = donorId));
    donorFound ? setDonor(donorFound) : setDonor(nullOption);
  }, [donorId, data]);

  const confirm = () => {
    mutateAsync({
      id: invoiceId,
      defaultDonorId: donor?.id,
      updateDonorMethod: method.value,
    });
  };

  const handleSave = () => {
    // only prompt confirm if we are making updates to children lines
    method.value != UpdateDonorMethodInput.None
      ? getConfirmation({
          onConfirm: () => {
            confirm();
          },
        })
      : confirm();
  };

  return (
    <Modal
      title={t('heading.donor-changes')}
      width={600}
      sx={{ '& .MuiDialogContent-root': { paddingTop: 0 } }}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            try {
              await handleSave();
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
          <InputWithLabelRow
            labelWidth="160px"
            label={t('label.donor')}
            labelProps={{
              sx: {
                fontSize: '16px',
                paddingRight: 2,
                textAlign: 'right',
              },
            }}
            Input={
              <Autocomplete
                value={donor}
                options={donorOptions ?? []}
                fullWidth={true}
                onChange={(_e, value) => {
                  value && setDonor(value);
                }}
                clearable={false}
                width={width}
              />
            }
          />
          <InputWithLabelRow
            labelWidth="160px"
            label={t('label.donor-line-update')}
            labelProps={{
              sx: {
                fontSize: '16px',
                paddingRight: 2,
                textAlign: 'right',
              },
            }}
            Input={
              <Autocomplete
                options={methodOptions ?? []}
                fullWidth={true}
                defaultValue={method}
                onChange={(_e, value) => {
                  value && setMethod(value);
                }}
                // on clear, we set default of no changes
                onInputChange={(_e, _value, reason) => {
                  if (reason === 'clear') {
                    setMethod(defaultMethod);
                  }
                }}
                width={width}
              />
            }
          />
          <Typography
            sx={{
              fontSize: '1em',
              fontWeight: 'bold',
            }}
          >
            {t(method.message, { donor: donor?.label })}
          </Typography>
        </Box>
      </Box>
    </Modal>
  );
};
