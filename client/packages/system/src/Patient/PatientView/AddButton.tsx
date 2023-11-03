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

interface AddButtonProps {
  /** Disable the whole control */
  disabled: boolean;
  disableEncounterButton: boolean;
}

export const AddButton: React.FC<AddButtonProps> = ({
  disabled,
  disableEncounterButton,
}) => {
  const t = useTranslation('dispensary');
  const { setModal: selectModal, reset } = usePatientModalStore();
  const options = [
    {
      value: PatientModal.ProgramSearch,
      label: t('button.add-program'),
      isDisabled: false,
    },
    {
      value: PatientModal.Encounter,
      label: t('button.add-encounter'),
      isDisabled: disableEncounterButton,
    },
    {
      value: PatientModal.ContactTraceSearch,
      label: t('button.add-contact-trace'),
    },
  ];

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<PatientModal>
  >(options[0] as SplitButtonOption<PatientModal>);

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
        isDisabled={disabled}
        options={options}
        selectedOption={selectedOption}
        onSelectOption={onSelectOption}
        Icon={<PlusCircleIcon />}
        onClick={onClick}
      />
    </>
  );
};
