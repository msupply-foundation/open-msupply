import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type VaccineCourseFragment = { __typename: 'VaccineCourseNode', id: string, name: string, programId: string, demographicIndicatorId: string };

export type VaccineCoursesQueryVariables = Types.Exact<{
  storeId?: Types.InputMaybe<Types.Scalars['String']['input']>;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.VaccineCourseSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.VaccineCourseFilterInput>;
}>;


export type VaccineCoursesQuery = { __typename: 'Queries', vaccineCourses: { __typename: 'VaccineCourseConnector', totalCount: number, nodes: Array<{ __typename: 'VaccineCourseNode', id: string, name: string, programId: string, demographicIndicatorId: string }> } };

export type InsertVaccineCourseMutationVariables = Types.Exact<{
  input?: Types.InputMaybe<Types.InsertVaccineCourseInput>;
  storeId?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type InsertVaccineCourseMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', vaccineCourse: { __typename: 'VaccineCourseMutations', insertVaccineCourse: { __typename: 'InsertVaccineCourseError', error: { __typename: 'RecordAlreadyExist', description: string } } | { __typename: 'VaccineCourseNode', id: string, name: string, programId: string, demographicIndicatorId: string } } } };

export const VaccineCourseFragmentDoc = gql`
    fragment VaccineCourse on VaccineCourseNode {
  id
  name
  programId
  demographicIndicatorId
}
    `;
export const VaccineCoursesDocument = gql`
    query vaccineCourses($storeId: String, $first: Int, $offset: Int, $key: VaccineCourseSortFieldInput!, $desc: Boolean, $filter: VaccineCourseFilterInput) {
  vaccineCourses(
    storeId: $storeId
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on VaccineCourseConnector {
      __typename
      nodes {
        __typename
        ...VaccineCourse
      }
      totalCount
    }
  }
}
    ${VaccineCourseFragmentDoc}`;
export const InsertVaccineCourseDocument = gql`
    mutation insertVaccineCourse($input: insertVaccineCourseInput, $storeId: String) {
  centralServer {
    vaccineCourse {
      insertVaccineCourse(input: $input, storeId: $storeId) {
        ... on VaccineCourseNode {
          ...VaccineCourse
        }
        ... on InsertVaccineCourseError {
          __typename
          error {
            description
          }
        }
      }
    }
  }
}
    ${VaccineCourseFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    vaccineCourses(variables: VaccineCoursesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<VaccineCoursesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<VaccineCoursesQuery>(VaccineCoursesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'vaccineCourses', 'query');
    },
    insertVaccineCourse(variables?: InsertVaccineCourseMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertVaccineCourseMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertVaccineCourseMutation>(InsertVaccineCourseDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertVaccineCourse', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockVaccineCoursesQuery((req, res, ctx) => {
 *   const { storeId, first, offset, key, desc, filter } = req.variables;
 *   return res(
 *     ctx.data({ vaccineCourses })
 *   )
 * })
 */
export const mockVaccineCoursesQuery = (resolver: ResponseResolver<GraphQLRequest<VaccineCoursesQueryVariables>, GraphQLContext<VaccineCoursesQuery>, any>) =>
  graphql.query<VaccineCoursesQuery, VaccineCoursesQueryVariables>(
    'vaccineCourses',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertVaccineCourseMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ centralServer })
 *   )
 * })
 */
export const mockInsertVaccineCourseMutation = (resolver: ResponseResolver<GraphQLRequest<InsertVaccineCourseMutationVariables>, GraphQLContext<InsertVaccineCourseMutation>, any>) =>
  graphql.mutation<InsertVaccineCourseMutation, InsertVaccineCourseMutationVariables>(
    'insertVaccineCourse',
    resolver
  )
