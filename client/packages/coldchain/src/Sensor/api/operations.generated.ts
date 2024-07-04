import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
export type LocationRowFragment = { __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string };

export type SensorFragment = { __typename: 'SensorNode', id: string, isActive: boolean, name: string, serial: string, batteryLevel?: number | null, breach?: Types.TemperatureBreachNodeType | null, type: Types.SensorNodeType, location?: { __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string } | null, latestTemperatureLog?: { __typename: 'TemperatureLogConnector', totalCount: number, nodes: Array<{ __typename: 'TemperatureLogNode', temperature: number, datetime: string }> } | null, assets: { __typename: 'AssetConnector', totalCount: number, nodes: Array<{ __typename: 'AssetNode', id: string, assetNumber?: string | null }> } };

export type SensorsQueryVariables = Types.Exact<{
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.SensorSortInput> | Types.SensorSortInput>;
  filter?: Types.InputMaybe<Types.SensorFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type SensorsQuery = { __typename: 'Queries', sensors: { __typename: 'SensorConnector', totalCount: number, nodes: Array<{ __typename: 'SensorNode', id: string, isActive: boolean, name: string, serial: string, batteryLevel?: number | null, breach?: Types.TemperatureBreachNodeType | null, type: Types.SensorNodeType, location?: { __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string } | null, latestTemperatureLog?: { __typename: 'TemperatureLogConnector', totalCount: number, nodes: Array<{ __typename: 'TemperatureLogNode', temperature: number, datetime: string }> } | null, assets: { __typename: 'AssetConnector', totalCount: number, nodes: Array<{ __typename: 'AssetNode', id: string, assetNumber?: string | null }> } }> } };

export type UpdateSensorMutationVariables = Types.Exact<{
  input: Types.UpdateSensorInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type UpdateSensorMutation = { __typename: 'Mutations', updateSensor: { __typename: 'SensorNode', id: string, isActive: boolean, name: string, serial: string, batteryLevel?: number | null, breach?: Types.TemperatureBreachNodeType | null, type: Types.SensorNodeType, location?: { __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string } | null, latestTemperatureLog?: { __typename: 'TemperatureLogConnector', totalCount: number, nodes: Array<{ __typename: 'TemperatureLogNode', temperature: number, datetime: string }> } | null, assets: { __typename: 'AssetConnector', totalCount: number, nodes: Array<{ __typename: 'AssetNode', id: string, assetNumber?: string | null }> } } | { __typename: 'UpdateSensorError' } };

export const LocationRowFragmentDoc = gql`
    fragment LocationRow on LocationNode {
  __typename
  id
  name
  onHold
  code
}
    `;
export const SensorFragmentDoc = gql`
    fragment Sensor on SensorNode {
  __typename
  id
  isActive
  name
  serial
  batteryLevel
  breach
  type
  location {
    ...LocationRow
  }
  latestTemperatureLog {
    totalCount
    nodes {
      temperature
      datetime
    }
  }
  assets {
    totalCount
    nodes {
      id
      assetNumber
    }
  }
}
    ${LocationRowFragmentDoc}`;
export const SensorsDocument = gql`
    query sensors($page: PaginationInput, $sort: [SensorSortInput!], $filter: SensorFilterInput, $storeId: String!) {
  sensors(page: $page, sort: $sort, filter: $filter, storeId: $storeId) {
    ... on SensorConnector {
      totalCount
      nodes {
        ...Sensor
      }
    }
  }
}
    ${SensorFragmentDoc}`;
export const UpdateSensorDocument = gql`
    mutation updateSensor($input: UpdateSensorInput!, $storeId: String!) {
  updateSensor(input: $input, storeId: $storeId) {
    ...Sensor
  }
}
    ${SensorFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    sensors(variables: SensorsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SensorsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SensorsQuery>(SensorsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'sensors', 'query');
    },
    updateSensor(variables: UpdateSensorMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateSensorMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateSensorMutation>(UpdateSensorDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateSensor', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;