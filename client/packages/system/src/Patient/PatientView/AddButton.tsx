import React, { useEffect, useMemo, useState } from 'react';
import {
  useTranslation,
  SplitButton,
  SplitButtonOption,
  PlusCircleIcon,
  useUrlQuery,
  UserStoreNodeFragment,
  usePreference,
  PreferenceKey,
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
  const { data: preferences } = usePreference(PreferenceKey.ShowContactTracing);
  const currentUrlTab = urlQuery['tab'];
  const { createNewPatient } = usePatientStore();
  const { setModal: selectModal, reset } = usePatientModalStore();
  const {
    query: { data: insuranceProvidersData },
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
        }
      );
      if (preferences?.showContactTracing) {
        baseOptions.push({
          value: PatientModal.ContactTraceSearch,
          label: t('button.add-contact-trace'),
        });
      }
    }

    if (insuranceProvidersData?.length > 0) {
      baseOptions.push({
        value: PatientModal.Insurance,
        label: t('button.add-insurance'),
      });
    }

    return baseOptions;
  }, [disableEncounterButton, t, store, insuranceProvidersData, preferences]);

  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<PatientModal> | undefined
  >(options[0]);

  const optionMap: Partial<Record<PatientTabValue, PatientModal>> = {
    [PatientTabValue.Programs]: PatientModal.ProgramSearch,
    [PatientTabValue.Vaccinations]: PatientModal.ProgramSearch,
    [PatientTabValue.Encounters]: PatientModal.Encounter,
    [PatientTabValue.ContactTracing]: PatientModal.ContactTraceSearch,
    [PatientTabValue.Insurance]: PatientModal.Insurance,
  };

  useEffect(() => {
    if (options.length === 0) return;

    setSelectedOption(
      options.find(
        option => option.value === optionMap[currentUrlTab as PatientTabValue]
      ) || options[0]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return options.length > 0 && selectedOption && !createNewPatient ? (
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
  ) : null;
};
