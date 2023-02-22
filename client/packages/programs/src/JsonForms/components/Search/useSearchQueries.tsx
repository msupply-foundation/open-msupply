import React, { useState } from 'react';
import { getPatientQueries } from 'packages/system/src/Patient/api/api';
import { getSdk } from 'packages/system/src/Patient/api/operations.generated';
import { useGql, useAuthContext, Typography } from '@openmsupply-client/common';
import { RegexUtils, JSXFormatters } from '@openmsupply-client/common';

export const QueryValues = ['patientByCode'] as const;
type QueryValue = typeof QueryValues[number];

type GetDisplayElement = (result: Record<string, any>) => JSX.Element | null;

interface SearchQueryOptions {
  optionString?: string;
  displayString?: string;
}

interface SearchQueryParams {
  runQuery: any;
  saveFields?: string[];
  getOptionLabel: (result: Record<string, any>) => string;
  getDisplayElement: GetDisplayElement;
}

export type SearchSource = 'input' | 'document';

const { formatTemplateString } = RegexUtils;
const { replaceHTMLlineBreaks } = JSXFormatters;

export const useSearchQueries = (
  query?: QueryValue,
  { optionString, displayString }: SearchQueryOptions = {}
) => {
  const { storeId } = useAuthContext();
  const { client } = useGql();
  const [results, setResults] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!query)
    return {
      runQuery: () => {},
      source: 'input',
      loading: true,
      error: false,
      results: [],
    };

  const patientQueries = getPatientQueries(getSdk(client), storeId);

  const searchQueries: Record<QueryValue, SearchQueryParams> = {
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
          <Typography>
            {displayString
              ? replaceHTMLlineBreaks(
                  formatTemplateString(displayString, data, '')
                )
              : replaceHTMLlineBreaks(
                  formatTemplateString(
                    '${firstName} ${lastName} (${code})\n${email}\n${document.data.contactDetails[0].address1}\n${document.data.contactDetails[0].address2}',
                    data,
                    ''
                  )
                )}
          </Typography>
        );
      },
      saveFields: [
        'id',
        'code',
        'firstName',
        'lastName',
        'dateOfBirth',
        'gender',
        'email',
        'document',
      ],
    },
  };

  const search = searchQueries[query];

  return {
    runQuery: search.runQuery,
    getOptionLabel: 'getOptionLabel' in search ? search.getOptionLabel : null,
    getDisplayElement:
      'getDisplayElement' in search ? search.getDisplayElement : null,
    saveFields: search.saveFields,
    loading,
    error,
    results,
  };
};
