import React, { useState } from 'react';
import { getPatientQueries } from 'packages/system/src/Patient/api/api';
import { getSdk } from 'packages/system/src/Patient/api/operations.generated';
import { useGql, useAuthContext, Typography } from '@openmsupply-client/common';
import { RegexUtils } from '@openmsupply-client/common';

export const QueryValues = ['patientByCode'] as const;
type QueryValue = typeof QueryValues[number];

type GetDisplayElement = (result: Record<string, any>) => JSX.Element | null;

interface SearchQueryOptions {
  query?: QueryValue;
  optionString?: string;
  displayString?: string;
  saveFields?: string[];
  placeholderText?: string;
}

interface SearchQueryOutput {
  runQuery: (searchValue: string) => void;
  saveFields: string[];
  getOptionLabel?: (result: Record<string, any>) => string;
  getDisplayElement?: GetDisplayElement;
  placeholderText: string;
}

const { formatTemplateString } = RegexUtils;

export const useSearchQueries = ({
  query,
  optionString,
  displayString,
  saveFields,
  placeholderText,
}: SearchQueryOptions = {}) => {
  const { storeId } = useAuthContext();
  const { client } = useGql();
  const [results, setResults] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const patientQueries = getPatientQueries(getSdk(client), storeId);

  const searchQueries: Record<QueryValue, SearchQueryOutput> = {
    patientByCode: {
      runQuery: async (searchValue: string) => {
        if (searchValue === '') {
          setResults([]);
          return;
        }
        setError(false);
        setLoading(true);
        patientQueries.get
          .list({
            first: 10,
            offset: 0,
            sortBy: { key: 'lastName', direction: 'asc' },
            filterBy: { code: { like: searchValue } },
          })
          .then((result: any) => {
            setResults(result.nodes);
            setLoading(false);
          })
          .catch(err => {
            console.log(err.message);
            setError(err.message);
          });
      },
      getOptionLabel: data =>
        optionString ??
        `${data['code']} - ${data['firstName']} ${data['lastName']}`,
      getDisplayElement: data => {
        if (!data) return null;
        const { code } = data;
        if (!code) return null;
        return (
          <Typography style={{ whiteSpace: 'pre' }}>
            {displayString
              ? formatTemplateString(displayString, data, '')
              : formatTemplateString(
                  '${firstName} ${lastName} (${code})\n${email}\n${document.data.contactDetails[0].address1}\n${document.data.contactDetails[0].address2}',
                  data,
                  ''
                )}
          </Typography>
        );
      },
      saveFields: saveFields ?? [
        'id',
        'code',
        'firstName',
        'lastName',
        'dateOfBirth',
        'gender',
        'email',
        'document',
      ],
      placeholderText: placeholderText ?? 'Search by patient code...',
    },
  };

  const returnObject = query
    ? searchQueries[query]
    : {
        runQuery: () => {},
        saveFields: [],
        placeholderText: '',
      };

  return {
    ...returnObject,
    loading,
    error,
    results,
  };
};
