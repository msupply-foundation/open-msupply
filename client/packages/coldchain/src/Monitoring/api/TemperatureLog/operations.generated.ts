import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { SensorFragmentDoc } from '../../../Sensor/api/operations.generated';
import { LocationRowFragmentDoc } from '../../../../../system/src/Location/api/operations.generated';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type TemperatureBreachRowFragment = { __typename: 'TemperatureBreachNode', id: string, type: Types.TemperatureBreachNodeType };

export type TemperatureLogFragment = { __typename: 'TemperatureLogNode', id: string, datetime: string, temperature: number, sensor?: { __typename: 'SensorNode', id: string, isActive: boolean, name: string, serial: string, batteryLevel?: number | null, breach?: Types.TemperatureBreachNodeType | null, type: Types.SensorNodeType, location?: { __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string } | null, latestTemperatureLog?: { __typename: 'TemperatureLogConnector', totalCount: number, nodes: Array<{ __typename: 'TemperatureLogNode', temperature: number, datetime: string }> } | null } | null, location?: { __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string } | null, temperatureBreach?: { __typename: 'TemperatureBreachNode', id: string, type: Types.TemperatureBreachNodeType } | null };

export type Temperature_LogsQueryVariables = Types.Exact<{
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.TemperatureLogSortInput> | Types.TemperatureLogSortInput>;
  filter?: Types.InputMaybe<Types.TemperatureLogFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type Temperature_LogsQuery = { __typename: 'Queries', temperatureLogs: { __typename: 'TemperatureLogConnector', totalCount: number, nodes: Array<{ __typename: 'TemperatureLogNode', id: string, datetime: string, temperature: number, sensor?: { __typename: 'SensorNode', id: string, isActive: boolean, name: string, serial: string, batteryLevel?: number | null, breach?: Types.TemperatureBreachNodeType | null, type: Types.SensorNodeType, location?: { __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string } | null, latestTemperatureLog?: { __typename: 'TemperatureLogConnector', totalCount: number, nodes: Array<{ __typename: 'TemperatureLogNode', temperature: number, datetime: string }> } | null } | null, location?: { __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string } | null, temperatureBreach?: { __typename: 'TemperatureBreachNode', id: string, type: Types.TemperatureBreachNodeType } | null }> } };

export const TemperatureBreachRowFragmentDoc = gql`
    fragment TemperatureBreachRow on TemperatureBreachNode {
  __typename
  id
  type
}
    `;
export const TemperatureLogFragmentDoc = gql`
    fragment TemperatureLog on TemperatureLogNode {
  __typename
  id
  datetime
  temperature
  sensor {
    ...Sensor
  }
  location {
    ...LocationRow
  }
  temperatureBreach {
    ...TemperatureBreachRow
  }
}
    ${SensorFragmentDoc}
${LocationRowFragmentDoc}
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    temperature_logs(variables: Temperature_LogsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<Temperature_LogsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<Temperature_LogsQuery>(Temperature_LogsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'temperature_logs', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockTemperatureLogsQuery((req, res, ctx) => {
 *   const { page, sort, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ temperatureLogs })
 *   )
 * })
 */
export const mockTemperatureLogsQuery = (resolver: ResponseResolver<GraphQLRequest<Temperature_LogsQueryVariables>, GraphQLContext<Temperature_LogsQuery>, any>) =>
  graphql.query<Temperature_LogsQuery, Temperature_LogsQueryVariables>(
    'temperature_logs',
    resolver
  )
