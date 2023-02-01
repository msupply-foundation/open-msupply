import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type ReportRowFragment = { __typename: 'ReportNode', context: Types.ReportContext, id: string, name: string, subContext?: string | null, argumentSchema?: { __typename: 'FormSchemaNode', id: string, type: string, jsonSchema: any, uiSchema: any } | null };

export type ReportsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key: Types.Scalars['String'];
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.ReportFilterInput>;
}>;


export type ReportsQuery = { __typename: 'Queries', reports: { __typename: 'ReportConnector', totalCount: number, nodes: Array<{ __typename: 'ReportNode', context: Types.ReportContext, id: string, name: string, subContext?: string | null, argumentSchema?: { __typename: 'FormSchemaNode', id: string, type: string, jsonSchema: any, uiSchema: any } | null }> } };

export type PrintReportQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  reportId: Types.Scalars['String'];
  dataId?: Types.InputMaybe<Types.Scalars['String']>;
  arguments?: Types.InputMaybe<Types.Scalars['JSON']>;
  format?: Types.InputMaybe<Types.PrintFormat>;
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
    query printReport($storeId: String!, $reportId: String!, $dataId: String, $arguments: JSON, $format: PrintFormat) {
  printReport(
    dataId: $dataId
    reportId: $reportId
    storeId: $storeId
    format: $format
    arguments: $arguments
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
    reports(variables: ReportsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ReportsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ReportsQuery>(ReportsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'reports', 'query');
    },
    printReport(variables: PrintReportQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<PrintReportQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PrintReportQuery>(PrintReportDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'printReport', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockReportsQuery((req, res, ctx) => {
 *   const { storeId, key, desc, filter } = req.variables;
 *   return res(
 *     ctx.data({ reports })
 *   )
 * })
 */
export const mockReportsQuery = (resolver: ResponseResolver<GraphQLRequest<ReportsQueryVariables>, GraphQLContext<ReportsQuery>, any>) =>
  graphql.query<ReportsQuery, ReportsQueryVariables>(
    'reports',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockPrintReportQuery((req, res, ctx) => {
 *   const { storeId, reportId, dataId, arguments, format } = req.variables;
 *   return res(
 *     ctx.data({ printReport })
 *   )
 * })
 */
export const mockPrintReportQuery = (resolver: ResponseResolver<GraphQLRequest<PrintReportQueryVariables>, GraphQLContext<PrintReportQuery>, any>) =>
  graphql.query<PrintReportQuery, PrintReportQueryVariables>(
    'printReport',
    resolver
  )
