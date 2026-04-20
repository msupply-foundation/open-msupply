import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type SiteRowFragment = {
  __typename: 'SiteNode';
  id: number;
  code: string;
  name: string;
  hardwareId?: string | null;
};

export type SitesQueryVariables = Types.Exact<{
  sort?: Types.InputMaybe<Array<Types.SiteSortInput> | Types.SiteSortInput>;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  filter?: Types.InputMaybe<Types.SiteFilterInput>;
}>;

export type SitesQuery = {
  __typename: 'Queries';
  centralServer: {
    __typename: 'CentralServerQueryNode';
    site: {
      __typename: 'CentralSiteQueries';
      sites: {
        __typename: 'SiteConnector';
        totalCount: number;
        nodes: Array<{
          __typename: 'SiteNode';
          id: number;
          code: string;
          name: string;
          hardwareId?: string | null;
        }>;
      };
    };
  };
};

export type UpsertSiteMutationVariables = Types.Exact<{
  input: Types.UpsertSiteInput;
}>;

export type UpsertSiteMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    site: {
      __typename: 'CentralSiteMutations';
      upsertSite:
        | {
            __typename: 'SiteNode';
            id: number;
            code: string;
            name: string;
            hardwareId?: string | null;
          }
        | {
            __typename: 'UpsertSiteError';
            error:
              | { __typename: 'CodeMustBeProvided'; description: string }
              | { __typename: 'NameNotProvided'; description: string }
              | { __typename: 'PasswordRequired'; description: string };
          };
    };
  };
};

export const SiteRowFragmentDoc = gql`
  fragment SiteRow on SiteNode {
    __typename
    id
    code
    name
    hardwareId
  }
`;
export const SitesDocument = gql`
  query sites(
    $sort: [SiteSortInput!]
    $first: Int
    $offset: Int
    $filter: SiteFilterInput
  ) {
    centralServer {
      site {
        sites(
          sort: $sort
          page: { first: $first, offset: $offset }
          filter: $filter
        ) {
          ... on SiteConnector {
            __typename
            totalCount
            nodes {
              __typename
              ...SiteRow
            }
          }
        }
      }
    }
  }
  ${SiteRowFragmentDoc}
`;
export const UpsertSiteDocument = gql`
  mutation upsertSite($input: UpsertSiteInput!) {
    centralServer {
      site {
        upsertSite(input: $input) {
          __typename
          ... on SiteNode {
            ...SiteRow
          }
          ... on UpsertSiteError {
            __typename
            error {
              ... on CodeMustBeProvided {
                __typename
                description
              }
              ... on NameNotProvided {
                __typename
                description
              }
              ... on PasswordRequired {
                __typename
                description
              }
              description
            }
          }
        }
      }
    }
  }
  ${SiteRowFragmentDoc}
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
    sites(
      variables?: SitesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<SitesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SitesQuery>({
            document: SitesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'sites',
        'query',
        variables
      );
    },
    upsertSite(
      variables: UpsertSiteMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpsertSiteMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertSiteMutation>({
            document: UpsertSiteDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'upsertSite',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
