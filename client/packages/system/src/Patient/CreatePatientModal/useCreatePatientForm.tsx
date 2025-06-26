import { useEffect, useState } from 'react';
import {
  FnUtils,
  useTabs,
  useDebounceCallback,
  DocumentRegistryCategoryNode,
} from '@openmsupply-client/common';
import {
  CreateNewPatient,
  DocumentRegistryFragment,
  useDocumentRegistry,
  usePatientStore,
} from '@openmsupply-client/programs';

export const useCreatePatientForm = (
  onCreate: (newPatient: CreateNewPatient) => void,
  Tabs: { Form: string; SearchResults: string }
) => {
  const { data: documentRegistryResponse, isLoading } =
    useDocumentRegistry.get.documentRegistries({
      filter: { category: { equalTo: DocumentRegistryCategoryNode.Patient } },
    });

  const [, setDocumentRegistry] = useState<
    DocumentRegistryFragment | undefined
  >();
  const { currentTab, onChangeTab } = useTabs(Tabs.Form);

  const { createNewPatient, setCreateNewPatient } = usePatientStore();

  const onNext = useDebounceCallback(() => {
    onChangeTab(Tabs.SearchResults);
  }, []);

  useEffect(() => {
    if (documentRegistryResponse?.nodes?.[0]) {
      setDocumentRegistry(documentRegistryResponse.nodes?.[0]);
    }
  }, [documentRegistryResponse]);

  useEffect(() => {
    setCreateNewPatient({
      id: FnUtils.generateUUID(),
    });
  }, [setCreateNewPatient]);

  const onOk = () => {
    if (!createNewPatient) return;
    onCreate(createNewPatient);
  };

  const clear = () => {
    setCreateNewPatient(undefined);
  };

  return {
    currentTab,
    onNext,
    clear,

    createNewPatient,
    Tabs,
    onChangeTab,
    isLoading,
    onOk,
  };
};
