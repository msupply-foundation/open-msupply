import { useEffect, useState } from 'react';
import { ProgramPatientRowFragment, usePatient } from '../api';
import { useDebouncedValue } from '@common/hooks';

const shouldSearch = (text: string) => text.length > 0;
export const useSearchPatient = () => {
  const [searchText, setSearchText] = useState('');
  const { mutate, isLoading, data, isSuccess } = usePatient.utils.search();

  const debouncedSearchText = useDebouncedValue(searchText, 500);

  const search = (value: string) => {
    setSearchText(value);
  };
  useEffect(() => {
    if (shouldSearch(debouncedSearchText))
      mutate({ nameOrCode: debouncedSearchText });
  }, [debouncedSearchText, mutate]);

  let patients: ProgramPatientRowFragment[] = [];
  let totalCount = 0;

  if (shouldSearch(debouncedSearchText) && data) {
    patients = data?.nodes.map(node => node.patient) ?? [];
    totalCount = data?.totalCount ?? 0;
  }

  return {
    isLoading,
    patients,
    totalCount,
    search,
    isSuccess,
  };
};
