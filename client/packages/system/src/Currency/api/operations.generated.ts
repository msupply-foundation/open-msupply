import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type CurrencyRowFragment = { __typename: 'CurrencyNode', id: string, code: string, rate: number, isHomeCurrency: boolean };

export type CurrenciesQueryVariables = Types.Exact<{
  sort?: Types.InputMaybe<Array<Types.CurrencySortInput> | Types.CurrencySortInput>;
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
    query currencies($sort: [CurrencySortInput!], $filter: CurrencyFilterInput) {
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    currencies(variables?: CurrenciesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CurrenciesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<CurrenciesQuery>(CurrenciesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'currencies', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;