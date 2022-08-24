import React, { useState } from 'react';
import {
  useTranslation,
  SplitButton,
  SplitButtonOption,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import { usePatientModalStore } from '../hooks';
import { PatientModal } from '.';
import { ProgramSearchModal } from '../../Program/Components';
import { usePatient } from '../api';

export const AddButton = () => {
  const t = useTranslation('patients');
  const { current, setCreationModal, selectModal, reset } =
    usePatientModalStore();
  const { data } = usePatient.document.programEnrolments();
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

  const onSelectOption = (option: SplitButtonOption<PatientModal>) => {
    setSelectedOption(option);
    reset();
    selectModal(option?.value);
  };

  const onClick = () => {
    reset();
    selectModal(selectedOption?.value);
  };

  return (
    <>
      <SplitButton
        color="primary"
        options={options}
        selectedOption={selectedOption}
        onSelectOption={onSelectOption}
        Icon={<PlusCircleIcon />}
        onClick={onClick}
      />
      <ProgramSearchModal
        disabledPrograms={data?.nodes?.map(program => program.type)}
        open={current === PatientModal.ProgramSearch}
        onClose={() => reset()}
        onChange={async documentRegistry => {
          const createDocument = {
            data: { enrolmentDatetime: new Date().toISOString() },
            documentRegistry,
          };
          setCreationModal(
            PatientModal.Program,
            documentRegistry.documentType,
            createDocument,
            documentRegistry.documentType
          );
        }}
      />
    </>
  );
};
