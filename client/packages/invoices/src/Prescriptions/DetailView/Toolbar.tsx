import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  Grid,
  useTranslation,
  useIntlUtils,
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
} from '@openmsupply-client/common';
import { PatientSearchInput } from '@openmsupply-client/system';
import { usePrescription } from '../api';
import { ClinicianSearchInput } from '../../../../system/src/Clinician';

export const Toolbar: FC = () => {
  const { id, patient, clinician, update } = usePrescription.document.fields([
    'id',
    'patient',
    'clinician',
  ]);
  const onDelete = usePrescription.line.deleteSelected();
  const { getLocalisedFullName } = useIntlUtils();

  const isDisabled = usePrescription.utils.isDisabled();
  const t = useTranslation('dispensary');

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="flex-end"
      >
        <Grid item display="flex" flex={1}>
          <Box display="flex" flex={1} flexDirection="column" gap={1}>
            {patient && (
              <InputWithLabelRow
                label={t('label.patient')}
                Input={
                  <PatientSearchInput
                    disabled={isDisabled}
                    value={patient}
                    onChange={async ({ id: otherPartyId }) => {
                      await update({ id, otherPartyId });
                    }}
                  />
                }
              />
            )}
            <InputWithLabelRow
              label={t('label.clinician')}
              Input={
                <ClinicianSearchInput
                  onChange={async clinician => {
                    await update({
                      id,
                      clinicianId: clinician?.value?.id ?? undefined,
                    });
                  }}
                  clinicianLabel={getLocalisedFullName(
                    clinician?.firstName,
                    clinician?.lastName
                  )}
                />
              }
            />
          </Box>
        </Grid>
        <Grid
          item
          display="flex"
          gap={1}
          justifyContent="flex-end"
          alignItems="center"
        >
          <DropdownMenu label={t('label.actions')}>
            <DropdownMenuItem
              IconComponent={DeleteIcon}
              onClick={onDelete}
              disabled={isDisabled}
            >
              {t('button.delete-lines')}
            </DropdownMenuItem>
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
