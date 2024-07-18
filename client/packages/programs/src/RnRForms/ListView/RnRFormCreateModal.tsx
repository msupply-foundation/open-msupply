import React, { FC, useState } from 'react';
import {
  useDialog,
  Grid,
  DialogButton,
  useTranslation,
  useNavigate,
  RouteBuilder,
  Autocomplete,
  SchedulePeriodNode,
  InputWithLabelRow,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ProgramSearchInput } from './ProgramSearchInput';
import {
  PeriodScheduleFragment,
  ProgramFragment,
} from '../../api/operations.generated';
import { NameRowFragment, SupplierSearchInput } from 'packages/system/src';
import { useSchedulesAndPeriods } from '../../api';

interface RnRFormCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RnRFormDraft {
  supplier: NameRowFragment | null;
  program: ProgramFragment | null;
  schedule: PeriodScheduleFragment | null;
  period: SchedulePeriodNode | null;
}

export const RnRFormCreateModal: FC<RnRFormCreateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation('programs');
  const navigate = useNavigate();

  const [draftRnRForm, setDraftRnRForm] = useState<RnRFormDraft>({
    supplier: null,
    program: null,
    schedule: null,
    period: null,
  });

  const { data: schedulesAndPeriods } = useSchedulesAndPeriods(
    draftRnRForm.program?.id ?? ''
  );

  const width = '350px';

  return (
    <Modal
      okButton={
        <DialogButton
          variant="ok"
          disabled={!draftRnRForm.program}
          onClick={async () => {
            try {
              // TOOD :creat()
              const result = { id: 'TODO' };
              if (result)
                navigate(
                  RouteBuilder.create(AppRoute.Programs)
                    .addPart(AppRoute.RnRForms)
                    .addPart(result.id)
                    .build()
                );
            } catch (e) {
              console.error(e);
            }
          }}
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      title={t('label.new-rnr-form')}
    >
      <Grid flexDirection="column" display="flex" gap={2}>
        <InputWithLabelRow
          label={t('label.supplier')}
          Input={
            <SupplierSearchInput
              width={350}
              onChange={supplier =>
                setDraftRnRForm({
                  ...draftRnRForm,
                  supplier,
                })
              }
              value={draftRnRForm.supplier}
            />
          }
        />
        <InputWithLabelRow
          label={t('label.program')}
          Input={
            <ProgramSearchInput
              width={width}
              onChange={program =>
                setDraftRnRForm({
                  ...draftRnRForm,
                  program,
                  schedule: null,
                  period: null,
                })
              }
              value={draftRnRForm.program}
            />
          }
        />
        <InputWithLabelRow
          label={t('label.schedule')}
          Input={
            <Autocomplete
              width={width}
              disabled={!draftRnRForm.program}
              optionKey="name"
              // TODO: autoselect!
              options={schedulesAndPeriods?.nodes ?? []}
              value={draftRnRForm.schedule}
              onChange={(_, schedule) =>
                schedule &&
                setDraftRnRForm({
                  ...draftRnRForm,
                  schedule,
                  period: null,
                })
              }
            />
          }
        />
        <InputWithLabelRow
          label={t('label.period')}
          Input={
            <Autocomplete
              width={width}
              disabled={!draftRnRForm.program}
              // TODO: only enable oldest available period!... autoselect!
              getOptionDisabled={option => option.inUse}
              getOptionLabel={option => option.period.name}
              options={draftRnRForm.schedule?.periods ?? []}
              value={draftRnRForm.period}
              onChange={(_, period) =>
                period &&
                setDraftRnRForm({
                  ...draftRnRForm,
                  period,
                })
              }
            />
          }
        />
      </Grid>
    </Modal>
  );
};
