import { useState } from 'react';
import { RegexUtils, FilterBy } from '@openmsupply-client/common';
import { PatientRowFragment, usePatient } from '@openmsupply-client/system';

export const QueryValues = ['patientSearch'] as const;
type QueryValue = (typeof QueryValues)[number];

interface SearchQueryOptions {
  query?: QueryValue;
  optionString?: string;
  displayString?: string;
  saveFields?: string[];
}

interface SearchQueryOutput {
  runQuery: (searchFilter: FilterBy) => void;
  saveFields: string[] | null;
  getOptionLabel: (result: PatientRowFragment) => string;
}

const { formatTemplateString } = RegexUtils;

export const useSearchQueries = ({
  query,
  optionString,
  saveFields,
}: SearchQueryOptions = {}) => {
  const [results, setResults] = useState<PatientRowFragment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const patientQueries = usePatient.utils.api();

  const searchQueries: Record<QueryValue, SearchQueryOutput> = {
    patientSearch: {
      runQuery: async (searchFilter: FilterBy) => {
        setError(false);
        setLoading(true);
        patientQueries.get
          .list({
            first: 10,
            offset: 0,
            sortBy: { key: 'lastName', direction: 'asc' },
            filterBy: searchFilter,
          })
          .then(result => {
            setResults(
              // If patient has a full document field, use that since it'll make
              // more data available. Otherwise just use the basic Patient
              // fields
              result.nodes.map(patient => patient.document?.data ?? patient)
            );
            setLoading(false);
          })
          .catch(err => {
            console.log(err.message);
            setError(err.message);
          });
      },
      getOptionLabel: data =>
        optionString
          ? formatTemplateString(optionString, data)
          : `${data['code']} - ${data['firstName']} ${data['lastName']}`,
      saveFields: saveFields ?? null,
    },
  };

  const returnObject = query
    ? searchQueries[query]
    : {
        runQuery: () => {},
        saveFields: [],
        placeholderText: '',
        getOptionLabel: () => {},
      };

  return {
    ...returnObject,
    resetResults: () => setResults([]),
    loading,
    error,
    results,
  };
};
