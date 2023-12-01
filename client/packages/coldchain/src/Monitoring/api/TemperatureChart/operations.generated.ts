import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type TemperatureChartFragment = { __typename: 'TemperatureChartNode', sensors: Array<{ __typename: 'SensorAxisNode', points: Array<{ __typename: 'TemperaturePointNode', temperature?: number | null, midPoint: string, breachIds?: Array<string> | null }>, sensor?: { __typename: 'SensorNode', id: string, name: string } | null }> };

export type TemperatureChartQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.TemperatureLogFilterInput>;
  fromDatetime?: Types.InputMaybe<Types.Scalars['DateTime']['input']>;
  numberOfDataPoints?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  storeId?: Types.InputMaybe<Types.Scalars['String']['input']>;
  toDatetime?: Types.InputMaybe<Types.Scalars['DateTime']['input']>;
}>;


export type TemperatureChartQuery = { __typename: 'Queries', temperatureChart: { __typename: 'TemperatureChartNode', sensors: Array<{ __typename: 'SensorAxisNode', points: Array<{ __typename: 'TemperaturePointNode', temperature?: number | null, midPoint: string, breachIds?: Array<string> | null }>, sensor?: { __typename: 'SensorNode', id: string, name: string } | null }> } };

export const TemperatureChartFragmentDoc = gql`
    fragment TemperatureChart on TemperatureChartNode {
  __typename
  sensors {
    points {
      temperature
      midPoint
      breachIds
    }
    sensor {
      id
      name
    }
  }
}
    `;
export const TemperatureChartDocument = gql`
    query temperatureChart($filter: TemperatureLogFilterInput, $fromDatetime: DateTime, $numberOfDataPoints: Int, $storeId: String, $toDatetime: DateTime) {
  temperatureChart(
    filter: $filter
    fromDatetime: $fromDatetime
    numberOfDataPoints: $numberOfDataPoints
    storeId: $storeId
    toDatetime: $toDatetime
  ) {
    ... on TemperatureChartNode {
      ...TemperatureChart
    }
  }
}
    ${TemperatureChartFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    temperatureChart(variables?: TemperatureChartQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<TemperatureChartQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<TemperatureChartQuery>(TemperatureChartDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'temperatureChart', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockTemperatureChartQuery((req, res, ctx) => {
 *   const { filter, fromDatetime, numberOfDataPoints, storeId, toDatetime } = req.variables;
 *   return res(
 *     ctx.data({ temperatureChart })
 *   )
 * })
 */
export const mockTemperatureChartQuery = (resolver: ResponseResolver<GraphQLRequest<TemperatureChartQueryVariables>, GraphQLContext<TemperatureChartQuery>, any>) =>
  graphql.query<TemperatureChartQuery, TemperatureChartQueryVariables>(
    'temperatureChart',
    resolver
  )
