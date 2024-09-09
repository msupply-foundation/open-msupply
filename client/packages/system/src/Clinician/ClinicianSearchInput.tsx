import { Autocomplete, useIntlUtils } from '@openmsupply-client/common';
import { ClinicianFragment, useClinicians } from '@openmsupply-client/programs';
import React from 'react';
import { FC } from 'react';
import { ClinicianAutocompleteOption, Clinician } from './utils';

interface ClinicianSearchInputProps {
  onChange: (clinician: ClinicianAutocompleteOption | null) => void;
  width?: number;
  clinicianValue: Clinician | null | undefined;
}

export const ClinicianSearchInput: FC<ClinicianSearchInputProps> = ({
  onChange,
  width = 250,
  clinicianValue,
}) => {
  const { data } = useClinicians.document.list({});
  const { getLocalisedFullName } = useIntlUtils();
  const clinicians: ClinicianFragment[] = data?.nodes ?? [];

  return (
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
      width={`${width}px`}
      onChange={(_, option) => {
        onChange(option);
      }}
      options={clinicians.map(
        (clinician): ClinicianAutocompleteOption => ({
          label: getLocalisedFullName(clinician.firstName, clinician.lastName),
          value: {
            firstName: clinician.firstName ?? '',
            lastName: clinician.lastName ?? '',
            id: clinician.id,
          },
        })
      )}
      sx={{ minWidth: width }}
    />
  );
};
