import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type TemperatureBreachFragment = { __typename: 'TemperatureBreachNode', id: string, unacknowledged: boolean, durationMilliseconds: number, endDatetime?: string | null, startDatetime: string, type: Types.TemperatureBreachNodeType, maxOrMinTemperature?: number | null, comment?: string | null, sensor?: { __typename: 'SensorNode', id: string, name: string } | null, location?: { __typename: 'LocationNode', code: string, name: string } | null };

export type Temperature_BreachesQueryVariables = Types.Exact<{
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.TemperatureBreachSortInput> | Types.TemperatureBreachSortInput>;
  filter?: Types.InputMaybe<Types.TemperatureBreachFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type Temperature_BreachesQuery = { __typename: 'Queries', temperatureBreaches: { __typename: 'TemperatureBreachConnector', totalCount: number, nodes: Array<{ __typename: 'TemperatureBreachNode', id: string, unacknowledged: boolean, durationMilliseconds: number, endDatetime?: string | null, startDatetime: string, type: Types.TemperatureBreachNodeType, maxOrMinTemperature?: number | null, comment?: string | null, sensor?: { __typename: 'SensorNode', id: string, name: string } | null, location?: { __typename: 'LocationNode', code: string, name: string } | null }> } };

export type UpdateTemperatureBreachMutationVariables = Types.Exact<{
  input: Types.UpdateTemperatureBreachInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type UpdateTemperatureBreachMutation = { __typename: 'Mutations', updateTemperatureBreach: { __typename: 'TemperatureBreachNode', id: string, comment?: string | null, unacknowledged: boolean } };

export const TemperatureBreachFragmentDoc = gql`
    fragment TemperatureBreach on TemperatureBreachNode {
  __typename
  id
  unacknowledged
  durationMilliseconds
  endDatetime
  startDatetime
  type
  maxOrMinTemperature
  comment
  sensor {
    id
    name
  }
  location {
    code
    name
  }
}
    `;
export const Temperature_BreachesDocument = gql`
    query temperature_breaches($page: PaginationInput, $sort: [TemperatureBreachSortInput!], $filter: TemperatureBreachFilterInput, $storeId: String!) {
  temperatureBreaches(
    page: $page
    sort: $sort
    filter: $filter
    storeId: $storeId
  ) {
    ... on TemperatureBreachConnector {
      totalCount
      nodes {
        ...TemperatureBreach
      }
    }
  }
}
    ${TemperatureBreachFragmentDoc}`;
export const UpdateTemperatureBreachDocument = gql`
    mutation updateTemperatureBreach($input: UpdateTemperatureBreachInput!, $storeId: String!) {
  updateTemperatureBreach(input: $input, storeId: $storeId) {
    ... on TemperatureBreachNode {
      id
      comment
      unacknowledged
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    temperature_breaches(variables: Temperature_BreachesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<Temperature_BreachesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<Temperature_BreachesQuery>(Temperature_BreachesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'temperature_breaches', 'query', variables);
    },
    updateTemperatureBreach(variables: UpdateTemperatureBreachMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateTemperatureBreachMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateTemperatureBreachMutation>(UpdateTemperatureBreachDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateTemperatureBreach', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;