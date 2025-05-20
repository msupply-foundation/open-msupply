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
}>;

export type CampaignsQuery = {
  __typename: 'Queries';
  centralServer: {
    __typename: 'CentralServerQueryNode';
    campaign: {
      __typename: 'CampaignQueries';
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
  ) {
    centralServer {
      campaign {
        campaigns(
          sort: $sort
          page: { first: $first, offset: $offset }
          filter: $filter
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
    }
  }
  ${CampaignRowFragmentDoc}
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
      variables?: CampaignsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<CampaignsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<CampaignsQuery>(CampaignsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'campaigns',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
