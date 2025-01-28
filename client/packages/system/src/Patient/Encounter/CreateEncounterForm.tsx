import React, { FC, useState } from 'react';
import {
  InputWithLabelRow,
  useAuthContext,
  TextArea,
  DateTimePickerInput,
  Tooltip,
} from '@openmsupply-client/common';
import { DateUtils, useTranslation } from '@common/intl';
import { NoteSchema, EncounterSchema } from '@openmsupply-client/programs';
import {
  ClinicianAutocompleteOption,
  ClinicianSearchInput,
} from '../../Clinician';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import Badge from '@mui/material/Badge';

const LABEL_FLEX = '0 0 100px';

type HighlightedDay = { datetime: Date; label?: string | null };
type BadgePickersDayProps = PickersDayProps<Date> & {
  highlightedDays: HighlightedDay[];
};
const BadgePickersDay = (props: BadgePickersDayProps) => {
  const { highlightedDays = [], day, outsideCurrentMonth, ...other } = props;

  const matchingDay = highlightedDays.find(it =>
    DateUtils.isSameDay(it.datetime, day)
  );
  const isSelected = !props.outsideCurrentMonth && !!matchingDay;
  return (
    <Badge
      key={props.day.toString()}
      overlap="circular"
      badgeContent={
        isSelected ? (
          <Tooltip title={matchingDay?.label ?? ''}>
            <span>⚠️</span>
          </Tooltip>
        ) : undefined
      }
    >
      <PickersDay
        {...other}
        outsideCurrentMonth={outsideCurrentMonth}
        day={day}
      />
    </Badge>
  );
};

export const CreateEncounterForm: FC<{
  draft: EncounterSchema;
  setDraft: (draft: EncounterSchema) => void;
  setHasFormError: (invalid: boolean) => void;
  highlightedDays?: HighlightedDay[];
}> = ({ draft, setDraft, setHasFormError, highlightedDays = [] }) => {
  const { user } = useAuthContext();
  const t = useTranslation();
  const [startDateTimeError, setStartDateTimeError] = useState<string>();

  const setStartDatetime = (date: Date | null): void => {
    const startDatetime = date?.toISOString();
    setDraft({
      ...draft,
      startDatetime,
    });
    setStartDateTimeError(undefined);
    setHasFormError(false);
  };

  const setClinician = (option: ClinicianAutocompleteOption | null): void => {
    if (option === null) {
      setDraft({ ...draft, clinician: undefined });
      return;
    }
    const clinician = option.value;
    setDraft({ ...draft, clinician });
  };

  const setNote = (notes: NoteSchema[] | undefined): void => {
    setDraft({ ...draft, notes });
  };

  return (
    <>
      <InputWithLabelRow
        labelProps={{ sx: { flex: LABEL_FLEX } }}
        label={t('label.visit-date')}
        Input={
          <DateTimePickerInput
            value={DateUtils.getDateOrNull(draft?.startDatetime)}
            onChange={setStartDatetime}
            onError={validationError => {
              setStartDateTimeError(validationError as string);
              setHasFormError(true);
            }}
            error={startDateTimeError}
            slots={{
              day: BadgePickersDay as React.FC<PickersDayProps<Date>>,
            }}
            slotProps={{
              day: {
                highlightedDays,
              } as BadgePickersDayProps,
            }}
            showTime
          />
        }
      />
      <InputWithLabelRow
        labelProps={{ sx: { flex: LABEL_FLEX } }}
        label={t('label.clinician')}
        Input={
          <ClinicianSearchInput
            fullWidth
            onChange={setClinician}
            clinicianValue={draft?.clinician}
          />
        }
      />
      <InputWithLabelRow
        labelProps={{ sx: { flex: LABEL_FLEX } }}
        label={t('label.visit-notes')}
        Input={
          <TextArea
            InputProps={{
              sx: {
                backgroundColor: 'background.drawer',
              },
            }}
            fullWidth
            value={draft?.notes?.[0]?.text ?? ''}
            onChange={e => {
              setNote([
                {
                  authorId: user?.id,
                  authorName: user?.name,
                  created: new Date().toISOString(),
                  text: e.target.value,
                },
              ]);
            }}
          />
        }
      />
    </>
  );
};
