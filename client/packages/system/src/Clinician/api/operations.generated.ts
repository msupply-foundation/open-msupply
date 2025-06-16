import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type InsertClinicianMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertClinicianInput;
}>;

export type InsertClinicianMutation = {
  __typename: 'Mutations';
  insertClinician: { __typename: 'IdResponse'; id: string };
};

export const InsertClinicianDocument = gql`
  mutation insertClinician($storeId: String!, $input: InsertClinicianInput!) {
    insertClinician(storeId: $storeId, input: $input) {
      id
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    insertClinician(
      variables: InsertClinicianMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertClinicianMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertClinicianMutation>(
            InsertClinicianDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertClinician',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
