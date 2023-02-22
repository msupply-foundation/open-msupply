import React, { useState } from 'react';
import { getPatientQueries } from 'packages/system/src/Patient/api/api';
import { getSdk } from 'packages/system/src/Patient/api/operations.generated';
import {
  useGql,
  useAuthContext,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { RegexUtils, JSXFormatters } from '@openmsupply-client/common';

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
  saveFields: string[] | null;
  getOptionLabel?: (result: Record<string, any>) => string;
  getDisplayElement?: GetDisplayElement;
  placeholderText: string;
}

const { formatTemplateString } = RegexUtils;
const { replaceHTMLlineBreaks } = JSXFormatters;

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

  const t = useTranslation('programs');

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
        if (!data || !data?.['code']) return null;
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
      };

  return {
    ...returnObject,
    loading,
    error,
    results,
  };
};
