import React, { useState } from 'react';
import { TabDefinition, useTranslation } from '@openmsupply-client/common';
import { PatientFormTab } from './PatientFormTab';
import { PatientColumnData, PatientResultsTab } from './PatientResultsTab';
import { usePatientStore } from 'packages/programs/src';
import { useUpsertPatient } from '../EditPatientModal/useUpsertPatient';
import { PatientPanel } from './PatientPanel';

export enum Tabs {
  Form = 'Form',
  SearchResults = 'SearchResults',
  Patient = 'Patient',
}

export const useCreatePatientForm = (
  onSelect: (selectedPatient: PatientColumnData) => void,
  hasEditTab: boolean = false
) => {
  const t = useTranslation();
  const { createNewPatient, setCreateNewPatient } = usePatientStore();
  const [hasError, setHasError] = useState(false);
  const [currentTab, setCurrentTab] = useState(Tabs.Form);

  const { JsonForm, save, isSaving, isLoading } = useUpsertPatient(
    createNewPatient?.id ?? ''
  );

  const handleSave = () => {
    save();
    setCurrentTab(Tabs.Form);
  };

  const patientSteps = [
    {
      description: '',
      label: t('label.patient-details'),
      tab: Tabs.Form,
    },
    {
      description: '',
      label: t('label.search-results'),
      tab: Tabs.SearchResults,
    },
  ];

  if (hasEditTab) {
    patientSteps.push({
      description: '',
      label: t('label.patient-details'),
      tab: Tabs.Patient,
    });
  }

  const getActiveStep = () => {
    const step = patientSteps.find(step => step.tab === currentTab);
    return step ? patientSteps.indexOf(step) : 0;
  };

  const tabs: TabDefinition[] = [
    {
      Component: (
        <PatientFormTab
          value={Tabs.Form}
          patient={createNewPatient}
          onChange={errors => {
            setHasError((errors.errors?.length ?? 0) > 0);
          }}
        />
      ),
      value: Tabs.Form,
    },
    {
      Component: (
        <PatientResultsTab
          value={Tabs.SearchResults}
          patient={createNewPatient}
          active={currentTab === Tabs.SearchResults}
          onRowClick={selectedPatient => {
            setCurrentTab(Tabs.Form);
            onSelect(selectedPatient);
          }}
        />
      ),
      value: Tabs.SearchResults,
    },
  ];

  if (hasEditTab) {
    tabs.push({
      Component: (
        <PatientPanel value={Tabs.Patient} patient={createNewPatient}>
          {JsonForm}
        </PatientPanel>
      ),
      value: Tabs.Patient,
    });
  }

  const onNext = (tabs: TabDefinition[]) => {
    const currentIndex = tabs.findIndex(tab => tab.value === currentTab);
    const nextTab = tabs[currentIndex + 1]?.value ?? currentTab;
    setCurrentTab(nextTab as Tabs);
  };

  return {
    onNext,
    tabs,
    Tabs,
    currentTab,
    isSaving,
    hasError,
    setCurrentTab,
    setCreateNewPatient,
    patientSteps,
    getActiveStep,
    isLoading,
    handleSave,
  };
};
