import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type ReportRowFragment = {
  __typename: 'ReportNode';
  context: Types.ReportContext;
  id: string;
  name: string;
  code: string;
  subContext?: string | null;
  isCustom: boolean;
  isActive: boolean;
  argumentSchema?: {
    __typename: 'FormSchemaNode';
    id: string;
    type: string;
    jsonSchema: any;
    uiSchema: any;
  } | null;
};

export type ReportQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  userLanguage: Types.Scalars['String']['input'];
  id: Types.Scalars['String']['input'];
}>;

export type ReportQuery = {
  __typename: 'Queries';
  report:
    | {
        __typename: 'QueryReportError';
        error: { __typename: 'FailedTranslation'; description: string };
      }
    | {
        __typename: 'ReportNode';
        context: Types.ReportContext;
        id: string;
        name: string;
        code: string;
        subContext?: string | null;
        isCustom: boolean;
        isActive: boolean;
        argumentSchema?: {
          __typename: 'FormSchemaNode';
          id: string;
          type: string;
          jsonSchema: any;
          uiSchema: any;
        } | null;
      };
};

export type ReportsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  userLanguage: Types.Scalars['String']['input'];
  key: Types.ReportSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ReportFilterInput>;
}>;

export type ReportsQuery = {
  __typename: 'Queries';
  reports:
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
          subContext?: string | null;
          isCustom: boolean;
          isActive: boolean;
          argumentSchema?: {
            __typename: 'FormSchemaNode';
            id: string;
            type: string;
            jsonSchema: any;
            uiSchema: any;
          } | null;
        }>;
      };
};

export type GenerateReportQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  reportId: Types.Scalars['String']['input'];
  dataId?: Types.InputMaybe<Types.Scalars['String']['input']>;
  arguments?: Types.InputMaybe<Types.Scalars['JSON']['input']>;
  format?: Types.InputMaybe<Types.PrintFormat>;
  sort?: Types.InputMaybe<Types.PrintReportSortInput>;
  currentLanguage?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;

export type GenerateReportQuery = {
  __typename: 'Queries';
  generateReport:
    | {
        __typename: 'PrintReportError';
        error: {
          __typename: 'FailedToFetchReportData';
          description: string;
          errors: any;
        };
      }
    | { __typename: 'PrintReportNode'; fileId: string };
};

export type CsvToExcelQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  csvData: Types.Scalars['String']['input'];
  filename: Types.Scalars['String']['input'];
}>;

export type CsvToExcelQuery = {
  __typename: 'Queries';
  csvToExcel:
    | {
        __typename: 'PrintReportError';
        error: { __typename: 'FailedToFetchReportData'; description: string };
      }
    | { __typename: 'PrintReportNode'; fileId: string };
};

export const ReportRowFragmentDoc = gql`
  fragment ReportRow on ReportNode {
    __typename
    context
    id
    name
    code
    subContext
    isCustom
    isActive
    argumentSchema {
      id
      type
      jsonSchema
      uiSchema
    }
  }
`;
export const ReportDocument = gql`
  query report($storeId: String!, $userLanguage: String!, $id: String!) {
    report(storeId: $storeId, userLanguage: $userLanguage, id: $id) {
      ... on ReportNode {
        ...ReportRow
      }
      ... on QueryReportError {
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
  ${ReportRowFragmentDoc}
`;
export const ReportsDocument = gql`
  query reports(
    $storeId: String!
    $userLanguage: String!
    $key: ReportSortFieldInput!
    $desc: Boolean
    $filter: ReportFilterInput
  ) {
    reports(
      storeId: $storeId
      userLanguage: $userLanguage
      sort: { key: $key, desc: $desc }
      filter: $filter
    ) {
      __typename
      ... on ReportConnector {
        nodes {
          ...ReportRow
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
  ${ReportRowFragmentDoc}
`;
export const GenerateReportDocument = gql`
  query generateReport(
    $storeId: String!
    $reportId: String!
    $dataId: String
    $arguments: JSON
    $format: PrintFormat
    $sort: PrintReportSortInput
    $currentLanguage: String
  ) {
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
export const CsvToExcelDocument = gql`
  query csvToExcel($storeId: String!, $csvData: String!, $filename: String!) {
    csvToExcel(storeId: $storeId, csvData: $csvData, filename: $filename) {
      ... on PrintReportNode {
        __typename
        fileId
      }
      ... on PrintReportError {
        __typename
        error {
          description
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
    report(
      variables: ReportQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ReportQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ReportQuery>({
            document: ReportDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'report',
        'query',
        variables
      );
    },
    reports(
      variables: ReportsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ReportsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ReportsQuery>({
            document: ReportsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'reports',
        'query',
        variables
      );
    },
    generateReport(
      variables: GenerateReportQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<GenerateReportQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GenerateReportQuery>({
            document: GenerateReportDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'generateReport',
        'query',
        variables
      );
    },
    csvToExcel(
      variables: CsvToExcelQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<CsvToExcelQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<CsvToExcelQuery>({
            document: CsvToExcelDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'csvToExcel',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
