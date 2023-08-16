import { useEffect, useState } from 'react';
import { PatientRowFragment, usePatient } from '../api';
import { useDebounceCallback } from '@common/hooks';

export const searchPatient = () => {
  const patientQueries = usePatient.utils.api();
  const [patients, setPatients] = useState<PatientRowFragment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    search('');
  }, []);

  const search = async (searchValue: string) => {
    setIsLoading(true);
    patientQueries.get
      .list({
        first: 100,
        sortBy: { key: 'name', direction: 'asc' },
        filterBy: {
          nameOrCode: { like: searchValue },
        },
      })
      .then(result => {
        setTotalCount(result.totalCount);
        setPatients(result.nodes);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
      });
  };

  const debouncedOnChange = useDebounceCallback(
    value => search(value),
    [searchText],
    500
  );

  const reset = useDebounceCallback(
    () => {
      setPatients([]);
      setSearchText('');
      setTotalCount(0);
    },
    [],
    500
  );

  useEffect(() => {
    const timer = setTimeout(() => search(searchText), 500);

    return () => {
      clearTimeout(timer);
    };
  }, [searchText]);

  return {
    debouncedOnChange,
    isLoading,
    patients,
    setSearchText,
    totalCount,
    reset,
    searchText,
  };
};
