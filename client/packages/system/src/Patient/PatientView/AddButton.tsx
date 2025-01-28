import React, { useEffect, useMemo, useState } from 'react';
import {
  useTranslation,
  SplitButton,
  SplitButtonOption,
  PlusCircleIcon,
  useUrlQuery,
} from '@openmsupply-client/common';
import {
  PatientModal,
  usePatientModalStore,
} from '@openmsupply-client/programs';
import { PatientTabValue } from './PatientView';

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
  const { urlQuery } = useUrlQuery();
  const currentUrlTab = urlQuery['tab'];
  const { setModal: selectModal, reset } = usePatientModalStore();

  const options: [
    SplitButtonOption<PatientModal>,
    SplitButtonOption<PatientModal>,
    SplitButtonOption<PatientModal>,
  ] = useMemo(
    () => [
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
    ],
    [disableEncounterButton, t]
  );
  const [programOption, encounterOption, contactTraceOption] = options;

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<PatientModal>
  >(options[0]);

  useEffect(() => {
    switch (currentUrlTab) {
      case PatientTabValue.Programs:
        setSelectedOption(programOption);
        break;
      case PatientTabValue.Encounters:
        setSelectedOption(encounterOption);
        break;
      case PatientTabValue.ContactTracing:
        setSelectedOption(contactTraceOption);
        break;
    }
  }, [contactTraceOption, currentUrlTab, encounterOption, programOption]);

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
