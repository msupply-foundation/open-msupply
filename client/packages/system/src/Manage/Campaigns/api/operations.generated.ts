import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type CampaignRowFragment = {
  __typename: 'CampaignNode';
  id: string;
  name: string;
  startDate?: string | null;
  endDate?: string | null;
};

export type CampaignsQueryVariables = Types.Exact<{
  sort?: Types.InputMaybe<
    Array<Types.CampaignSortInput> | Types.CampaignSortInput
  >;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  filter?: Types.InputMaybe<Types.CampaignFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type CampaignsQuery = {
  __typename: 'Queries';
  campaigns: {
    __typename: 'CampaignConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'CampaignNode';
      id: string;
      name: string;
      startDate?: string | null;
      endDate?: string | null;
    }>;
  };
};

export type UpsertCampaignMutationVariables = Types.Exact<{
  input: Types.UpsertCampaignInput;
}>;

export type UpsertCampaignMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    campaign: {
      __typename: 'CampaignMutations';
      upsertCampaign:
        | {
            __typename: 'CampaignNode';
            id: string;
            name: string;
            startDate?: string | null;
            endDate?: string | null;
          }
        | {
            __typename: 'UpsertCampaignError';
            error:
              | {
                  __typename: 'DatabaseError';
                  description: string;
                  fullError: string;
                }
              | {
                  __typename: 'InternalError';
                  description: string;
                  fullError: string;
                }
              | {
                  __typename: 'UniqueValueViolation';
                  description: string;
                  field: Types.UniqueValueKey;
                };
          };
    };
  };
};

export type DeleteCampaignMutationVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
}>;

export type DeleteCampaignMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    campaign: {
      __typename: 'CampaignMutations';
      deleteCampaign:
        | {
            __typename: 'DeleteCampaignError';
            error:
              | {
                  __typename: 'DatabaseError';
                  description: string;
                  fullError: string;
                }
              | { __typename: 'RecordNotFound'; description: string };
          }
        | { __typename: 'DeleteCampaignSuccess'; id: string };
    };
  };
};

export const CampaignRowFragmentDoc = gql`
  fragment CampaignRow on CampaignNode {
    __typename
    id
    name
    startDate
    endDate
  }
`;
export const CampaignsDocument = gql`
  query campaigns(
    $sort: [CampaignSortInput!]
    $first: Int
    $offset: Int
    $filter: CampaignFilterInput
    $storeId: String!
  ) {
    campaigns(
      sort: $sort
      page: { first: $first, offset: $offset }
      filter: $filter
      storeId: $storeId
    ) {
      __typename
      ... on CampaignConnector {
        __typename
        totalCount
        nodes {
          __typename
          ...CampaignRow
        }
      }
    }
  }
  ${CampaignRowFragmentDoc}
`;
export const UpsertCampaignDocument = gql`
  mutation upsertCampaign($input: UpsertCampaignInput!) {
    centralServer {
      campaign {
        upsertCampaign(input: $input) {
          ... on UpsertCampaignError {
            __typename
            error {
              description
              ... on DatabaseError {
                __typename
                description
                fullError
              }
              ... on InternalError {
                __typename
                description
                fullError
              }
              ... on UniqueValueViolation {
                __typename
                description
                field
              }
            }
          }
          ... on CampaignNode {
            ...CampaignRow
          }
        }
      }
    }
  }
  ${CampaignRowFragmentDoc}
`;
export const DeleteCampaignDocument = gql`
  mutation deleteCampaign($id: String!) {
    centralServer {
      campaign {
        deleteCampaign(input: { id: $id }) {
          ... on DeleteCampaignError {
            __typename
            error {
              description
              ... on DatabaseError {
                __typename
                description
                fullError
              }
            }
          }
          ... on DeleteCampaignSuccess {
            __typename
            id
          }
        }
      }
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
    campaigns(
      variables: CampaignsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<CampaignsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<CampaignsQuery>({
            document: CampaignsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'campaigns',
        'query',
        variables
      );
    },
    upsertCampaign(
      variables: UpsertCampaignMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpsertCampaignMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertCampaignMutation>({
            document: UpsertCampaignDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'upsertCampaign',
        'mutation',
        variables
      );
    },
    deleteCampaign(
      variables: DeleteCampaignMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DeleteCampaignMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteCampaignMutation>({
            document: DeleteCampaignDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deleteCampaign',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
