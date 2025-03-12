import React, { useEffect, useMemo, useState } from 'react';
import {
  useTranslation,
  SplitButton,
  SplitButtonOption,
  PlusCircleIcon,
  useUrlQuery,
  UserStoreNodeFragment,
} from '@openmsupply-client/common';
import {
  PatientModal,
  usePatientModalStore,
  usePatientStore,
} from '@openmsupply-client/programs';
import { PatientTabValue } from './PatientView';
import { useInsuranceProviders } from '../apiModern';

interface AddButtonProps {
  /** Disable the whole control */
  disabled: boolean;
  disableEncounterButton: boolean;
  store?: UserStoreNodeFragment;
}

export const AddButton: React.FC<AddButtonProps> = ({
  disabled,
  disableEncounterButton,
  store,
}) => {
  const t = useTranslation();
  const { urlQuery, updateQuery } = useUrlQuery();
  const currentUrlTab = urlQuery['tab'];
  const { createNewPatient } = usePatientStore();
  const { setModal: selectModal, reset } = usePatientModalStore();
  const {
    query: { data: InsuranceProvidersData },
  } = useInsuranceProviders();

  const options: SplitButtonOption<PatientModal>[] = useMemo(() => {
    const baseOptions: SplitButtonOption<PatientModal>[] = [];

    if (store?.preferences.omProgramModule) {
      baseOptions.push(
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
        }
      );
    }

    if (InsuranceProvidersData?.length > 0) {
      baseOptions.push({
        value: PatientModal.Insurance,
        label: t('button.add-insurance'),
      });
    }

    return baseOptions;
  }, [disableEncounterButton, t, store, InsuranceProvidersData]);

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<PatientModal> | undefined
  >(options[0]);

  useEffect(() => {
    if (options.length === 0) return;

    const optionMap: {
      [key: string]: SplitButtonOption<PatientModal> | undefined;
    } = {
      [PatientTabValue.Programs]: options.find(
        option => option.value === PatientModal.ProgramSearch
      ),
      [PatientTabValue.Vaccinations]: options.find(
        option => option.value === PatientModal.ProgramSearch
      ),
      [PatientTabValue.Encounters]: options.find(
        option => option.value === PatientModal.Encounter
      ),
      [PatientTabValue.ContactTracing]: options.find(
        option => option.value === PatientModal.ContactTraceSearch
      ),
      [PatientTabValue.Insurance]: options.find(
        option => option.value === PatientModal.Insurance
      ),
    };

    setSelectedOption(optionMap[currentUrlTab as string] || options[0]);
  }, [currentUrlTab, options]);

  const onSelectOption = (option: SplitButtonOption<PatientModal>) => {
    updateQuery({ insuranceId: undefined });
    setSelectedOption(option);
    reset();
    selectModal(option?.value);
  };

  const onClick = () => {
    updateQuery({ insuranceId: undefined });
    reset();
    selectModal(selectedOption?.value);
  };

  return (
    <>
      {options.length > 0 && selectedOption && !createNewPatient && (
        <SplitButton
          color="primary"
          openFrom={'bottom'}
          isDisabled={disabled}
          options={options}
          selectedOption={selectedOption}
          onSelectOption={onSelectOption}
          Icon={<PlusCircleIcon />}
          onClick={onClick}
        />
      )}
    </>
  );
};
