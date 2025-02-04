import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type AbbreviationFragment = { __typename: 'AbbreviationNode', expansion: string, id: string, text: string };

export type AbbreviationsQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.AbbreviationFilterInput>;
}>;


export type AbbreviationsQuery = { __typename: 'Queries', abbreviations: Array<{ __typename: 'AbbreviationNode', expansion: string, id: string, text: string }> };

export const AbbreviationFragmentDoc = gql`
    fragment Abbreviation on AbbreviationNode {
  __typename
  expansion
  id
  text
}
    `;
export const AbbreviationsDocument = gql`
    query abbreviations($filter: AbbreviationFilterInput) {
  abbreviations(filter: $filter) {
    ... on AbbreviationNode {
      ...Abbreviation
    }
  }
}
    ${AbbreviationFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    abbreviations(variables?: AbbreviationsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AbbreviationsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AbbreviationsQuery>(AbbreviationsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'abbreviations', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;