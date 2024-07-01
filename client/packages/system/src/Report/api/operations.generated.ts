import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
export type ReportRowFragment = { __typename: 'ReportNode', context: Types.ReportContext, id: string, name: string, subContext?: string | null, argumentSchema?: { __typename: 'FormSchemaNode', id: string, type: string, jsonSchema: any, uiSchema: any } | null };

export type ReportsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  key: Types.Scalars['String']['input'];
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ReportFilterInput>;
}>;


export type ReportsQuery = { __typename: 'Queries', reports: { __typename: 'ReportConnector', totalCount: number, nodes: Array<{ __typename: 'ReportNode', context: Types.ReportContext, id: string, name: string, subContext?: string | null, argumentSchema?: { __typename: 'FormSchemaNode', id: string, type: string, jsonSchema: any, uiSchema: any } | null }> } };

export type PrintReportQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  reportId: Types.Scalars['String']['input'];
  dataId?: Types.InputMaybe<Types.Scalars['String']['input']>;
  arguments?: Types.InputMaybe<Types.Scalars['JSON']['input']>;
  format?: Types.InputMaybe<Types.PrintFormat>;
  sort?: Types.InputMaybe<Types.PrintReportSortInput>;
}>;


export type PrintReportQuery = { __typename: 'Queries', printReport: { __typename: 'PrintReportError', error: { __typename: 'FailedToFetchReportData', description: string, errors: any } } | { __typename: 'PrintReportNode', fileId: string } };

export const ReportRowFragmentDoc = gql`
    fragment ReportRow on ReportNode {
  context
  id
  name
  subContext
  argumentSchema {
    id
    type
    jsonSchema
    uiSchema
  }
}
    `;
export const ReportsDocument = gql`
    query reports($storeId: String!, $key: String!, $desc: Boolean, $filter: ReportFilterInput) {
  reports(storeId: $storeId, sort: {key: $key, desc: $desc}, filter: $filter) {
    ... on ReportConnector {
      nodes {
        __typename
        ...ReportRow
      }
      totalCount
    }
  }
}
    ${ReportRowFragmentDoc}`;
export const PrintReportDocument = gql`
    query printReport($storeId: String!, $reportId: String!, $dataId: String, $arguments: JSON, $format: PrintFormat, $sort: PrintReportSortInput) {
  printReport(
    dataId: $dataId
    reportId: $reportId
    storeId: $storeId
    format: $format
    arguments: $arguments
    sort: $sort
  ) {
    ... on PrintReportNode {
      __typename
      fileId
    }
    ... on PrintReportError {
      __typename
      error {
        ... on FailedToFetchReportData {
          __typename
          description
          errors
        }
        description
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    reports(variables: ReportsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ReportsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ReportsQuery>(ReportsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'reports', 'query');
    },
    printReport(variables: PrintReportQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PrintReportQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PrintReportQuery>(PrintReportDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'printReport', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;