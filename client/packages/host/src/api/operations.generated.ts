import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type DatabaseSettingsQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type DatabaseSettingsQuery = { __typename: 'Queries', databaseSettings: { __typename: 'DatabaseSettingsNode', databaseType: Types.DatabaseType } };

export type DisplaySettingsQueryVariables = Types.Exact<{
  input: Types.DisplaySettingsHash;
}>;


export type DisplaySettingsQuery = { __typename: 'Queries', displaySettings: { __typename: 'DisplaySettingsNode', customTheme?: { __typename: 'DisplaySettingNode', value: string, hash: string } | null, customLogo?: { __typename: 'DisplaySettingNode', value: string, hash: string } | null } };

export type LabelPrinterSettingsQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type LabelPrinterSettingsQuery = { __typename: 'Queries', labelPrinterSettings?: { __typename: 'LabelPrinterSettingNode', address: string, labelHeight: number, labelWidth: number, port: number } | null };

export type UpdateDisplaySettingsMutationVariables = Types.Exact<{
  displaySettings: Types.DisplaySettingsInput;
}>;


export type UpdateDisplaySettingsMutation = { __typename: 'Mutations', updateDisplaySettings: { __typename: 'UpdateDisplaySettingsError', error: string } | { __typename: 'UpdateResult', theme?: string | null, logo?: string | null } };

export type UpdateLabelPrinterSettingsMutationVariables = Types.Exact<{
  labelPrinterSettings: Types.LabelPrinterSettingsInput;
}>;


export type UpdateLabelPrinterSettingsMutation = { __typename: 'Mutations', updateLabelPrinterSettings: { __typename: 'LabelPrinterUpdateResult', success: boolean } | { __typename: 'UpdateLabelPrinterSettingsError' } };

export type ConfigureNamePropertiesMutationVariables = Types.Exact<{
  input: Array<Types.ConfigureNamePropertyInput> | Types.ConfigureNamePropertyInput;
}>;


export type ConfigureNamePropertiesMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', general: { __typename: 'CentralGeneralMutations', configureNameProperties: { __typename: 'Success', success: boolean } } } };

export type InsertContactFormMutationVariables = Types.Exact<{
  input: Types.InsertContactFormInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type InsertContactFormMutation = { __typename: 'Mutations', insertContactForm: { __typename: 'InsertResponse', id: string } };


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
    mutation updateLabelPrinterSettings($labelPrinterSettings: LabelPrinterSettingsInput!) {
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
    mutation insertContactForm($input: InsertContactFormInput!, $storeId: String!) {
  insertContactForm(input: $input, storeId: $storeId) {
    ... on InsertResponse {
      id
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    databaseSettings(variables?: DatabaseSettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DatabaseSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DatabaseSettingsQuery>(DatabaseSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'databaseSettings', 'query', variables);
    },
    displaySettings(variables: DisplaySettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DisplaySettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DisplaySettingsQuery>(DisplaySettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'displaySettings', 'query', variables);
    },
    labelPrinterSettings(variables?: LabelPrinterSettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LabelPrinterSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LabelPrinterSettingsQuery>(LabelPrinterSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'labelPrinterSettings', 'query', variables);
    },
    updateDisplaySettings(variables: UpdateDisplaySettingsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateDisplaySettingsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateDisplaySettingsMutation>(UpdateDisplaySettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateDisplaySettings', 'mutation', variables);
    },
    updateLabelPrinterSettings(variables: UpdateLabelPrinterSettingsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateLabelPrinterSettingsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateLabelPrinterSettingsMutation>(UpdateLabelPrinterSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateLabelPrinterSettings', 'mutation', variables);
    },
    configureNameProperties(variables: ConfigureNamePropertiesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ConfigureNamePropertiesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ConfigureNamePropertiesMutation>(ConfigureNamePropertiesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'configureNameProperties', 'mutation', variables);
    },
    insertContactForm(variables: InsertContactFormMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertContactFormMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertContactFormMutation>(InsertContactFormDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertContactForm', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;