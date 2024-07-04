import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
export type CurrencyRowFragment = { __typename: 'CurrencyNode', id: string, code: string, rate: number, isHomeCurrency: boolean };

export type CurrenciesQueryVariables = Types.Exact<{
  sort?: Types.InputMaybe<Types.CurrencySortInput>;
  filter?: Types.InputMaybe<Types.CurrencyFilterInput>;
}>;


export type CurrenciesQuery = { __typename: 'Queries', currencies: { __typename: 'CurrencyConnector', totalCount: number, nodes: Array<{ __typename: 'CurrencyNode', id: string, code: string, rate: number, isHomeCurrency: boolean }> } };

export const CurrencyRowFragmentDoc = gql`
    fragment CurrencyRow on CurrencyNode {
  id
  code
  rate
  isHomeCurrency
}
    `;
export const CurrenciesDocument = gql`
    query currencies($sort: CurrencySortInput, $filter: CurrencyFilterInput) {
  currencies(filter: $filter, sort: $sort) {
    ... on CurrencyConnector {
      nodes {
        ...CurrencyRow
      }
      totalCount
    }
  }
}
    ${CurrencyRowFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    currencies(variables?: CurrenciesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CurrenciesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<CurrenciesQuery>(CurrenciesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'currencies', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;