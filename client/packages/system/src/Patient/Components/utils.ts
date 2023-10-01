import { useEffect, useState } from 'react';
import { usePatient } from '../api';
import { useDebouncedValueCallback } from '@common/hooks';

export const useSearchPatient = () => {
  const [searchText, setSearchText] = useState('');
  const { mutate, isLoading, data, isSuccess } = usePatient.utils.search();

  const debounced = useDebouncedValueCallback(
    value => mutate({ nameOrCode: value }),
    [searchText],
    500
  );

  const search = (value: string) => {
    setSearchText(value);
  };

  const patients = data?.nodes?.map(node => node.patient) ?? [];
  const totalCount = data?.totalCount ?? 0;

  useEffect(() => {
    debounced(searchText);
  }, [searchText]);

  return {
    isLoading,
    patients,
    totalCount,
    search,
    isSuccess,
  };
};
