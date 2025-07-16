import React, { FC, ReactNode, useEffect, useState } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  Grid,
  useTranslation,
  BasicTextInput,
  DateUtils,
  UserIcon,
  useFormatDateTime,
  ClinicianNode,
  useIntlUtils,
  DocumentRegistryCategoryNode,
  SxProps,
  Theme,
} from '@openmsupply-client/common';
import {
  EncounterFragment,
  useClinicians,
  useDocumentRegistry,
} from '@openmsupply-client/programs';
import {
  ClinicianAutocompleteOption,
  ClinicianSearchInput,
} from '../../Clinician';
import { DateTimePickerInput } from '@common/components';

const Row = ({
  label,
  Input,
  sx,
}: {
  label: string;
  Input: ReactNode;
  sx?: SxProps<Theme>;
}) => (
  <InputWithLabelRow labelWidth="90px" label={label} Input={Input} sx={sx} />
);

/**
 * Updates the date component of the endDate to match the date of the startDatetime.
 * If the startDatetime is not provided the current date is used.
 */
const updateEndDatetimeFromStartDate = (
  endDate: Date,
  startDatetime: string | undefined
) => {
  return DateUtils.formatRFC3339(
    new Date(
      new Date(startDatetime ?? '').setHours(
        endDate.getHours(),
        endDate.getMinutes()
      )
    )
  );
};

interface ToolbarProps {
  onChange: (patch: Partial<EncounterFragment>) => void;
  encounter: EncounterFragment;
}
export const Toolbar: FC<ToolbarProps> = ({ encounter, onChange }) => {
  const [startDatetime, setStartDatetime] = useState<string | undefined>();
  const [endDatetime, setEndDatetime] = useState<string | undefined | null>();
  const t = useTranslation();
  const { localisedDate, getDisplayAge } = useFormatDateTime();
  const { getLocalisedFullName } = useIntlUtils();
  const [clinician, setClinician] =
    useState<ClinicianAutocompleteOption | null>();
  const { data: programEnrolmentRegistry } =
    useDocumentRegistry.get.documentRegistries({
      filter: {
        category: { equalTo: DocumentRegistryCategoryNode.ProgramEnrolment },
        contextId: { equalTo: encounter?.contextId },
      },
    });

  const { data: clinicians } = useClinicians.document.list({});
  const hasClinicians = clinicians?.nodes.length !== 0;

  useEffect(() => {
    setStartDatetime(encounter.startDatetime);
    setEndDatetime(encounter.endDatetime);
    if (encounter.clinician) {
      setClinician({
        id: encounter.clinician.id,
        label: getLocalisedFullName(
          encounter.clinician.firstName,
          encounter.clinician.lastName
        ),
        value: encounter.clinician,
      });
    }
  }, [encounter, getLocalisedFullName]);

  const { patient } = encounter;

  const dateOfBirth = DateUtils.getNaiveDate(patient?.dateOfBirth);

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="center"
      >
        <Grid
          sx={theme => ({
            alignItems: 'center',
            backgroundColor: 'background.menu',
            borderRadius: '50%',
            display: 'none',
            height: '100px',
            justifyContent: 'center',
            marginRight: 2,
            width: '100px',
            [theme.breakpoints.up('lg')]: {
              display: 'flex',
            },
          })}
        >
          <Box>
            <UserIcon fontSize="large" style={{ flex: 1 }} />
          </Box>
        </Grid>
        <Grid display="flex" flex={1}>
          <Box display="flex" flex={1} flexDirection="column" gap={0.5}>
            <Box display="flex" gap={1.5}>
              <Row
                label={t('label.patient')}
                Input={
                  <BasicTextInput disabled value={encounter?.patient.name} />
                }
              />
              <Row
                label={t('label.date-of-birth')}
                Input={
                  <BasicTextInput
                    disabled
                    value={localisedDate(patient.dateOfBirth ?? '')}
                  />
                }
              />
              <InputWithLabelRow
                label={t('label.age')}
                labelWidth={'40px'}
                Input={
                  <BasicTextInput
                    disabled
                    value={getDisplayAge(dateOfBirth ?? null)}
                  />
                }
              />
            </Box>
            <Box display="flex" gap={1.5}>
              <Row
                label={t('label.program')}
                Input={
                  <BasicTextInput
                    disabled
                    value={programEnrolmentRegistry?.nodes?.[0]?.name ?? ''}
                  />
                }
              />
              {hasClinicians && (
                <Row
                  label={t('label.clinician')}
                  Input={
                    <ClinicianSearchInput
                      onChange={clinician => {
                        setClinician(clinician);
                        onChange({
                          clinician: clinician?.value as ClinicianNode,
                        });
                      }}
                      clinicianValue={clinician?.value}
                    />
                  }
                />
              )}
            </Box>
            <Box display="flex" gap={1}>
              <Row
                label={t('label.visit-date')}
                Input={
                  <DateTimePickerInput
                    value={DateUtils.getDateOrNull(startDatetime ?? null)}
                    onChange={date => {
                      const startDatetime = DateUtils.formatRFC3339(date);
                      setStartDatetime(startDatetime);
                      const endDt = DateUtils.getDateOrNull(endDatetime);
                      onChange({
                        startDatetime,
                        endDatetime: endDt
                          ? updateEndDatetimeFromStartDate(endDt, startDatetime)
                          : undefined,
                      });
                    }}
                  />
                }
              />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
