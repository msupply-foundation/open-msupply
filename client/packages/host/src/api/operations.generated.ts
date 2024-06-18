import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type DatabaseSettingsQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type DatabaseSettingsQuery = { __typename: 'Queries', databaseSettings: { __typename: 'DatabaseSettingsNode', databaseType: Types.DatabaseType } };

export type DisplaySettingsQueryVariables = Types.Exact<{
  input: Types.DisplaySettingsHash;
}>;


export type DisplaySettingsQuery = { __typename: 'Queries', displaySettings: { __typename: 'DisplaySettingsNode', customTheme?: { __typename: 'DisplaySettingNode', value: string, hash: string } | null, customLogo?: { __typename: 'DisplaySettingNode', value: string, hash: string } | null } };

export type PluginsQueryVariables = Types.Exact<{ [key: string]: never; }>;


export type PluginsQuery = { __typename: 'Queries', plugins: Array<{ __typename: 'PluginNode', config: string, name: string, path: string }> };

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
export const PluginsDocument = gql`
    query plugins {
  plugins {
    config
    name
    path
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    databaseSettings(variables?: DatabaseSettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DatabaseSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DatabaseSettingsQuery>(DatabaseSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'databaseSettings', 'query');
    },
    displaySettings(variables: DisplaySettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DisplaySettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DisplaySettingsQuery>(DisplaySettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'displaySettings', 'query');
    },
    plugins(variables?: PluginsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PluginsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PluginsQuery>(PluginsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'plugins', 'query');
    },
    labelPrinterSettings(variables?: LabelPrinterSettingsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LabelPrinterSettingsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LabelPrinterSettingsQuery>(LabelPrinterSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'labelPrinterSettings', 'query');
    },
    updateDisplaySettings(variables: UpdateDisplaySettingsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateDisplaySettingsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateDisplaySettingsMutation>(UpdateDisplaySettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateDisplaySettings', 'mutation');
    },
    updateLabelPrinterSettings(variables: UpdateLabelPrinterSettingsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateLabelPrinterSettingsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateLabelPrinterSettingsMutation>(UpdateLabelPrinterSettingsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateLabelPrinterSettings', 'mutation');
    },
    configureNameProperties(variables: ConfigureNamePropertiesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ConfigureNamePropertiesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ConfigureNamePropertiesMutation>(ConfigureNamePropertiesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'configureNameProperties', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDatabaseSettingsQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ databaseSettings })
 *   )
 * })
 */
export const mockDatabaseSettingsQuery = (resolver: ResponseResolver<GraphQLRequest<DatabaseSettingsQueryVariables>, GraphQLContext<DatabaseSettingsQuery>, any>) =>
  graphql.query<DatabaseSettingsQuery, DatabaseSettingsQueryVariables>(
    'databaseSettings',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDisplaySettingsQuery((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ displaySettings })
 *   )
 * })
 */
export const mockDisplaySettingsQuery = (resolver: ResponseResolver<GraphQLRequest<DisplaySettingsQueryVariables>, GraphQLContext<DisplaySettingsQuery>, any>) =>
  graphql.query<DisplaySettingsQuery, DisplaySettingsQueryVariables>(
    'displaySettings',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockPluginsQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ plugins })
 *   )
 * })
 */
export const mockPluginsQuery = (resolver: ResponseResolver<GraphQLRequest<PluginsQueryVariables>, GraphQLContext<PluginsQuery>, any>) =>
  graphql.query<PluginsQuery, PluginsQueryVariables>(
    'plugins',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockLabelPrinterSettingsQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ labelPrinterSettings })
 *   )
 * })
 */
export const mockLabelPrinterSettingsQuery = (resolver: ResponseResolver<GraphQLRequest<LabelPrinterSettingsQueryVariables>, GraphQLContext<LabelPrinterSettingsQuery>, any>) =>
  graphql.query<LabelPrinterSettingsQuery, LabelPrinterSettingsQueryVariables>(
    'labelPrinterSettings',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateDisplaySettingsMutation((req, res, ctx) => {
 *   const { displaySettings } = req.variables;
 *   return res(
 *     ctx.data({ updateDisplaySettings })
 *   )
 * })
 */
export const mockUpdateDisplaySettingsMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateDisplaySettingsMutationVariables>, GraphQLContext<UpdateDisplaySettingsMutation>, any>) =>
  graphql.mutation<UpdateDisplaySettingsMutation, UpdateDisplaySettingsMutationVariables>(
    'updateDisplaySettings',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateLabelPrinterSettingsMutation((req, res, ctx) => {
 *   const { labelPrinterSettings } = req.variables;
 *   return res(
 *     ctx.data({ updateLabelPrinterSettings })
 *   )
 * })
 */
export const mockUpdateLabelPrinterSettingsMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateLabelPrinterSettingsMutationVariables>, GraphQLContext<UpdateLabelPrinterSettingsMutation>, any>) =>
  graphql.mutation<UpdateLabelPrinterSettingsMutation, UpdateLabelPrinterSettingsMutationVariables>(
    'updateLabelPrinterSettings',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockConfigureNamePropertiesMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ centralServer })
 *   )
 * })
 */
export const mockConfigureNamePropertiesMutation = (resolver: ResponseResolver<GraphQLRequest<ConfigureNamePropertiesMutationVariables>, GraphQLContext<ConfigureNamePropertiesMutation>, any>) =>
  graphql.mutation<ConfigureNamePropertiesMutation, ConfigureNamePropertiesMutationVariables>(
    'configureNameProperties',
    resolver
  )
