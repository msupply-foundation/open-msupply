import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ReportRowFragment = { __typename: 'ReportNode', context: Types.ReportContext, id: string, name: string, subContext?: string | null, argumentSchema?: { __typename: 'FormSchemaNode', id: string, type: string, jsonSchema: any, uiSchema: any } | null };

export type ReportQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  id: Types.Scalars['String']['input'];
}>;


export type ReportQuery = { __typename: 'Queries', report: { __typename: 'ReportNode', context: Types.ReportContext, id: string, name: string, subContext?: string | null, argumentSchema?: { __typename: 'FormSchemaNode', id: string, type: string, jsonSchema: any, uiSchema: any } | null } };

export type ReportsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  key: Types.ReportSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ReportFilterInput>;
}>;


export type ReportsQuery = { __typename: 'Queries', reports: { __typename: 'ReportConnector', totalCount: number, nodes: Array<{ __typename: 'ReportNode', context: Types.ReportContext, id: string, name: string, subContext?: string | null, argumentSchema?: { __typename: 'FormSchemaNode', id: string, type: string, jsonSchema: any, uiSchema: any } | null }> } };

export type GenerateReportQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  reportId: Types.Scalars['String']['input'];
  dataId?: Types.InputMaybe<Types.Scalars['String']['input']>;
  arguments?: Types.InputMaybe<Types.Scalars['JSON']['input']>;
  format?: Types.InputMaybe<Types.PrintFormat>;
  sort?: Types.InputMaybe<Types.PrintReportSortInput>;
  currentLanguage?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type GenerateReportQuery = { __typename: 'Queries', generateReport: { __typename: 'PrintReportError', error: { __typename: 'FailedToFetchReportData', description: string, errors: any } } | { __typename: 'PrintReportNode', fileId: string } };

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
export const ReportDocument = gql`
    query report($storeId: String!, $id: String!) {
  report(storeId: $storeId, id: $id) {
    ...ReportRow
  }
}
    ${ReportRowFragmentDoc}`;
export const ReportsDocument = gql`
    query reports($storeId: String!, $key: ReportSortFieldInput!, $desc: Boolean, $filter: ReportFilterInput) {
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
export const GenerateReportDocument = gql`
    query generateReport($storeId: String!, $reportId: String!, $dataId: String, $arguments: JSON, $format: PrintFormat, $sort: PrintReportSortInput, $currentLanguage: String) {
  generateReport(
    dataId: $dataId
    reportId: $reportId
    storeId: $storeId
    format: $format
    arguments: $arguments
    sort: $sort
    currentLanguage: $currentLanguage
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    report(variables: ReportQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ReportQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ReportQuery>(ReportDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'report', 'query', variables);
    },
    reports(variables: ReportsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ReportsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ReportsQuery>(ReportsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'reports', 'query', variables);
    },
    generateReport(variables: GenerateReportQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GenerateReportQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GenerateReportQuery>(GenerateReportDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'generateReport', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;