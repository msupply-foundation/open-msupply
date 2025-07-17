import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ContactFragment = {
  __typename: 'ContactNode';
  address1?: string | null;
  address2?: string | null;
  category1?: string | null;
  category2?: string | null;
  category3?: string | null;
  comment?: string | null;
  country?: string | null;
  email?: string | null;
  firstName: string;
  id: string;
  lastName: string;
  phone?: string | null;
  position?: string | null;
};

export type ContactsQueryVariables = Types.Exact<{
  nameId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type ContactsQuery = {
  __typename: 'Queries';
  contacts: {
    __typename: 'ContactConnector';
    nodes: Array<{
      __typename: 'ContactNode';
      address1?: string | null;
      address2?: string | null;
      category1?: string | null;
      category2?: string | null;
      category3?: string | null;
      comment?: string | null;
      country?: string | null;
      email?: string | null;
      firstName: string;
      id: string;
      lastName: string;
      phone?: string | null;
      position?: string | null;
    }>;
  };
};

export const ContactFragmentDoc = gql`
  fragment Contact on ContactNode {
    address1
    address2
    category1
    category2
    category3
    comment
    country
    email
    firstName
    id
    lastName
    phone
    position
  }
`;
export const ContactsDocument = gql`
  query contacts($nameId: String!, $storeId: String!) {
    contacts(nameId: $nameId, storeId: $storeId) {
      ... on ContactConnector {
        __typename
        nodes {
          ...Contact
        }
      }
    }
  }
  ${ContactFragmentDoc}
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
    contacts(
      variables: ContactsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<ContactsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ContactsQuery>(ContactsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'contacts',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
