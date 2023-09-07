import React, { useState } from 'react';
import {
  Typography,
  useTranslation,
  RegexUtils,
  FilterBy,
} from '@openmsupply-client/common';
import { PatientRowFragment, usePatient } from '@openmsupply-client/system';

export const QueryValues = ['patientSearch'] as const;
type QueryValue = (typeof QueryValues)[number];

type GetDisplayElement = (
  result: Record<string, unknown>
) => JSX.Element | null;

interface SearchQueryOptions {
  query?: QueryValue;
  optionString?: string;
  displayString?: string;
  saveFields?: string[];
  placeholderText?: string;
}

interface SearchQueryOutput {
  runQuery: (searchFilter: FilterBy) => void;
  saveFields: string[] | null;
  getOptionLabel: (result: PatientRowFragment) => string;
  getDisplayElement?: GetDisplayElement;
  placeholderText: string;
}

const { formatTemplateString, removeEmptyLines } = RegexUtils;

export const useSearchQueries = ({
  query,
  optionString,
  displayString,
  saveFields,
  placeholderText,
}: SearchQueryOptions = {}) => {
  const [results, setResults] = useState<PatientRowFragment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const t = useTranslation('programs');

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
            setResults(result.nodes);
            console.log('Result', result.nodes);
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
      getDisplayElement: data => {
        if (!data || !data?.['code']) return null;
        return (
          <Typography style={{ whiteSpace: 'pre' }}>
            {displayString
              ? removeEmptyLines(formatTemplateString(displayString, data, ''))
              : removeEmptyLines(
                  formatTemplateString(
                    '${firstName} ${lastName} (${code})\n${email}\n${document.data.contactDetails[0].address1}\n${document.data.contactDetails[0].address2}',
                    data,
                    ''
                  )
                )}
          </Typography>
        );
      },
      saveFields: saveFields ?? null,
      placeholderText:
        placeholderText ?? t('control.search.search-patient-placeholder'),
    },
  };

  const returnObject = query
    ? searchQueries[query]
    : {
        runQuery: () => {},
        saveFields: [],
        placeholderText: '',
        getOptionLabel: () => {},
        getDisplayElement: () => {},
      };

  return {
    ...returnObject,
    loading,
    error,
    results,
  };
};
