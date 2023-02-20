import React, { useState } from 'react';
import { getPatientQueries } from 'packages/system/src/Patient/api/api';
import { getSdk } from 'packages/system/src/Patient/api/operations.generated';
import { useGql, useAuthContext } from '@openmsupply-client/common';

export const QueryValues = ['patientByCode', 'currentPatient'] as const;
type QueryValue = typeof QueryValues[number];

type GetDisplayElement = (result: Record<string, any>) => JSX.Element | null;

interface BaseQuery {
  runQuery: any;
  source: SearchSource;
  saveFields?: string[];
}

interface PatientByCodeQuery extends BaseQuery {
  source: 'input';
  getOptionLabel: (result: Record<string, any>) => string;
  getDisplayElement: GetDisplayElement;
}

interface CurrentPatientQuery extends BaseQuery {
  source: 'document';
  scope: 'string';
  getDisplayElement: GetDisplayElement;
}

interface DocumentQuery extends BaseQuery {
  source: 'document';
}

export type SearchSource = 'input' | 'document';

type SearchQuery = PatientByCodeQuery | DocumentQuery | CurrentPatientQuery;

export const useSearchQueries = (query?: QueryValue) => {
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

  const searchQueries: Record<QueryValue, SearchQuery> = {
    patientByCode: {
      runQuery: async (searchValue: string) => {
        console.log('searchValue', searchValue);
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
            // console.log(result);
            setResults(result.nodes);
            setLoading(false);
          })
          .catch(err => {
            console.log(err.message);
            setError(true);
          });
      },
      source: 'input',
      getOptionLabel: e => `${e['code']} - ${e['firstName']} ${e['lastName']}`,
      getDisplayElement: data => {
        const { code, firstName, lastName, gender, email } = data;
        if (!code) return null;
        return (
          <p>
            {`${code} - ${firstName} ${lastName}`}
            <br />
            {`${gender} ${email}`}
          </p>
        );
      },
      saveFields: ['code', 'firstName', 'lastName', 'dateOfBirth'],
    },
    currentPatient: {
      runQuery: async (searchValue: string) => {
        console.log('searchValue', searchValue);
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
            // console.log(result);
            setResults(result.nodes);
            setLoading(false);
          })
          .catch(err => {
            console.log(err.message);
            setError(true);
          });
      },
      source: 'document',
      getDisplayElement: data => {
        const { code, firstName, lastName, gender, email } = data;
        if (!code) return null;
        return (
          <p>
            {`${code} - ${firstName} ${lastName}`}
            <br />
            {`${gender} ${email}`}
          </p>
        );
      },
      saveFields: ['code', 'firstName', 'lastName', 'dateOfBirth'],
    },
  };

  const search = searchQueries[query];

  return {
    runQuery: search.runQuery,
    source: search.source,
    getOptionLabel: 'getOptionLabel' in search ? search.getOptionLabel : null,
    getDisplayElement:
      'getDisplayElement' in search ? search.getDisplayElement : null,
    saveFields: search.saveFields,
    loading,
    error,
    results,
  };
};
