import React, { FC, memo, useEffect, useState } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  PanelRow,
  useTranslation,
  BasicTextInput,
  useDebouncedValueCallback,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { usePrescription, usePrescriptionLines } from '../../api';
import {
  Clinician,
  ClinicianSearchInput,
  ProgramSearchInput,
} from '@openmsupply-client/system';
import { ProgramFragment, useProgramList } from '@openmsupply-client/programs';

export const PrescriptionDetailsSectionComponent: FC = () => {
  const t = useTranslation();

  const {
    query: { data },
    isDisabled,
    update: { update },
    rows: items,
  } = usePrescription();

  const {
    id,
    clinician,
    createdDatetime,
    programId,
    theirReference,
  } = data ?? {};

  const deleteAll = () => {
    const allRows = (items ?? []).map(({ lines }) => lines.flat()).flat() ?? [];
    if (allRows.length === 0) return;
    deleteLines(allRows);
  };

  const { data: programData } = useProgramList();

  const programs = programData?.nodes ?? [];

  const selectedProgram = programs.find(prog => prog.id === programId);

  const {
    delete: { deleteLines },
  } = usePrescriptionLines();

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-delete-prescription-lines'),
  });

  const [clinicianValue, setClinicianValue] = useState<Clinician | null>(
    clinician ?? null
  );

  const handleProgramChange = async (
    newProgram: ProgramFragment | undefined
  ) => {
    if (!newProgram || !items || items.length === 0) {
      // It's okay to *clear* program without losing current items
      await update({ id, programId: newProgram?.id ?? null });
      return;
    }

    getConfirmation({
      onConfirm: async () => {
        // For simplicity, we currently delete all items that have already been
        // added when switching programs. We may wish to improve this in the
        // future to only remove items that don't belong to the new program
        await deleteAll();
        await update({ id, programId: newProgram?.id });
      },
    });
  };

  const [theirReferenceInput, setTheirReferenceInput] =
    useState(theirReference);

  const debouncedUpdate = useDebouncedValueCallback(update, [
    theirReferenceInput,
  ]);

  if (!createdDatetime) return null;

  useEffect(() => {
    if (!data) return;
    const { clinician, theirReference } =
      data;
    setClinicianValue(clinician ?? null);
    setTheirReferenceInput(theirReference);
  }, [data]);
 
  return (
    <DetailPanelSection title={t('heading.prescription-details')}>
      <Grid container gap={0.5} key="prescription-details">
        <PanelRow>
          <PanelLabel>{t('label.program')}</PanelLabel>
          <ProgramSearchInput
            disabled={isDisabled}
            programs={programs}
            selectedProgram={selectedProgram}
            onChange={handleProgramChange}
          />
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.clinician')}</PanelLabel>
          <ClinicianSearchInput
            disabled={isDisabled}
            onChange={async clinician => {
              setClinicianValue(clinician ? clinician.value : null);
              update({
                id,
                clinicianId: clinician?.value?.id ?? null,
              });
            }}
            clinicianValue={clinicianValue}
          />
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.reference')}</PanelLabel>
          <BasicTextInput
            disabled={isDisabled}
            size="small"
            sx={{ width: 250 }}
            slotProps={{
              input: {
                sx: {
                  backgroundColor: 'white',
                }
              }
            }}
            value={theirReferenceInput ?? ''}
            onChange={event => {
              setTheirReferenceInput(event.target.value);
              debouncedUpdate({ theirReference: event.target.value });
            }}
          />
        </PanelRow>

      </Grid>
    </DetailPanelSection>
  );
};

export const PrescriptionDetailsSection = memo(
  PrescriptionDetailsSectionComponent
);
