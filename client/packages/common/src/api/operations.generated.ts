import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
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
    initialisationStatus(variables?: InitialisationStatusQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InitialisationStatusQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InitialisationStatusQuery>(InitialisationStatusDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'initialisationStatus', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInitialisationStatusQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ initialisationStatus })
 *   )
 * })
 */
export const mockInitialisationStatusQuery = (resolver: ResponseResolver<GraphQLRequest<InitialisationStatusQueryVariables>, GraphQLContext<InitialisationStatusQuery>, any>) =>
  graphql.query<InitialisationStatusQuery, InitialisationStatusQueryVariables>(
    'initialisationStatus',
    resolver
  )
