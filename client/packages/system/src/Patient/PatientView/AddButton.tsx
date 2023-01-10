import React, { useState } from 'react';
import {
  useTranslation,
  SplitButton,
  SplitButtonOption,
  PlusCircleIcon,
} from '@openmsupply-client/common';
import {
  PatientModal,
  usePatientModalStore,
} from '@openmsupply-client/programs';

export const AddButton = () => {
  const t = useTranslation('patients');
  const { setModal: selectModal, reset } = usePatientModalStore();
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
    </>
  );
};
