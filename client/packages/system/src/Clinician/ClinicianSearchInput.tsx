import {
  Autocomplete,
  Box,
  IconButton,
  PlusCircleIcon,
  useIntlUtils,
  useTheme,
  useTranslation,
} from '@openmsupply-client/common';
import { ClinicianFragment, useClinicians } from '@openmsupply-client/programs';
import React from 'react';
import { FC } from 'react';
import { ClinicianAutocompleteOption, Clinician } from './utils';

interface ClinicianSearchInputProps {
  onChange: (clinician: ClinicianAutocompleteOption | null) => void;
  width?: number;
  clinicianValue: Clinician | null | undefined;
  disabled?: boolean;
  fullWidth?: boolean;
  allowCreate?: boolean;
}

export const ClinicianSearchInput: FC<ClinicianSearchInputProps> = ({
  onChange,
  width = 250,
  clinicianValue,
  disabled,
  fullWidth,
  allowCreate,
}) => {
  const t = useTranslation();
  const { data } = useClinicians.document.list({});
  const { getLocalisedFullName } = useIntlUtils();
  const clinicians: ClinicianFragment[] = data?.nodes ?? [];
  const theme = useTheme();

  return (
    <Box width={`${width}px`} display={'flex'} alignItems="center">
      <Autocomplete
        value={
          clinicianValue
            ? {
                label: getLocalisedFullName(
                  clinicianValue.firstName,
                  clinicianValue.lastName
                ),
                value: clinicianValue,
              }
            : null
        }
        isOptionEqualToValue={(option, value) =>
          option.value.id === value.value?.id
        }
        onChange={(_, option) => {
          onChange(option);
        }}
        options={clinicians.map(
          (clinician): ClinicianAutocompleteOption => ({
            label: getLocalisedFullName(
              clinician.firstName,
              clinician.lastName
            ),
            value: {
              firstName: clinician.firstName ?? '',
              lastName: clinician.lastName ?? '',
              id: clinician.id,
            },
          })
        )}
        sx={{ width: '100%' }}
        textSx={{ backgroundColor: theme.palette.background.drawer }}
        disabled={disabled}
        fullWidth={fullWidth}
      />
      {allowCreate && (
        <IconButton
          icon={<PlusCircleIcon />}
          label={t('button.add-new-clinician')}
          color="secondary"
          onClick={() => console.log('lets go girls')}
        />
      )}
    </Box>
  );
};
