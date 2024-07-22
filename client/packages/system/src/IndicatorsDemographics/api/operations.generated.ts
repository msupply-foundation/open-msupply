import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type DemographicIndicatorFragment = { __typename: 'DemographicIndicatorNode', id: string, name: string, baseYear: number, basePopulation: number, populationPercentage: number, year1Projection: number, year2Projection: number, year3Projection: number, year4Projection: number, year5Projection: number };

export type DemographicProjectionFragment = { __typename: 'DemographicProjectionNode', id: string, baseYear: number, year1: number, year2: number, year3: number, year4: number, year5: number };

export type DemographicIndicatorsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.DemographicIndicatorSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.DemographicIndicatorFilterInput>;
}>;


export type DemographicIndicatorsQuery = { __typename: 'Queries', demographicIndicators: { __typename: 'DemographicIndicatorConnector', totalCount: number, nodes: Array<{ __typename: 'DemographicIndicatorNode', id: string, name: string, baseYear: number, basePopulation: number, populationPercentage: number, year1Projection: number, year2Projection: number, year3Projection: number, year4Projection: number, year5Projection: number }> } };

export type DemographicProjectionsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.DemographicProjectionSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.DemographicProjectionFilterInput>;
}>;


export type DemographicProjectionsQuery = { __typename: 'Queries', demographicProjections: { __typename: 'DemographicProjectionConnector', totalCount: number, nodes: Array<{ __typename: 'DemographicProjectionNode', id: string, baseYear: number, year1: number, year2: number, year3: number, year4: number, year5: number }> } };

export type DemographicProjectionsByBaseYearQueryVariables = Types.Exact<{
  baseYear: Types.Scalars['Int']['input'];
}>;


export type DemographicProjectionsByBaseYearQuery = { __typename: 'Queries', demographicProjectionByBaseYear: { __typename: 'DemographicProjectionNode', id: string, baseYear: number, year1: number, year2: number, year3: number, year4: number, year5: number } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type DemographicIndicatorByIdQueryVariables = Types.Exact<{
  demographicIndicatorId: Types.Scalars['String']['input'];
}>;


export type DemographicIndicatorByIdQuery = { __typename: 'Queries', demographicIndicators: { __typename: 'DemographicIndicatorConnector', nodes: Array<{ __typename: 'DemographicIndicatorNode', id: string, name: string, baseYear: number, basePopulation: number, populationPercentage: number, year1Projection: number, year2Projection: number, year3Projection: number, year4Projection: number, year5Projection: number }> } };

export type InsertDemographicIndicatorMutationVariables = Types.Exact<{
  input: Types.InsertDemographicIndicatorInput;
}>;


export type InsertDemographicIndicatorMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', demographic: { __typename: 'DemographicMutations', insertDemographicIndicator: { __typename: 'DemographicIndicatorNode', id: string } | { __typename: 'InsertDemographicIndicatorError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'InternalError', description: string } | { __typename: 'NoPermissionForThisStore', description: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', description: string } } } } };

export type InsertDemographicProjectionMutationVariables = Types.Exact<{
  input: Types.InsertDemographicProjectionInput;
}>;


export type InsertDemographicProjectionMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', demographic: { __typename: 'DemographicMutations', insertDemographicProjection: { __typename: 'DemographicProjectionNode', id: string } | { __typename: 'InsertDemographicProjectionError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'InternalError', description: string } | { __typename: 'NoPermissionForThisStore', description: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', description: string } } } } };

export type UpdateDemographicIndicatorMutationVariables = Types.Exact<{
  input: Types.UpdateDemographicIndicatorInput;
}>;


export type UpdateDemographicIndicatorMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', demographic: { __typename: 'DemographicMutations', updateDemographicIndicator: { __typename: 'DemographicIndicatorNode', id: string } | { __typename: 'UpdateDemographicIndicatorError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'InternalError', description: string } | { __typename: 'NoPermissionForThisStore', description: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', description: string } } } } };

export type UpdateDemographicProjectionMutationVariables = Types.Exact<{
  input: Types.UpdateDemographicProjectionInput;
}>;


export type UpdateDemographicProjectionMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', demographic: { __typename: 'DemographicMutations', updateDemographicProjection: { __typename: 'DemographicProjectionNode', id: string } | { __typename: 'UpdateDemographicProjectionError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'InternalError', description: string } | { __typename: 'NoPermissionForThisStore', description: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', description: string } } } } };

export const DemographicIndicatorFragmentDoc = gql`
    fragment DemographicIndicator on DemographicIndicatorNode {
  id
  name
  baseYear
  basePopulation
  populationPercentage
  year1Projection
  year2Projection
  year3Projection
  year4Projection
  year5Projection
}
    `;
export const DemographicProjectionFragmentDoc = gql`
    fragment DemographicProjection on DemographicProjectionNode {
  id
  baseYear
  year1
  year2
  year3
  year4
  year5
}
    `;
export const DemographicIndicatorsDocument = gql`
    query demographicIndicators($first: Int, $offset: Int, $key: DemographicIndicatorSortFieldInput!, $desc: Boolean, $filter: DemographicIndicatorFilterInput) {
  demographicIndicators(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on DemographicIndicatorConnector {
      nodes {
        ...DemographicIndicator
      }
      totalCount
    }
  }
}
    ${DemographicIndicatorFragmentDoc}`;
export const DemographicProjectionsDocument = gql`
    query demographicProjections($first: Int, $offset: Int, $key: DemographicProjectionSortFieldInput!, $desc: Boolean, $filter: DemographicProjectionFilterInput) {
  demographicProjections(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on DemographicProjectionConnector {
      nodes {
        __typename
        ...DemographicProjection
      }
      totalCount
    }
  }
}
    ${DemographicProjectionFragmentDoc}`;
export const DemographicProjectionsByBaseYearDocument = gql`
    query demographicProjectionsByBaseYear($baseYear: Int!) {
  demographicProjectionByBaseYear(baseYear: $baseYear) {
    __typename
    ... on DemographicProjectionNode {
      ...DemographicProjection
    }
    ... on NodeError {
      error {
        description
      }
    }
  }
}
    ${DemographicProjectionFragmentDoc}`;
export const DemographicIndicatorByIdDocument = gql`
    query demographicIndicatorById($demographicIndicatorId: String!) {
  demographicIndicators(filter: {id: {equalTo: $demographicIndicatorId}}) {
    ... on DemographicIndicatorConnector {
      nodes {
        ...DemographicIndicator
      }
    }
  }
}
    ${DemographicIndicatorFragmentDoc}`;
export const InsertDemographicIndicatorDocument = gql`
    mutation insertDemographicIndicator($input: InsertDemographicIndicatorInput!) {
  centralServer {
    demographic {
      insertDemographicIndicator(input: $input) {
        __typename
        ... on DemographicIndicatorNode {
          id
        }
        ... on InsertDemographicIndicatorError {
          error {
            description
          }
        }
      }
    }
  }
}
    `;
export const InsertDemographicProjectionDocument = gql`
    mutation insertDemographicProjection($input: InsertDemographicProjectionInput!) {
  centralServer {
    demographic {
      insertDemographicProjection(input: $input) {
        ... on DemographicProjectionNode {
          __typename
          id
        }
        ... on InsertDemographicProjectionError {
          __typename
          error {
            description
          }
        }
      }
    }
  }
}
    `;
export const UpdateDemographicIndicatorDocument = gql`
    mutation updateDemographicIndicator($input: UpdateDemographicIndicatorInput!) {
  centralServer {
    demographic {
      updateDemographicIndicator(input: $input) {
        ... on DemographicIndicatorNode {
          __typename
          id
        }
        ... on UpdateDemographicIndicatorError {
          __typename
          error {
            description
          }
        }
      }
    }
  }
}
    `;
export const UpdateDemographicProjectionDocument = gql`
    mutation updateDemographicProjection($input: UpdateDemographicProjectionInput!) {
  centralServer {
    demographic {
      updateDemographicProjection(input: $input) {
        ... on DemographicProjectionNode {
          id
        }
        ... on UpdateDemographicProjectionError {
          error {
            description
          }
        }
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    demographicIndicators(variables: DemographicIndicatorsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DemographicIndicatorsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DemographicIndicatorsQuery>(DemographicIndicatorsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'demographicIndicators', 'query', variables);
    },
    demographicProjections(variables: DemographicProjectionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DemographicProjectionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DemographicProjectionsQuery>(DemographicProjectionsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'demographicProjections', 'query', variables);
    },
    demographicProjectionsByBaseYear(variables: DemographicProjectionsByBaseYearQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DemographicProjectionsByBaseYearQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DemographicProjectionsByBaseYearQuery>(DemographicProjectionsByBaseYearDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'demographicProjectionsByBaseYear', 'query', variables);
    },
    demographicIndicatorById(variables: DemographicIndicatorByIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DemographicIndicatorByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DemographicIndicatorByIdQuery>(DemographicIndicatorByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'demographicIndicatorById', 'query', variables);
    },
    insertDemographicIndicator(variables: InsertDemographicIndicatorMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertDemographicIndicatorMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertDemographicIndicatorMutation>(InsertDemographicIndicatorDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertDemographicIndicator', 'mutation', variables);
    },
    insertDemographicProjection(variables: InsertDemographicProjectionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertDemographicProjectionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertDemographicProjectionMutation>(InsertDemographicProjectionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertDemographicProjection', 'mutation', variables);
    },
    updateDemographicIndicator(variables: UpdateDemographicIndicatorMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateDemographicIndicatorMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateDemographicIndicatorMutation>(UpdateDemographicIndicatorDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateDemographicIndicator', 'mutation', variables);
    },
    updateDemographicProjection(variables: UpdateDemographicProjectionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateDemographicProjectionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateDemographicProjectionMutation>(UpdateDemographicProjectionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateDemographicProjection', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;