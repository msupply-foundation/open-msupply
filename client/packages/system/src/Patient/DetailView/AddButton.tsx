import React, { useState } from 'react';
import {
  useTranslation,
  SplitButton,
  SplitButtonOption,
  PlusCircleIcon,
} from '@openmsupply-client/common';
// import { usePatient } from '../api';
import { usePatientModalStore } from '../hooks';
import { PatientModal } from '.';

export const AddButton = () => {
  const t = useTranslation('patients');
  const isDisabled = false; // TODO: usePatient.utils.isDisabled();
  const { setCurrent } = usePatientModalStore();
  const options = [
    {
      value: PatientModal.Prescription,
      label: t('button.add-prescription'),
      isDisabled: false,
    },
    {
      value: PatientModal.Program,
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
    <SplitButton
      color="primary"
      isDisabled={isDisabled}
      options={options}
      selectedOption={selectedOption}
      onSelectOption={setSelectedOption}
      Icon={<PlusCircleIcon />}
      onClick={() => setCurrent(selectedOption?.value)}
    />
  );
};
