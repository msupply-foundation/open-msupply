import React, { useState } from 'react';
import {
  useTranslation,
  SplitButton,
  SplitButtonOption,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import { usePatientModalStore } from '../hooks';
import { PatientModal } from '.';
import { ProgramSearchModal } from '../ProgramEnrolment/Components';
import { useProgramEnrolment } from '../ProgramEnrolment/api';
import { usePatient } from '../api';

export const AddButton = () => {
  const t = useTranslation('patients');
  const { current, setCurrent, setDocumentName, setDocumentType } =
    usePatientModalStore();
  const { mutateAsync: enrol } = useProgramEnrolment.document.insert();
  const patientId = usePatient.utils.id();
  const options = [
    {
      value: PatientModal.Prescription,
      label: t('button.add-prescription'),
      isDisabled: false,
    },
    {
      value: PatientModal.ProgramSearch,
      label: t('button.add-program'),
      isDisabled: false,
    },
    {
      value: PatientModal.Encounter,
      label: t('button.add-encounter'),
      isDisabled: false,
    },
  ];

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<PatientModal>
  >(options[1] as SplitButtonOption<PatientModal>);

  return (
    <>
      <SplitButton
        color="primary"
        options={options}
        selectedOption={selectedOption}
        onSelectOption={setSelectedOption}
        Icon={<PlusCircleIcon />}
        onClick={() => setCurrent(selectedOption?.value)}
      />
      <ProgramSearchModal
        open={current === PatientModal.ProgramSearch}
        onClose={() => setCurrent(undefined)}
        onChange={async program => {
          setCurrent(undefined);
          const response = await enrol({
            data: program.document.data,
            patientId,
            schemaId: program.document.documentRegistry?.formSchemaId ?? '',
            type: program.type,
          });
          setDocumentName(response.name);
          setDocumentType(response.type);
          setCurrent(PatientModal.Program);
        }}
      />
    </>
  );
};
