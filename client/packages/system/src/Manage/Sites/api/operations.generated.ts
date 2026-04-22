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

export type SiteStoreRowFragment = {
  __typename: 'StoreNode';
  id: string;
  code: string;
  storeName: string;
  siteId: number;
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
              | { __typename: 'CodeRequired'; description: string }
              | { __typename: 'NameRequired'; description: string }
              | { __typename: 'PasswordRequired'; description: string };
          };
    };
  };
};

export type DeleteSiteMutationVariables = Types.Exact<{
  siteId: Types.Scalars['Int']['input'];
}>;

export type DeleteSiteMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    site: {
      __typename: 'CentralSiteMutations';
      deleteSite: { __typename: 'DeleteSiteNode'; id: number };
    };
  };
};

export type AssignStoresToSiteMutationVariables = Types.Exact<{
  input: Types.AssignStoresToSiteInput;
}>;

export type AssignStoresToSiteMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    site: {
      __typename: 'CentralSiteMutations';
      assignStoresToSite: {
        __typename: 'AssignStoresToSiteNode';
        siteId: number;
        storeIds: Array<string>;
      };
    };
  };
};

export type StoresBySiteQueryVariables = Types.Exact<{
  siteId: Types.Scalars['Int']['input'];
}>;

export type StoresBySiteQuery = {
  __typename: 'Queries';
  stores: {
    __typename: 'StoreConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'StoreNode';
      id: string;
      code: string;
      storeName: string;
      siteId: number;
    }>;
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
export const SiteStoreRowFragmentDoc = gql`
  fragment SiteStoreRow on StoreNode {
    __typename
    id
    code
    storeName
    siteId
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
              ... on CodeRequired {
                __typename
                description
              }
              ... on NameRequired {
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
export const DeleteSiteDocument = gql`
  mutation deleteSite($siteId: Int!) {
    centralServer {
      site {
        deleteSite(siteId: $siteId) {
          id
        }
      }
    }
  }
`;
export const AssignStoresToSiteDocument = gql`
  mutation assignStoresToSite($input: AssignStoresToSiteInput!) {
    centralServer {
      site {
        assignStoresToSite(input: $input) {
          siteId
          storeIds
        }
      }
    }
  }
`;
export const StoresBySiteDocument = gql`
  query storesBySite($siteId: Int!) {
    stores(filter: { siteId: { equalTo: $siteId } }, page: { first: 1000 }) {
      ... on StoreConnector {
        __typename
        totalCount
        nodes {
          ...SiteStoreRow
        }
      }
    }
  }
  ${SiteStoreRowFragmentDoc}
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
    deleteSite(
      variables: DeleteSiteMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DeleteSiteMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteSiteMutation>({
            document: DeleteSiteDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deleteSite',
        'mutation',
        variables
      );
    },
    assignStoresToSite(
      variables: AssignStoresToSiteMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<AssignStoresToSiteMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<AssignStoresToSiteMutation>({
            document: AssignStoresToSiteDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'assignStoresToSite',
        'mutation',
        variables
      );
    },
    storesBySite(
      variables: StoresBySiteQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<StoresBySiteQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StoresBySiteQuery>({
            document: StoresBySiteDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'storesBySite',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
