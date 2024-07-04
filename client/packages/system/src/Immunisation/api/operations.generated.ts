import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
export type ImmunisationProgramFragment = { __typename: 'ProgramNode', id: string, name: string, vaccineCourses?: Array<{ __typename: 'VaccineCourseNode', name: string }> | null };

export type VaccineCourseScheduleFragment = { __typename: 'VaccineCourseScheduleNode', id: string, doseNumber: number, label: string };

export type VaccineCourseItemFragment = { __typename: 'VaccineCourseItemNode', id: string, itemId: string, name: string };

export type ProgramsQueryVariables = Types.Exact<{
  storeId?: Types.InputMaybe<Types.Scalars['String']['input']>;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.ProgramSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ProgramFilterInput>;
}>;


export type ProgramsQuery = { __typename: 'Queries', programs: { __typename: 'ProgramConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramNode', id: string, name: string, vaccineCourses?: Array<{ __typename: 'VaccineCourseNode', name: string }> | null }> } };

export type InsertImmunisationProgramMutationVariables = Types.Exact<{
  input?: Types.InputMaybe<Types.InsertImmunisationProgramInput>;
  storeId?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type InsertImmunisationProgramMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', program: { __typename: 'CentralProgramsMutations', insertImmunisationProgram: { __typename: 'InsertImmunisationProgramError', error: { __typename: 'RecordAlreadyExist', description: string } } | { __typename: 'ProgramNode', id: string, name: string, vaccineCourses?: Array<{ __typename: 'VaccineCourseNode', name: string }> | null } } } };

export type UpdateImmunisationProgramMutationVariables = Types.Exact<{
  input?: Types.InputMaybe<Types.UpdateImmunisationProgramInput>;
  storeId?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type UpdateImmunisationProgramMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', program: { __typename: 'CentralProgramsMutations', updateImmunisationProgram: { __typename: 'ProgramNode', id: string, name: string, vaccineCourses?: Array<{ __typename: 'VaccineCourseNode', name: string }> | null } | { __typename: 'UpdateImmunisationProgramError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', field: Types.UniqueValueKey, description: string } } } } };

export type VaccineCourseFragment = { __typename: 'VaccineCourseNode', id: string, name: string, programId: string, demographicIndicatorId?: string | null, doses: number, coverageRate: number, wastageRate: number, isActive: boolean, demographicIndicator?: { __typename: 'DemographicIndicatorNode', name: string, id: string, baseYear: number } | null, vaccineCourseItems?: Array<{ __typename: 'VaccineCourseItemNode', id: string, itemId: string, name: string }> | null, vaccineCourseSchedules?: Array<{ __typename: 'VaccineCourseScheduleNode', id: string, doseNumber: number, label: string }> | null };

export type VaccineCoursesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.VaccineCourseSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.VaccineCourseFilterInput>;
}>;


export type VaccineCoursesQuery = { __typename: 'Queries', vaccineCourses: { __typename: 'VaccineCourseConnector', totalCount: number, nodes: Array<{ __typename: 'VaccineCourseNode', id: string, name: string, programId: string, demographicIndicatorId?: string | null, doses: number, coverageRate: number, wastageRate: number, isActive: boolean, demographicIndicator?: { __typename: 'DemographicIndicatorNode', name: string, id: string, baseYear: number } | null, vaccineCourseItems?: Array<{ __typename: 'VaccineCourseItemNode', id: string, itemId: string, name: string }> | null, vaccineCourseSchedules?: Array<{ __typename: 'VaccineCourseScheduleNode', id: string, doseNumber: number, label: string }> | null }> } };

export type InsertVaccineCourseMutationVariables = Types.Exact<{
  input?: Types.InputMaybe<Types.InsertVaccineCourseInput>;
  storeId?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type InsertVaccineCourseMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', vaccineCourse: { __typename: 'VaccineCourseMutations', insertVaccineCourse: { __typename: 'InsertVaccineCourseError', error: { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'RecordProgramCombinationAlreadyExists', description: string } } | { __typename: 'VaccineCourseNode', id: string, name: string, programId: string, demographicIndicatorId?: string | null, doses: number, coverageRate: number, wastageRate: number, isActive: boolean, demographicIndicator?: { __typename: 'DemographicIndicatorNode', name: string, id: string, baseYear: number } | null, vaccineCourseItems?: Array<{ __typename: 'VaccineCourseItemNode', id: string, itemId: string, name: string }> | null, vaccineCourseSchedules?: Array<{ __typename: 'VaccineCourseScheduleNode', id: string, doseNumber: number, label: string }> | null } } } };

export type UpdateVaccineCourseMutationVariables = Types.Exact<{
  input?: Types.InputMaybe<Types.UpdateVaccineCourseInput>;
  storeId?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type UpdateVaccineCourseMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', vaccineCourse: { __typename: 'VaccineCourseMutations', updateVaccineCourse: { __typename: 'UpdateVaccineCourseError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordProgramCombinationAlreadyExists', description: string } } | { __typename: 'VaccineCourseNode', id: string, name: string, programId: string, demographicIndicatorId?: string | null, doses: number, coverageRate: number, wastageRate: number, isActive: boolean, demographicIndicator?: { __typename: 'DemographicIndicatorNode', name: string, id: string, baseYear: number } | null, vaccineCourseItems?: Array<{ __typename: 'VaccineCourseItemNode', id: string, itemId: string, name: string }> | null, vaccineCourseSchedules?: Array<{ __typename: 'VaccineCourseScheduleNode', id: string, doseNumber: number, label: string }> | null } } } };

export type DeleteImmunisationProgramMutationVariables = Types.Exact<{
  immunisationProgramId: Types.Scalars['String']['input'];
}>;


export type DeleteImmunisationProgramMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', program: { __typename: 'CentralProgramsMutations', deleteImmunisationProgram: { __typename: 'DeleteImmunisationProgramError' } | { __typename: 'DeleteResponse', id: string } } } };

export type DeleteVaccineCourseMutationVariables = Types.Exact<{
  vaccineCourseId: Types.Scalars['String']['input'];
}>;


export type DeleteVaccineCourseMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', vaccineCourse: { __typename: 'VaccineCourseMutations', deleteVaccineCourse: { __typename: 'DeleteResponse', id: string } | { __typename: 'DeleteVaccineCourseError' } } } };

export const ImmunisationProgramFragmentDoc = gql`
    fragment ImmunisationProgram on ProgramNode {
  id
  name
  vaccineCourses {
    name
  }
}
    `;
export const VaccineCourseItemFragmentDoc = gql`
    fragment VaccineCourseItem on VaccineCourseItemNode {
  id
  itemId
  name
}
    `;
export const VaccineCourseScheduleFragmentDoc = gql`
    fragment VaccineCourseSchedule on VaccineCourseScheduleNode {
  id
  doseNumber
  label
}
    `;
export const VaccineCourseFragmentDoc = gql`
    fragment VaccineCourse on VaccineCourseNode {
  id
  name
  programId
  demographicIndicatorId
  doses
  coverageRate
  wastageRate
  isActive
  demographicIndicator {
    name
    id
    baseYear
  }
  vaccineCourseItems {
    ...VaccineCourseItem
  }
  vaccineCourseSchedules {
    ...VaccineCourseSchedule
  }
}
    ${VaccineCourseItemFragmentDoc}
${VaccineCourseScheduleFragmentDoc}`;
export const ProgramsDocument = gql`
    query programs($storeId: String, $first: Int, $offset: Int, $key: ProgramSortFieldInput!, $desc: Boolean, $filter: ProgramFilterInput) {
  programs(
    storeId: $storeId
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on ProgramConnector {
      __typename
      nodes {
        __typename
        ...ImmunisationProgram
      }
      totalCount
    }
  }
}
    ${ImmunisationProgramFragmentDoc}`;
export const InsertImmunisationProgramDocument = gql`
    mutation insertImmunisationProgram($input: InsertImmunisationProgramInput, $storeId: String) {
  centralServer {
    program {
      insertImmunisationProgram(input: $input, storeId: $storeId) {
        __typename
        ... on ProgramNode {
          ...ImmunisationProgram
        }
        ... on InsertImmunisationProgramError {
          __typename
          error {
            __typename
            description
          }
        }
      }
    }
  }
}
    ${ImmunisationProgramFragmentDoc}`;
export const UpdateImmunisationProgramDocument = gql`
    mutation updateImmunisationProgram($input: UpdateImmunisationProgramInput, $storeId: String) {
  centralServer {
    program {
      updateImmunisationProgram(input: $input, storeId: $storeId) {
        __typename
        ... on ProgramNode {
          ...ImmunisationProgram
        }
        ... on UpdateImmunisationProgramError {
          __typename
          error {
            ... on UniqueValueViolation {
              __typename
              field
            }
            description
          }
        }
      }
    }
  }
}
    ${ImmunisationProgramFragmentDoc}`;
export const VaccineCoursesDocument = gql`
    query vaccineCourses($first: Int, $offset: Int, $key: VaccineCourseSortFieldInput!, $desc: Boolean, $filter: VaccineCourseFilterInput) {
  vaccineCourses(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on VaccineCourseConnector {
      __typename
      nodes {
        ...VaccineCourse
      }
      totalCount
    }
  }
}
    ${VaccineCourseFragmentDoc}`;
export const InsertVaccineCourseDocument = gql`
    mutation insertVaccineCourse($input: InsertVaccineCourseInput, $storeId: String) {
  centralServer {
    vaccineCourse {
      insertVaccineCourse(input: $input, storeId: $storeId) {
        __typename
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
export const UpdateVaccineCourseDocument = gql`
    mutation updateVaccineCourse($input: UpdateVaccineCourseInput, $storeId: String) {
  centralServer {
    vaccineCourse {
      updateVaccineCourse(input: $input, storeId: $storeId) {
        __typename
        ... on VaccineCourseNode {
          __typename
          ...VaccineCourse
        }
        ... on UpdateVaccineCourseError {
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
export const DeleteImmunisationProgramDocument = gql`
    mutation deleteImmunisationProgram($immunisationProgramId: String!) {
  centralServer {
    program {
      deleteImmunisationProgram(immunisationProgramId: $immunisationProgramId) {
        ... on DeleteResponse {
          __typename
          id
        }
      }
    }
  }
}
    `;
export const DeleteVaccineCourseDocument = gql`
    mutation deleteVaccineCourse($vaccineCourseId: String!) {
  centralServer {
    vaccineCourse {
      deleteVaccineCourse(vaccineCourseId: $vaccineCourseId) {
        ... on DeleteResponse {
          __typename
          id
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
    programs(variables: ProgramsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ProgramsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramsQuery>(ProgramsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programs', 'query');
    },
    insertImmunisationProgram(variables?: InsertImmunisationProgramMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertImmunisationProgramMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertImmunisationProgramMutation>(InsertImmunisationProgramDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertImmunisationProgram', 'mutation');
    },
    updateImmunisationProgram(variables?: UpdateImmunisationProgramMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateImmunisationProgramMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateImmunisationProgramMutation>(UpdateImmunisationProgramDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateImmunisationProgram', 'mutation');
    },
    vaccineCourses(variables: VaccineCoursesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<VaccineCoursesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<VaccineCoursesQuery>(VaccineCoursesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'vaccineCourses', 'query');
    },
    insertVaccineCourse(variables?: InsertVaccineCourseMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertVaccineCourseMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertVaccineCourseMutation>(InsertVaccineCourseDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertVaccineCourse', 'mutation');
    },
    updateVaccineCourse(variables?: UpdateVaccineCourseMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateVaccineCourseMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateVaccineCourseMutation>(UpdateVaccineCourseDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateVaccineCourse', 'mutation');
    },
    deleteImmunisationProgram(variables: DeleteImmunisationProgramMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteImmunisationProgramMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteImmunisationProgramMutation>(DeleteImmunisationProgramDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteImmunisationProgram', 'mutation');
    },
    deleteVaccineCourse(variables: DeleteVaccineCourseMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteVaccineCourseMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteVaccineCourseMutation>(DeleteVaccineCourseDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteVaccineCourse', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;