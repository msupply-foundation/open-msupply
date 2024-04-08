import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type PatientRowFragment = { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', name: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } };

export type ProgramPatientRowFragment = { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } };

export type PatientsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Types.PatientSortInput>;
  filter?: Types.InputMaybe<Types.PatientFilterInput>;
}>;


export type PatientsQuery = { __typename: 'Queries', patients: { __typename: 'PatientConnector', totalCount: number, nodes: Array<{ __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', name: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } }> } };

export type PatientByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  nameId: Types.Scalars['String']['input'];
}>;


export type PatientByIdQuery = { __typename: 'Queries', patients: { __typename: 'PatientConnector', totalCount: number, nodes: Array<{ __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } }> } };

export type PatientSearchQueryVariables = Types.Exact<{
  input: Types.PatientSearchInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type PatientSearchQuery = { __typename: 'Queries', patientSearch: { __typename: 'PatientSearchConnector', totalCount: number, nodes: Array<{ __typename: 'PatientSearchNode', score: number, patient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } } }> } };

export type CentralPatientSearchQueryVariables = Types.Exact<{
  input: Types.CentralPatientSearchInput;
  storeId: Types.Scalars['String']['input'];
  page?: Types.InputMaybe<Types.PaginationInput>;
}>;


export type CentralPatientSearchQuery = { __typename: 'Queries', centralPatientSearch: { __typename: 'CentralPatientSearchConnector', totalCount: number, nodes: Array<{ __typename: 'CentralPatientNode', id: string, code: string, dateOfBirth?: string | null, firstName: string, lastName: string }> } | { __typename: 'CentralPatientSearchError', error: { __typename: 'ConnectionError', description: string } } };

export type LinkPatientToStoreMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  nameId: Types.Scalars['String']['input'];
}>;


export type LinkPatientToStoreMutation = { __typename: 'Mutations', linkPatientToStore: { __typename: 'LinkPatientPatientToStoreError', error: { __typename: 'ConnectionError', description: string } } | { __typename: 'NameStoreJoinNode', id: string, storeId: string, nameId: string } };

export type InsertProgramPatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertProgramPatientInput;
}>;


export type InsertProgramPatientMutation = { __typename: 'Mutations', insertProgramPatient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } } };

export type UpdateProgramPatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateProgramPatientInput;
}>;


export type UpdateProgramPatientMutation = { __typename: 'Mutations', updateProgramPatient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } } };

export type InsertPatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertPatientInput;
}>;


export type InsertPatientMutation = { __typename: 'Mutations', insertPatient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } } };

export type UpdatePatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdatePatientInput;
}>;


export type UpdatePatientMutation = { __typename: 'Mutations', updatePatient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } } };

export type LatestPatientEncounterQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  patientId: Types.Scalars['String']['input'];
  encounterType?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type LatestPatientEncounterQuery = { __typename: 'Queries', encounters: { __typename: 'EncounterConnector', totalCount: number, nodes: Array<{ __typename: 'EncounterNode', id: string, type: string, startDatetime: string, suggestedNextEncounter?: { __typename: 'SuggestedNextEncounterNode', startDatetime: string, label?: string | null } | null }> } };

export const PatientRowFragmentDoc = gql`
    fragment PatientRow on PatientNode {
  id
  code
  code2
  firstName
  lastName
  name
  dateOfBirth
  address1
  phone
  gender
  email
  document {
    name
  }
  isDeceased
  dateOfDeath
  programEnrolments {
    ... on ProgramEnrolmentConnector {
      __typename
      nodes {
        programEnrolmentId
        document {
          documentRegistry {
            name
          }
        }
      }
      totalCount
    }
  }
}
    `;
export const ProgramPatientRowFragmentDoc = gql`
    fragment ProgramPatientRow on PatientNode {
  id
  code
  code2
  firstName
  lastName
  name
  dateOfBirth
  address1
  phone
  gender
  email
  document {
    id
    name
    type
  }
  documentDraft
  isDeceased
  dateOfDeath
  programEnrolments {
    ... on ProgramEnrolmentConnector {
      __typename
      nodes {
        programEnrolmentId
        document {
          documentRegistry {
            name
          }
        }
      }
      totalCount
    }
  }
}
    `;
export const PatientsDocument = gql`
    query patients($storeId: String!, $page: PaginationInput, $sort: PatientSortInput, $filter: PatientFilterInput) {
  patients(storeId: $storeId, page: $page, sort: $sort, filter: $filter) {
    ... on PatientConnector {
      __typename
      nodes {
        ...PatientRow
      }
      totalCount
    }
  }
}
    ${PatientRowFragmentDoc}`;
export const PatientByIdDocument = gql`
    query patientById($storeId: String!, $nameId: String!) {
  patients(storeId: $storeId, filter: {id: {equalTo: $nameId}}) {
    ... on PatientConnector {
      __typename
      nodes {
        ...ProgramPatientRow
      }
      totalCount
    }
  }
}
    ${ProgramPatientRowFragmentDoc}`;
export const PatientSearchDocument = gql`
    query patientSearch($input: PatientSearchInput!, $storeId: String!) {
  patientSearch(input: $input, storeId: $storeId) {
    ... on PatientSearchConnector {
      __typename
      nodes {
        score
        patient {
          ...ProgramPatientRow
        }
      }
      totalCount
    }
  }
}
    ${ProgramPatientRowFragmentDoc}`;
export const CentralPatientSearchDocument = gql`
    query centralPatientSearch($input: CentralPatientSearchInput!, $storeId: String!, $page: PaginationInput) {
  centralPatientSearch(input: $input, storeId: $storeId, page: $page) {
    __typename
    ... on CentralPatientSearchConnector {
      nodes {
        id
        code
        dateOfBirth
        firstName
        lastName
      }
      totalCount
    }
    ... on CentralPatientSearchError {
      error {
        __typename
        ... on ConnectionError {
          description
        }
      }
    }
  }
}
    `;
export const LinkPatientToStoreDocument = gql`
    mutation linkPatientToStore($storeId: String!, $nameId: String!) {
  linkPatientToStore(nameId: $nameId, storeId: $storeId) {
    __typename
    ... on NameStoreJoinNode {
      id
      storeId
      nameId
    }
    ... on LinkPatientPatientToStoreError {
      error {
        __typename
        ... on ConnectionError {
          description
        }
      }
    }
  }
}
    `;
export const InsertProgramPatientDocument = gql`
    mutation insertProgramPatient($storeId: String!, $input: InsertProgramPatientInput!) {
  insertProgramPatient(storeId: $storeId, input: $input) {
    ... on PatientNode {
      __typename
      ...ProgramPatientRow
    }
  }
}
    ${ProgramPatientRowFragmentDoc}`;
export const UpdateProgramPatientDocument = gql`
    mutation updateProgramPatient($storeId: String!, $input: UpdateProgramPatientInput!) {
  updateProgramPatient(storeId: $storeId, input: $input) {
    ... on PatientNode {
      __typename
      ...ProgramPatientRow
    }
  }
}
    ${ProgramPatientRowFragmentDoc}`;
export const InsertPatientDocument = gql`
    mutation insertPatient($storeId: String!, $input: InsertPatientInput!) {
  insertPatient(storeId: $storeId, input: $input) {
    ... on PatientNode {
      __typename
      ...ProgramPatientRow
    }
  }
}
    ${ProgramPatientRowFragmentDoc}`;
export const UpdatePatientDocument = gql`
    mutation updatePatient($storeId: String!, $input: UpdatePatientInput!) {
  updatePatient(storeId: $storeId, input: $input) {
    ... on PatientNode {
      __typename
      ...ProgramPatientRow
    }
  }
}
    ${ProgramPatientRowFragmentDoc}`;
export const LatestPatientEncounterDocument = gql`
    query latestPatientEncounter($storeId: String!, $patientId: String!, $encounterType: String) {
  encounters(
    storeId: $storeId
    filter: {patientId: {equalTo: $patientId}, type: {equalTo: $encounterType}}
    sort: {key: startDatetime, desc: true}
    page: {first: 1}
  ) {
    ... on EncounterConnector {
      __typename
      nodes {
        id
        type
        startDatetime
        suggestedNextEncounter {
          startDatetime
          label
        }
      }
      totalCount
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    patients(variables: PatientsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PatientsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PatientsQuery>(PatientsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'patients', 'query');
    },
    patientById(variables: PatientByIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PatientByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PatientByIdQuery>(PatientByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'patientById', 'query');
    },
    patientSearch(variables: PatientSearchQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PatientSearchQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PatientSearchQuery>(PatientSearchDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'patientSearch', 'query');
    },
    centralPatientSearch(variables: CentralPatientSearchQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CentralPatientSearchQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<CentralPatientSearchQuery>(CentralPatientSearchDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'centralPatientSearch', 'query');
    },
    linkPatientToStore(variables: LinkPatientToStoreMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LinkPatientToStoreMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<LinkPatientToStoreMutation>(LinkPatientToStoreDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'linkPatientToStore', 'mutation');
    },
    insertProgramPatient(variables: InsertProgramPatientMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertProgramPatientMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertProgramPatientMutation>(InsertProgramPatientDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertProgramPatient', 'mutation');
    },
    updateProgramPatient(variables: UpdateProgramPatientMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateProgramPatientMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateProgramPatientMutation>(UpdateProgramPatientDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateProgramPatient', 'mutation');
    },
    insertPatient(variables: InsertPatientMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertPatientMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertPatientMutation>(InsertPatientDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertPatient', 'mutation');
    },
    updatePatient(variables: UpdatePatientMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdatePatientMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdatePatientMutation>(UpdatePatientDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updatePatient', 'mutation');
    },
    latestPatientEncounter(variables: LatestPatientEncounterQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LatestPatientEncounterQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LatestPatientEncounterQuery>(LatestPatientEncounterDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'latestPatientEncounter', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockPatientsQuery((req, res, ctx) => {
 *   const { storeId, page, sort, filter } = req.variables;
 *   return res(
 *     ctx.data({ patients })
 *   )
 * })
 */
export const mockPatientsQuery = (resolver: ResponseResolver<GraphQLRequest<PatientsQueryVariables>, GraphQLContext<PatientsQuery>, any>) =>
  graphql.query<PatientsQuery, PatientsQueryVariables>(
    'patients',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockPatientByIdQuery((req, res, ctx) => {
 *   const { storeId, nameId } = req.variables;
 *   return res(
 *     ctx.data({ patients })
 *   )
 * })
 */
export const mockPatientByIdQuery = (resolver: ResponseResolver<GraphQLRequest<PatientByIdQueryVariables>, GraphQLContext<PatientByIdQuery>, any>) =>
  graphql.query<PatientByIdQuery, PatientByIdQueryVariables>(
    'patientById',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockPatientSearchQuery((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ patientSearch })
 *   )
 * })
 */
export const mockPatientSearchQuery = (resolver: ResponseResolver<GraphQLRequest<PatientSearchQueryVariables>, GraphQLContext<PatientSearchQuery>, any>) =>
  graphql.query<PatientSearchQuery, PatientSearchQueryVariables>(
    'patientSearch',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockCentralPatientSearchQuery((req, res, ctx) => {
 *   const { input, storeId, page } = req.variables;
 *   return res(
 *     ctx.data({ centralPatientSearch })
 *   )
 * })
 */
export const mockCentralPatientSearchQuery = (resolver: ResponseResolver<GraphQLRequest<CentralPatientSearchQueryVariables>, GraphQLContext<CentralPatientSearchQuery>, any>) =>
  graphql.query<CentralPatientSearchQuery, CentralPatientSearchQueryVariables>(
    'centralPatientSearch',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockLinkPatientToStoreMutation((req, res, ctx) => {
 *   const { storeId, nameId } = req.variables;
 *   return res(
 *     ctx.data({ linkPatientToStore })
 *   )
 * })
 */
export const mockLinkPatientToStoreMutation = (resolver: ResponseResolver<GraphQLRequest<LinkPatientToStoreMutationVariables>, GraphQLContext<LinkPatientToStoreMutation>, any>) =>
  graphql.mutation<LinkPatientToStoreMutation, LinkPatientToStoreMutationVariables>(
    'linkPatientToStore',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertProgramPatientMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertProgramPatient })
 *   )
 * })
 */
export const mockInsertProgramPatientMutation = (resolver: ResponseResolver<GraphQLRequest<InsertProgramPatientMutationVariables>, GraphQLContext<InsertProgramPatientMutation>, any>) =>
  graphql.mutation<InsertProgramPatientMutation, InsertProgramPatientMutationVariables>(
    'insertProgramPatient',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateProgramPatientMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updateProgramPatient })
 *   )
 * })
 */
export const mockUpdateProgramPatientMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateProgramPatientMutationVariables>, GraphQLContext<UpdateProgramPatientMutation>, any>) =>
  graphql.mutation<UpdateProgramPatientMutation, UpdateProgramPatientMutationVariables>(
    'updateProgramPatient',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertPatientMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertPatient })
 *   )
 * })
 */
export const mockInsertPatientMutation = (resolver: ResponseResolver<GraphQLRequest<InsertPatientMutationVariables>, GraphQLContext<InsertPatientMutation>, any>) =>
  graphql.mutation<InsertPatientMutation, InsertPatientMutationVariables>(
    'insertPatient',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdatePatientMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updatePatient })
 *   )
 * })
 */
export const mockUpdatePatientMutation = (resolver: ResponseResolver<GraphQLRequest<UpdatePatientMutationVariables>, GraphQLContext<UpdatePatientMutation>, any>) =>
  graphql.mutation<UpdatePatientMutation, UpdatePatientMutationVariables>(
    'updatePatient',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockLatestPatientEncounterQuery((req, res, ctx) => {
 *   const { storeId, patientId, encounterType } = req.variables;
 *   return res(
 *     ctx.data({ encounters })
 *   )
 * })
 */
export const mockLatestPatientEncounterQuery = (resolver: ResponseResolver<GraphQLRequest<LatestPatientEncounterQueryVariables>, GraphQLContext<LatestPatientEncounterQuery>, any>) =>
  graphql.query<LatestPatientEncounterQuery, LatestPatientEncounterQueryVariables>(
    'latestPatientEncounter',
    resolver
  )
