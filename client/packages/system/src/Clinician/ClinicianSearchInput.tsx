import React, { useState } from 'react';
import {
  Autocomplete,
  Box,
  Typography,
  useConfirmationModal,
  useIntlUtils,
  useNotification,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { ClinicianFragment, useClinicians } from '@openmsupply-client/programs';
import {
  ClinicianAutocompleteOption,
  Clinician,
  isExistingCode,
} from './utils';
import { CreateClinicianSlider } from './CreateClinicianSlider';
import { CreateClinicianModal } from './CreateClinicianModal';
import { useCreateClinician } from './useCreateClinician';

interface ClinicianSearchInputProps {
  onChange: (clinician: ClinicianAutocompleteOption | null) => void;
  width?: number;
  clinicianValue: Clinician | null | undefined;
  disabled?: boolean;
  fullWidth?: boolean;
  allowCreate?: boolean;
  mountSlidePanel?: boolean;
}

export const ClinicianSearchInput = ({
  onChange,
  width = 250,
  clinicianValue,
  disabled,
  fullWidth,
  allowCreate,
  mountSlidePanel = false,
}: ClinicianSearchInputProps) => {
  const t = useTranslation();
  const theme = useTheme();
  const { getLocalisedFullName } = useIntlUtils();
  const { error, success } = useNotification();
  const { data, refetch } = useClinicians.document.list({});
  const { isSaving, draft, updateDraft, isValid, save, clear } =
    useCreateClinician();

  const clinicians: ClinicianFragment[] = data?.nodes ?? [];

  const [editorOpen, setEditorOpen] = useState(false);

  const handleCreateClick = () => {
    onChange(null);
    setEditorOpen(true);
  };

  const asOption = (clinician: Clinician): ClinicianAutocompleteOption => ({
    label: getLocalisedFullName(clinician.firstName, clinician.lastName),
    value: clinician,
    id: clinician.id,
  });

  const handleClinicianClose = async (clinicianId?: string) => {
    setEditorOpen(false);

    if (clinicianId) {
      const refreshedList = await refetch();
      const newClinician = refreshedList.data?.nodes.find(
        c => c.id === clinicianId
      );
      onChange(newClinician ? asOption(newClinician) : null);
    }
    clear();
  };

  const handleSave = async () => {
    try {
      const result = await save();
      success(t('messages.created-clinician'))();
      handleClinicianClose(result.id);
    } catch (e) {
      const errorSnack = error((e as Error).message);
      errorSnack();
    }
  };

  const confirm = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.clinician-code-already-exists'),
    onConfirm: handleSave,
  });

  const confirmAndSave = () => {
    if (isExistingCode(clinicians, draft.code)) {
      confirm();
    } else {
      handleSave();
    }
  };

  return (
    <Box width={`${width}px`} display={'flex'} alignItems="center">
      <Autocomplete
        value={clinicianValue ? asOption(clinicianValue) : null}
        isOptionEqualToValue={(option, value) =>
          option.value.id === value.value?.id
        }
        onChange={(_, option) => {
          onChange(option);
        }}
        options={clinicians.map(
          (clinician): ClinicianAutocompleteOption => asOption(clinician)
        )}
        sx={{ width: '100%' }}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Typography>{option.label}</Typography>
          </li>
        )}
        textSx={{ backgroundColor: theme.palette.background.drawer }}
        disabled={disabled}
        fullWidth={fullWidth}
        clickableOption={
          allowCreate
            ? {
                label: t('label.create-clinician'),
                onClick: handleCreateClick,
              }
            : undefined
        }
      />
      {allowCreate &&
        (mountSlidePanel ? (
          <CreateClinicianSlider
            draft={draft}
            updateDraft={updateDraft}
            width={500}
            open={editorOpen}
            onClose={handleClinicianClose}
            confirmAndSave={confirmAndSave}
            isSaving={isSaving}
            isValid={isValid}
          />
        ) : (
          <CreateClinicianModal
            draft={draft}
            updateDraft={updateDraft}
            onClose={handleClinicianClose}
            open={editorOpen}
            confirmAndSave={confirmAndSave}
            isSaving={isSaving}
            isValid={isValid}
          />
        ))}
    </Box>
  );
};
