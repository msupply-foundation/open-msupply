import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type DatabaseSettingsQueryVariables = Types.Exact<{
  [key: string]: never;
}>;

export type DatabaseSettingsQuery = {
  __typename: 'Queries';
  databaseSettings: {
    __typename: 'DatabaseSettingsNode';
    databaseType: Types.DatabaseType;
  };
};

export type DisplaySettingsQueryVariables = Types.Exact<{
  input: Types.DisplaySettingsHash;
}>;

export type DisplaySettingsQuery = {
  __typename: 'Queries';
  displaySettings: {
    __typename: 'DisplaySettingsNode';
    customTheme?: {
      __typename: 'DisplaySettingNode';
      value: string;
      hash: string;
    } | null;
    customLogo?: {
      __typename: 'DisplaySettingNode';
      value: string;
      hash: string;
    } | null;
  };
};

export type LabelPrinterSettingsQueryVariables = Types.Exact<{
  [key: string]: never;
}>;

export type LabelPrinterSettingsQuery = {
  __typename: 'Queries';
  labelPrinterSettings?: {
    __typename: 'LabelPrinterSettingNode';
    address: string;
    labelHeight: number;
    labelWidth: number;
    port: number;
  } | null;
};

export type UpdateDisplaySettingsMutationVariables = Types.Exact<{
  displaySettings: Types.DisplaySettingsInput;
}>;

export type UpdateDisplaySettingsMutation = {
  __typename: 'Mutations';
  updateDisplaySettings:
    | { __typename: 'UpdateDisplaySettingsError'; error: string }
    | {
        __typename: 'UpdateResult';
        theme?: string | null;
        logo?: string | null;
      };
};

export type UpdateLabelPrinterSettingsMutationVariables = Types.Exact<{
  labelPrinterSettings: Types.LabelPrinterSettingsInput;
}>;

export type UpdateLabelPrinterSettingsMutation = {
  __typename: 'Mutations';
  updateLabelPrinterSettings:
    | { __typename: 'LabelPrinterUpdateResult'; success: boolean }
    | { __typename: 'UpdateLabelPrinterSettingsError' };
};

export type ConfigureNamePropertiesMutationVariables = Types.Exact<{
  input:
    | Array<Types.ConfigureNamePropertyInput>
    | Types.ConfigureNamePropertyInput;
}>;

export type ConfigureNamePropertiesMutation = {
  __typename: 'Mutations';
  centralServer: {
    __typename: 'CentralServerMutationNode';
    general: {
      __typename: 'CentralGeneralMutations';
      configureNameProperties: { __typename: 'Success'; success: boolean };
    };
  };
};

export type InsertContactFormMutationVariables = Types.Exact<{
  input: Types.InsertContactFormInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type InsertContactFormMutation = {
  __typename: 'Mutations';
  insertContactForm: { __typename: 'InsertResponse'; id: string };
};

export const DatabaseSettingsDocument = gql`
  query databaseSettings {
    databaseSettings {
      ... on DatabaseSettingsNode {
        databaseType
      }
    }
  }
`;
export const DisplaySettingsDocument = gql`
  query displaySettings($input: DisplaySettingsHash!) {
    displaySettings(input: $input) {
      customTheme {
        value
        hash
      }
      customLogo {
        value
        hash
      }
    }
  }
`;
export const LabelPrinterSettingsDocument = gql`
  query labelPrinterSettings {
    labelPrinterSettings {
      __typename
      address
      labelHeight
      labelWidth
      port
    }
  }
`;
export const UpdateDisplaySettingsDocument = gql`
  mutation updateDisplaySettings($displaySettings: DisplaySettingsInput!) {
    updateDisplaySettings(input: $displaySettings) {
      __typename
      ... on UpdateResult {
        __typename
        theme
        logo
      }
      ... on UpdateDisplaySettingsError {
        __typename
        error
      }
    }
  }
`;
export const UpdateLabelPrinterSettingsDocument = gql`
  mutation updateLabelPrinterSettings(
    $labelPrinterSettings: LabelPrinterSettingsInput!
  ) {
    updateLabelPrinterSettings(input: $labelPrinterSettings) {
      ... on LabelPrinterUpdateResult {
        __typename
        success
      }
    }
  }
`;
export const ConfigureNamePropertiesDocument = gql`
  mutation configureNameProperties($input: [ConfigureNamePropertyInput!]!) {
    centralServer {
      general {
        configureNameProperties(input: $input) {
          __typename
          ... on Success {
            __typename
            success
          }
        }
      }
    }
  }
`;
export const InsertContactFormDocument = gql`
  mutation insertContactForm(
    $input: InsertContactFormInput!
    $storeId: String!
  ) {
    insertContactForm(input: $input, storeId: $storeId) {
      ... on InsertResponse {
        id
      }
    }
  }
`;

export type GenerateReportDefinitionQueryVariables = {
  storeId: string;
  name?: string | null;
  report: unknown;
  dataId?: string | null;
  arguments?: unknown | null;
  format?: string | null;
};

export type GenerateReportDefinitionQuery = {
  generateReportDefinition:
    | { __typename: 'PrintReportNode'; fileId: string }
    | {
        __typename: 'PrintReportError';
        error: {
          __typename: 'FailedToFetchReportData';
          description: string;
          errors: unknown;
        };
      };
};

export const GenerateReportDefinitionDocument = gql`
  query generateReportDefinition(
    $storeId: String!
    $name: String
    $report: JSON!
    $dataId: String
    $arguments: JSON
    $format: PrintFormat = HTML
  ) {
    generateReportDefinition(
      dataId: $dataId
      name: $name
      report: $report
      storeId: $storeId
      arguments: $arguments
      format: $format
    ) {
      ... on PrintReportNode {
        __typename
        fileId
      }
      ... on PrintReportError {
        __typename
        error {
          description
          ... on FailedToFetchReportData {
            __typename
            description
            errors
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
    databaseSettings(
      variables?: DatabaseSettingsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DatabaseSettingsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DatabaseSettingsQuery>({
            document: DatabaseSettingsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'databaseSettings',
        'query',
        variables
      );
    },
    displaySettings(
      variables: DisplaySettingsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DisplaySettingsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DisplaySettingsQuery>({
            document: DisplaySettingsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'displaySettings',
        'query',
        variables
      );
    },
    labelPrinterSettings(
      variables?: LabelPrinterSettingsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<LabelPrinterSettingsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<LabelPrinterSettingsQuery>({
            document: LabelPrinterSettingsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'labelPrinterSettings',
        'query',
        variables
      );
    },
    updateDisplaySettings(
      variables: UpdateDisplaySettingsMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdateDisplaySettingsMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateDisplaySettingsMutation>({
            document: UpdateDisplaySettingsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateDisplaySettings',
        'mutation',
        variables
      );
    },
    updateLabelPrinterSettings(
      variables: UpdateLabelPrinterSettingsMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdateLabelPrinterSettingsMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateLabelPrinterSettingsMutation>({
            document: UpdateLabelPrinterSettingsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateLabelPrinterSettings',
        'mutation',
        variables
      );
    },
    configureNameProperties(
      variables: ConfigureNamePropertiesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ConfigureNamePropertiesMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ConfigureNamePropertiesMutation>({
            document: ConfigureNamePropertiesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'configureNameProperties',
        'mutation',
        variables
      );
    },
    insertContactForm(
      variables: InsertContactFormMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InsertContactFormMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertContactFormMutation>({
            document: InsertContactFormDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertContactForm',
        'mutation',
        variables
      );
    },
    generateReportDefinition(
      variables: GenerateReportDefinitionQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<GenerateReportDefinitionQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GenerateReportDefinitionQuery>({
            document: GenerateReportDefinitionDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'generateReportDefinition',
        'query',
        variables
      );
    },
    reportBuilderRecords(
      variables: ReportBuilderRecordsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ReportBuilderRecordsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ReportBuilderRecordsQuery>({
            document: ReportBuilderRecordsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'reportBuilderRecords',
        'query',
        variables
      );
    },
    reportBuilderRequisitions(
      variables: ReportBuilderRequisitionsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ReportBuilderRequisitionsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ReportBuilderRequisitionsQuery>({
            document: ReportBuilderRequisitionsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'reportBuilderRequisitions',
        'query',
        variables
      );
    },
    reportBuilderStocktakes(
      variables: ReportBuilderStocktakesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ReportBuilderStocktakesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ReportBuilderStocktakesQuery>({
            document: ReportBuilderStocktakesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'reportBuilderStocktakes',
        'query',
        variables
      );
    },
    reportBuilderPurchaseOrders(
      variables: ReportBuilderPurchaseOrdersQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ReportBuilderPurchaseOrdersQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ReportBuilderPurchaseOrdersQuery>({
            document: ReportBuilderPurchaseOrdersDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'reportBuilderPurchaseOrders',
        'query',
        variables
      );
    },
    upsertReportDefinition(
      variables: UpsertReportDefinitionMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpsertReportDefinitionMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertReportDefinitionMutation>({
            document: UpsertReportDefinitionDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'upsertReportDefinition',
        'mutation',
        variables
      );
    },
    reportBuilderList(
      variables: ReportBuilderListQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<ReportBuilderListQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ReportBuilderListQuery>({
            document: ReportBuilderListDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'reportBuilderList',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;

// ============================================================
// Report Builder record picker queries
// ============================================================

export type ReportBuilderRecordsQueryVariables = {
  storeId: string;
  invoiceType?: string | null;
};

export type ReportBuilderRecordsQuery = {
  invoices:
    | {
        __typename: 'InvoiceConnector';
        nodes: Array<{
          id: string;
          invoiceNumber: number;
          otherPartyName: string;
          createdDatetime: string;
        }>;
      }
    | { __typename: 'ConnectorError' };
};

export type ReportBuilderRequisitionsQueryVariables = {
  storeId: string;
};

export type ReportBuilderRequisitionsQuery = {
  requisitions:
    | {
        __typename: 'RequisitionConnector';
        nodes: Array<{
          id: string;
          requisitionNumber: number;
          otherPartyName: string;
          createdDatetime: string;
        }>;
      }
    | { __typename: 'ConnectorError' };
};

export type ReportBuilderStocktakesQueryVariables = {
  storeId: string;
};

export type ReportBuilderStocktakesQuery = {
  stocktakes:
    | {
        __typename: 'StocktakeConnector';
        nodes: Array<{
          id: string;
          stocktakeNumber: number;
          description?: string | null;
          createdDatetime: string;
        }>;
      }
    | { __typename: 'ConnectorError' };
};

export type ReportBuilderPurchaseOrdersQueryVariables = {
  storeId: string;
};

export type ReportBuilderPurchaseOrdersQuery = {
  purchaseOrders:
    | {
        __typename: 'PurchaseOrderConnector';
        nodes: Array<{
          id: string;
          number: number;
          supplier?: { name: string } | null;
          createdDatetime: string;
        }>;
      }
    | { __typename: 'ConnectorError' };
};

export const ReportBuilderRecordsDocument = gql`
  query reportBuilderRecords($storeId: String!, $invoiceType: InvoiceNodeType) {
    invoices(storeId: $storeId, filter: { type: { equalTo: $invoiceType } }) {
      ... on InvoiceConnector {
        nodes {
          id
          invoiceNumber
          otherPartyName
          createdDatetime
        }
      }
    }
  }
`;

export const ReportBuilderRequisitionsDocument = gql`
  query reportBuilderRequisitions($storeId: String!) {
    requisitions(storeId: $storeId) {
      ... on RequisitionConnector {
        nodes {
          id
          requisitionNumber
          otherPartyName
          createdDatetime
        }
      }
    }
  }
`;

export const ReportBuilderStocktakesDocument = gql`
  query reportBuilderStocktakes($storeId: String!) {
    stocktakes(storeId: $storeId) {
      ... on StocktakeConnector {
        nodes {
          id
          stocktakeNumber
          description
          createdDatetime
        }
      }
    }
  }
`;

export const ReportBuilderPurchaseOrdersDocument = gql`
  query reportBuilderPurchaseOrders($storeId: String!) {
    purchaseOrders(storeId: $storeId) {
      ... on PurchaseOrderConnector {
        nodes {
          id
          number
          supplier {
            name
          }
          createdDatetime
        }
      }
    }
  }
`;

// ============================================================
// Report Builder: save / load report definitions
// ============================================================

export type UpsertReportDefinitionMutationVariables = {
  storeId: string;
  input: {
    id?: string | null;
    name: string;
    template: unknown;
    context: string;
    comment?: string | null;
    code?: string | null;
  };
};

export type UpsertReportDefinitionMutation = {
  __typename: 'Mutations';
  upsertReportDefinition: {
    __typename: 'UpsertReportDefinitionResponse';
    id: string;
  };
};

export const UpsertReportDefinitionDocument = gql`
  mutation upsertReportDefinition(
    $storeId: String!
    $input: UpsertReportDefinitionInput!
  ) {
    upsertReportDefinition(storeId: $storeId, input: $input) {
      id
    }
  }
`;

export type ReportBuilderListQueryVariables = {
  storeId: string;
  userLanguage: string;
  filter?: {
    name?: { like?: string | null } | null;
    isActive?: boolean | null;
  } | null;
};

export type ReportBuilderListQuery = {
  reports:
    | {
        __typename: 'ReportConnector';
        totalCount: number;
        nodes: Array<{
          id: string;
          name: string;
          code: string;
          context: string;
          isCustom: boolean;
          template: string;
        }>;
      }
    | { __typename: 'QueryReportsError' };
};

export const ReportBuilderListDocument = gql`
  query reportBuilderList(
    $storeId: String!
    $userLanguage: String!
    $filter: ReportFilterInput
  ) {
    reports(
      storeId: $storeId
      userLanguage: $userLanguage
      filter: $filter
    ) {
      ... on ReportConnector {
        totalCount
        nodes {
          id
          name
          code
          context
          isCustom
          template
        }
      }
    }
  }
`;