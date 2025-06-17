import React, { useState } from 'react';
import {
  Autocomplete,
  Box,
  IconButton,
  PlusCircleIcon,
  Typography,
  useIntlUtils,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { ClinicianFragment, useClinicians } from '@openmsupply-client/programs';
import { ClinicianAutocompleteOption, Clinician } from './utils';
import { ClinicianSlider } from './ClinicianSlider';
import { NewClinicianModal } from './NewClinicianModal';

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
  const [sliderOpen, setSliderOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { data, refetch } = useClinicians.document.list({});
  const { getLocalisedFullName } = useIntlUtils();
  const clinicians: ClinicianFragment[] = data?.nodes ?? [];
  const theme = useTheme();

  const asOption = (clinician: Clinician): ClinicianAutocompleteOption => ({
    label: getLocalisedFullName(clinician.firstName, clinician.lastName),
    value: clinician,
    id: clinician.id,
  });

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
      />
      {allowCreate && (
        <>
          <IconButton
            icon={<PlusCircleIcon />}
            label={t('button.add-new-clinician')}
            color="secondary"
            onClick={() =>
              mountSlidePanel ? setSliderOpen(true) : setModalOpen(true)
            }
          />
          {mountSlidePanel ? (
            <ClinicianSlider
              width={500}
              open={sliderOpen}
              onClose={async clinicianId => {
                setSliderOpen(false);
                if (clinicianId) {
                  const refreshedList = await refetch();
                  const newClinician = refreshedList.data?.nodes.find(
                    c => c.id === clinicianId
                  );
                  onChange(newClinician ? asOption(newClinician) : null);
                }
              }}
              existingClinicians={clinicians}
            />
          ) : (
            <NewClinicianModal
              onClose={async clinicianId => {
                setModalOpen(false);
                if (clinicianId) {
                  const refreshedList = await refetch();
                  const newClinician = refreshedList.data?.nodes.find(
                    c => c.id === clinicianId
                  );
                  onChange(newClinician ? asOption(newClinician) : null);
                }
              }}
              open={modalOpen}
              existingClinicians={clinicians}
            />
          )}
        </>
      )}
    </Box>
  );
};
