import React, { FC, ReactNode, useEffect, useState } from 'react';
import {
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  Grid,
  useTranslation,
  BasicTextInput,
  DateUtils,
  TimePickerInput,
  UserIcon,
  useFormatDateTime,
  ClinicianNode,
  EncounterNodeStatus,
  LocaleKey,
  TypedTFunction,
  Option,
  useIntlUtils,
  DocumentRegistryCategoryNode,
  DeleteIcon,
  SxProps,
  Theme,
} from '@openmsupply-client/common';
import {
  EncounterFragment,
  useDocumentRegistry,
} from '@openmsupply-client/programs';
import {
  ClinicianAutocompleteOption,
  ClinicianSearchInput,
} from '../../Clinician';
import { Clinician } from '../../Clinician/utils';
import {
  DateTimePickerInput,
  IconButton,
  Select,
  useConfirmationModal,
} from '@common/components';
import { encounterStatusTranslation } from '../utils';

const encounterStatusOption = (
  status: EncounterNodeStatus,
  t: TypedTFunction<LocaleKey>
): Option => {
  return {
    label: encounterStatusTranslation(status, t),
    value: status,
  };
};

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
  onDelete: () => void;
  encounter: EncounterFragment;
}
export const Toolbar: FC<ToolbarProps> = ({
  encounter,
  onChange,
  onDelete,
}) => {
  const [status, setStatus] = useState<EncounterNodeStatus | undefined>(
    encounter.status ?? undefined
  );
  const [startDatetime, setStartDatetime] = useState<string | undefined>();
  const [endDatetime, setEndDatetime] = useState<string | undefined | null>();
  const t = useTranslation('dispensary');
  const { localisedDate } = useFormatDateTime();
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

  useEffect(() => {
    setStatus(encounter.status ?? undefined);
    setStartDatetime(encounter.startDatetime);
    setEndDatetime(encounter.endDatetime);
    setClinician({
      label: getLocalisedFullName(
        encounter.clinician?.firstName,
        encounter.clinician?.lastName
      ),
      value: encounter.clinician as Clinician,
    });
  }, [encounter]);

  const getDeleteConfirmation = useConfirmationModal({
    message: t('message.confirm-delete-encounter'),
    title: t('title.confirm-delete-encounter'),
  });

  const onDeleteClick = () => {
    getDeleteConfirmation({
      onConfirm: () => {
        setStatus(EncounterNodeStatus.Deleted);
        onDelete();
      },
    });
  };

  const { patient } = encounter;

  const statusOptions = [
    encounterStatusOption(EncounterNodeStatus.Pending, t),
    encounterStatusOption(EncounterNodeStatus.Visited, t),
    encounterStatusOption(EncounterNodeStatus.Cancelled, t),
  ];
  if (status === EncounterNodeStatus.Deleted) {
    statusOptions.push(encounterStatusOption(EncounterNodeStatus.Deleted, t));
  }
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
          item
          sx={{
            alignItems: 'center',
            backgroundColor: 'background.menu',
            borderRadius: '50%',
            display: 'flex',
            height: '100px',
            justifyContent: 'center',
            marginRight: 2,
            width: '100px',
          }}
        >
          <Box>
            <UserIcon fontSize="large" style={{ flex: 1 }} />
          </Box>
        </Grid>
        <Grid item display="flex" flex={1}>
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

              <Row
                label={t('label.encounter-status')}
                sx={{ marginLeft: 'auto' }}
                Input={
                  <Select
                    fullWidth
                    onChange={event => {
                      const newStatus = event.target
                        .value as EncounterNodeStatus;
                      setStatus(newStatus);
                      onChange({
                        status: newStatus,
                      });
                    }}
                    options={statusOptions}
                    value={status}
                  />
                }
              />

              <IconButton
                icon={<DeleteIcon />}
                onClick={onDeleteClick}
                label={t('label.delete')}
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
                    clinicianLabel={clinician?.label || ''}
                    clinicianValue={clinician?.value}
                  />
                }
              />
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
              <InputWithLabelRow
                label={t('label.visit-start')}
                labelWidth="60px"
                Input={
                  <TimePickerInput
                    value={DateUtils.getDateOrNull(startDatetime ?? null)}
                    onChange={date => {
                      const startDatetime = date
                        ? DateUtils.formatRFC3339(date)
                        : undefined;
                      if (startDatetime) {
                        setStartDatetime(startDatetime);
                        onChange({
                          startDatetime,
                          endDatetime: endDatetime ?? undefined,
                        });
                      }
                    }}
                  />
                }
              />
              <InputWithLabelRow
                label={t('label.visit-end')}
                labelWidth="60px"
                Input={
                  <TimePickerInput
                    value={DateUtils.getDateOrNull(endDatetime ?? null)}
                    onChange={date => {
                      const endDatetime = date
                        ? updateEndDatetimeFromStartDate(date, startDatetime)
                        : undefined;
                      if (endDatetime) {
                        setEndDatetime(endDatetime);
                        onChange({ endDatetime });
                      }
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
