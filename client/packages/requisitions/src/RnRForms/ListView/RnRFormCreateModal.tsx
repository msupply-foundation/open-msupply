import React, { FC } from 'react';
import {
  useDialog,
  Grid,
  Box,
  DialogButton,
  useTranslation,
  useNavigate,
  RouteBuilder,
  Autocomplete,
  InputWithLabelRow,
  SchedulePeriodNode,
  RnRFormNodeStatus,
  Typography,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { SupplierSearchInput } from '@openmsupply-client/system';
import { ProgramSearchInput } from '@openmsupply-client/programs';
import { useCreateRnRForm, useSchedulesAndPeriods } from '../api';

interface RnRFormCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RnRFormCreateModal: FC<RnRFormCreateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation();
  const navigate = useNavigate();

  const { previousForm, draft, updateDraft, clearDraft, create, isIncomplete } =
    useCreateRnRForm();

  const { data: schedulesAndPeriods } = useSchedulesAndPeriods(
    draft.program?.id ?? ''
  );

  const width = '350px';
  const prevFormNotFinalised =
    !!previousForm && previousForm.status !== RnRFormNodeStatus.Finalised;

  const getPeriodError = (): string | undefined => {
    if (prevFormNotFinalised) return t('messages.finalise-previous-form');

    // If there is a previous form, the next period should be set automatically
    // If not, no periods are available
    return !!previousForm && !draft.period
      ? t('messages.no-available-periods')
      : undefined;
  };

  return (
    <Modal
      okButton={
        <DialogButton
          variant="ok"
          disabled={isIncomplete || prevFormNotFinalised}
          onClick={async () => {
            try {
              const result = await create();
              if (result)
                navigate(
                  RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.RnRForms)
                    .addPart(result.id)
                    .build()
                );
              clearDraft();
            } catch (e) {
              console.error(e);
            }
          }}
        />
      }
      cancelButton={
        <DialogButton
          variant="cancel"
          onClick={() => {
            clearDraft();
            onClose();
          }}
        />
      }
      title={t('label.new-rnr-form')}
    >
      <Grid flexDirection="column" display="flex" gap={2}>
        <InputWithLabelRow
          label={t('label.program')}
          Input={
            <ProgramSearchInput
              width={width}
              onChange={program =>
                updateDraft({
                  program,
                  schedule: null,
                  period: null,
                })
              }
              value={draft.program}
            />
          }
        />
        <InputWithLabelRow
          label={t('label.schedule')}
          Input={
            <Autocomplete
              width={width}
              disabled={!draft.program}
              optionKey="name"
              options={schedulesAndPeriods?.nodes ?? []}
              value={draft.schedule}
              onChange={(_, schedule) =>
                schedule && updateDraft({ schedule, period: null })
              }
              clearable={false}
            />
          }
        />
        <InputWithLabelRow
          label={t('label.period')}
          Input={
            <PeriodSelect
              width={width}
              disabled={!draft.program}
              options={draft.schedule?.periods ?? []}
              value={draft.period}
              onChange={period => updateDraft({ period })}
              previousFormExists={!!previousForm}
              errorMessage={getPeriodError()}
            />
          }
        />

        <InputWithLabelRow
          label={t('label.supplier')}
          Input={
            <SupplierSearchInput
              width={350}
              onChange={supplier => updateDraft({ supplier })}
              value={draft.supplier}
            />
          }
        />
      </Grid>
    </Modal>
  );
};

const PeriodSelect = ({
  width,
  disabled,
  options,
  value,
  errorMessage,
  previousFormExists = false,
  onChange,
}: {
  width: string;
  disabled: boolean;
  options: SchedulePeriodNode[];
  value: SchedulePeriodNode | null;
  onChange: (period: SchedulePeriodNode) => void;
  previousFormExists?: boolean;
  errorMessage?: string;
}) => {
  const t = useTranslation();

  return (
    <Box display="flex" flexDirection="column">
      <Typography
        sx={{
          fontStyle: 'italic',
          color: 'gray.main',
          fontSize: '12px',
          width,
        }}
      >
        {t('messages.only-closed-periods-visible')}
      </Typography>
      <Autocomplete
        width={width}
        disabled={disabled}
        getOptionDisabled={option =>
          previousFormExists && option.id !== value?.id
        }
        getOptionLabel={option => option.period.name}
        options={options}
        value={value}
        onChange={(_, period) => period && onChange(period)}
        clearable={false}
      />
      {errorMessage && (
        <Typography
          sx={{
            fontStyle: 'italic',
            color: 'error.main',
            fontSize: 'small',
            width,
          }}
        >
          {errorMessage}
        </Typography>
      )}
    </Box>
  );
};
