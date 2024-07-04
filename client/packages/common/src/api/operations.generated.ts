import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
export type InitialisationStatusQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type InitialisationStatusQuery = { __typename: 'Queries', initialisationStatus: { __typename: 'InitialisationStatusNode', status: Types.InitialisationStatusType, siteName?: string | null } };


export const InitialisationStatusDocument = gql`
    query initialisationStatus {
  initialisationStatus {
    status
    siteName
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    initialisationStatus(variables?: InitialisationStatusQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InitialisationStatusQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InitialisationStatusQuery>(InitialisationStatusDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'initialisationStatus', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;