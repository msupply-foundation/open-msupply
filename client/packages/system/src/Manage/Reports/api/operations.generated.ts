import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ReportWithVersionRowFragment = {
  __typename: 'ReportNode';
  context: Types.ReportContext;
  id: string;
  name: string;
  code: string;
  isCustom: boolean;
  isActive: boolean;
  version: string;
};

export type AllReportVersionsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  userLanguage: Types.Scalars['String']['input'];
  key: Types.ReportSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ReportFilterInput>;
}>;

export type AllReportVersionsQuery = {
  __typename: 'Queries';
  allReportVersions:
    | {
        __typename: 'QueryReportsError';
        error: { __typename: 'FailedTranslation'; description: string };
      }
    | {
        __typename: 'ReportConnector';
        totalCount: number;
        nodes: Array<{
          __typename: 'ReportNode';
          context: Types.ReportContext;
          id: string;
          name: string;
          code: string;
          isCustom: boolean;
          isActive: boolean;
          version: string;
        }>;
      };
};

export const ReportWithVersionRowFragmentDoc = gql`
  fragment ReportWithVersionRow on ReportNode {
    __typename
    context
    id
    name
    code
    isCustom
    isActive
    version
  }
`;
export const AllReportVersionsDocument = gql`
  query allReportVersions(
    $storeId: String!
    $userLanguage: String!
    $key: ReportSortFieldInput!
    $desc: Boolean
    $filter: ReportFilterInput
  ) {
    allReportVersions(
      storeId: $storeId
      userLanguage: $userLanguage
      sort: { key: $key, desc: $desc }
      filter: $filter
    ) {
      __typename
      ... on ReportConnector {
        nodes {
          ...ReportWithVersionRow
        }
        totalCount
      }
      ... on QueryReportsError {
        __typename
        error {
          ... on FailedTranslation {
            __typename
            description
          }
        }
      }
    }
  }
  ${ReportWithVersionRowFragmentDoc}
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
    allReportVersions(
      variables: AllReportVersionsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<AllReportVersionsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<AllReportVersionsQuery>(
            AllReportVersionsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'allReportVersions',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
