import * as Types from '../../gql/schema';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type DisplaySettingsQueryVariables = Types.Exact<{
  input: Types.DisplaySettingsHash;
}>;

export type DisplaySettingsQuery = {
  __typename: 'Queries';
  displaySettings: {
    __typename: 'DisplaySettingsNode';
    customLogo?: {
      __typename: 'DisplaySettingNode';
      value: string;
      hash: string;
    } | null;
    customTheme?: {
      __typename: 'DisplaySettingNode';
      value: string;
      hash: string;
    } | null;
  };
};

export const DisplaySettingsDocument = gql`
  query displaySettings($input: DisplaySettingsHash!) {
    displaySettings(input: $input) {
      __typename
      customLogo {
        value
        hash
      }
      customTheme {
        value
        hash
      }
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables,
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper,
) {
  return {
    displaySettings(
      variables: DisplaySettingsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
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
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
