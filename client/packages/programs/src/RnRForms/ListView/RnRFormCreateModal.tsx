import React, { FC, useEffect } from 'react';
import {
  useDialog,
  Grid,
  DialogButton,
  useTranslation,
  useNavigate,
  RouteBuilder,
  Autocomplete,
  InputWithLabelRow,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { SupplierSearchInput } from '@openmsupply-client/system';
import { ProgramSearchInput } from './ProgramSearchInput';
import { useCreateRnRForm, useSchedulesAndPeriods } from '../../api';

interface RnRFormCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RnRFormCreateModal: FC<RnRFormCreateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation('programs');
  const navigate = useNavigate();

  const { draft, updateDraft, clearDraft, create, isIncomplete } =
    useCreateRnRForm();

  const { data: schedulesAndPeriods } = useSchedulesAndPeriods(
    draft.program?.id ?? ''
  );

  // If there is only schedule, set it automatically
  useEffect(() => {
    if (schedulesAndPeriods?.nodes.length == 1 && !draft.schedule) {
      updateDraft({ schedule: schedulesAndPeriods.nodes[0]! }); // if length is 1, the first element must exist
    }
    // Rerun if schedules change (i.e. when program changes)
  }, [schedulesAndPeriods?.nodes?.[0]?.id]);

  const width = '350px';

  return (
    <Modal
      okButton={
        <DialogButton
          variant="ok"
          disabled={isIncomplete}
          onClick={async () => {
            try {
              const result = await create();
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
            />
          }
        />
        <InputWithLabelRow
          label={t('label.period')}
          Input={
            <Autocomplete
              width={width}
              disabled={!draft.program}
              // TODO: only enable oldest available period!... autoselect!
              getOptionDisabled={option => option.inUse}
              getOptionLabel={option => option.period.name}
              options={draft.schedule?.periods ?? []}
              value={draft.period}
              onChange={(_, period) => period && updateDraft({ period })}
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
