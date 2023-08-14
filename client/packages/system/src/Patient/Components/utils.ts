import { useEffect, useState } from 'react';
import { PatientRowFragment, usePatient } from '../api';
import { useDebounceCallback } from '@common/hooks';

const MIN_CHARS = 3;

export const searchPatient = () => {
  const patientQueries = usePatient.utils.api();
  const [patients, setPatients] = useState<PatientRowFragment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');
  const [overlimit, setOverlimit] = useState(false);

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
          nameAndCode: { like: searchValue },
        },
      })
      .then(result => {
        if (result.totalCount > 100) {
          setOverlimit(true);
        } else {
          setOverlimit(false);
        }
        setPatients(result.nodes);
        setIsLoading(false);
      })
      .catch(err => {
        console.log(err);
      });
  };

  const debouncedOnChange = useDebounceCallback(
    value => {
      if (value.length >= MIN_CHARS) search(value);
      else {
        if (patients.length) search('');
      }
    },
    [searchText],
    500
  );

  return {
    debouncedOnChange,
    isLoading,
    patients,
    setSearchText,
    overlimit,
    searchText,
  };
};
