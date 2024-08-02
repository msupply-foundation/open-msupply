import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type TemperatureBreachRowFragment = { __typename: 'TemperatureBreachNode', id: string, unacknowledged: boolean, startDatetime: string, endDatetime?: string | null, type: Types.TemperatureBreachNodeType, location?: { __typename: 'LocationNode', name: string } | null };

export type TemperatureLogFragment = { __typename: 'TemperatureLogNode', id: string, datetime: string, temperature: number, sensor?: { __typename: 'SensorNode', id: string, name: string } | null, location?: { __typename: 'LocationNode', code: string, name: string } | null, temperatureBreach?: { __typename: 'TemperatureBreachNode', id: string, unacknowledged: boolean, startDatetime: string, endDatetime?: string | null, type: Types.TemperatureBreachNodeType, location?: { __typename: 'LocationNode', name: string } | null } | null };

export type Temperature_LogsQueryVariables = Types.Exact<{
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.TemperatureLogSortInput> | Types.TemperatureLogSortInput>;
  filter?: Types.InputMaybe<Types.TemperatureLogFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type Temperature_LogsQuery = { __typename: 'Queries', temperatureLogs: { __typename: 'TemperatureLogConnector', totalCount: number, nodes: Array<{ __typename: 'TemperatureLogNode', id: string, datetime: string, temperature: number, sensor?: { __typename: 'SensorNode', id: string, name: string } | null, location?: { __typename: 'LocationNode', code: string, name: string } | null, temperatureBreach?: { __typename: 'TemperatureBreachNode', id: string, unacknowledged: boolean, startDatetime: string, endDatetime?: string | null, type: Types.TemperatureBreachNodeType, location?: { __typename: 'LocationNode', name: string } | null } | null }> } };

export const TemperatureBreachRowFragmentDoc = gql`
    fragment TemperatureBreachRow on TemperatureBreachNode {
  __typename
  id
  unacknowledged
  startDatetime
  endDatetime
  startDatetime
  type
  location {
    name
  }
}
    `;
export const TemperatureLogFragmentDoc = gql`
    fragment TemperatureLog on TemperatureLogNode {
  __typename
  id
  datetime
  temperature
  sensor {
    id
    name
  }
  location {
    code
    name
  }
  temperatureBreach {
    ...TemperatureBreachRow
  }
}
    ${TemperatureBreachRowFragmentDoc}`;
export const Temperature_LogsDocument = gql`
    query temperature_logs($page: PaginationInput, $sort: [TemperatureLogSortInput!], $filter: TemperatureLogFilterInput, $storeId: String!) {
  temperatureLogs(page: $page, sort: $sort, filter: $filter, storeId: $storeId) {
    ... on TemperatureLogConnector {
      totalCount
      nodes {
        ...TemperatureLog
      }
    }
  }
}
    ${TemperatureLogFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    temperature_logs(variables: Temperature_LogsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<Temperature_LogsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<Temperature_LogsQuery>(Temperature_LogsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'temperature_logs', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;