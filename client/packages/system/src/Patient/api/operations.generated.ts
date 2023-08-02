import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type PatientRowFragment = { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, isDeceased: boolean, document?: { __typename: 'DocumentNode', data: any, id: string, name: string, type: string } | null, programEnrolments: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> };

export type PatientsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  key: Types.PatientSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  filter?: Types.InputMaybe<Types.PatientFilterInput>;
}>;


export type PatientsQuery = { __typename: 'Queries', patients: { __typename: 'PatientConnector', totalCount: number, nodes: Array<{ __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, isDeceased: boolean, document?: { __typename: 'DocumentNode', data: any, id: string, name: string, type: string } | null, programEnrolments: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> }> } };

export type PatientByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  nameId: Types.Scalars['String']['input'];
}>;


export type PatientByIdQuery = { __typename: 'Queries', patients: { __typename: 'PatientConnector', totalCount: number, nodes: Array<{ __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, isDeceased: boolean, document?: { __typename: 'DocumentNode', data: any, id: string, name: string, type: string } | null, programEnrolments: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> }> } };

export type PatientSearchQueryVariables = Types.Exact<{
  input: Types.PatientSearchInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type PatientSearchQuery = { __typename: 'Queries', patientSearch: { __typename: 'PatientSearchConnector', totalCount: number, nodes: Array<{ __typename: 'PatientSearchNode', score: number, patient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, isDeceased: boolean, document?: { __typename: 'DocumentNode', data: any, id: string, name: string, type: string } | null, programEnrolments: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } }> } };

export type CentralPatientSearchQueryVariables = Types.Exact<{
  input: Types.CentralPatientSearchInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type CentralPatientSearchQuery = { __typename: 'Queries', centralPatientSearch: { __typename: 'CentralPatientSearchConnector', totalCount: number, nodes: Array<{ __typename: 'CentralPatientNode', id: string, code: string, dateOfBirth?: string | null, firstName: string, lastName: string }> } | { __typename: 'CentralPatientSearchError', error: { __typename: 'ConnectionError', description: string } } };

export type LinkPatientToStoreMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  nameId: Types.Scalars['String']['input'];
}>;


export type LinkPatientToStoreMutation = { __typename: 'Mutations', linkPatientToStore: { __typename: 'LinkPatientPatientToStoreError', error: { __typename: 'ConnectionError', description: string } } | { __typename: 'NameStoreJoinNode', id: string, storeId: string, nameId: string } };

export type InsertPatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertPatientInput;
}>;


export type InsertPatientMutation = { __typename: 'Mutations', insertPatient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, isDeceased: boolean, document?: { __typename: 'DocumentNode', data: any, id: string, name: string, type: string } | null, programEnrolments: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } };

export type UpdatePatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdatePatientInput;
}>;


export type UpdatePatientMutation = { __typename: 'Mutations', updatePatient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, isDeceased: boolean, document?: { __typename: 'DocumentNode', data: any, id: string, name: string, type: string } | null, programEnrolments: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } };

export const PatientRowFragmentDoc = gql`
    fragment PatientRow on PatientNode {
  id
  code
  code2
  firstName
  lastName
  name
  dateOfBirth
  gender
  email
  document {
    data
    id
    name
    type
  }
  isDeceased
  programEnrolments {
    programEnrolmentId
    document {
      documentRegistry {
        name
      }
    }
  }
}
    `;
export const PatientsDocument = gql`
    query patients($storeId: String!, $key: PatientSortFieldInput!, $desc: Boolean, $first: Int, $offset: Int, $filter: PatientFilterInput) {
  patients(
    storeId: $storeId
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
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
        ...PatientRow
      }
      totalCount
    }
  }
}
    ${PatientRowFragmentDoc}`;
export const PatientSearchDocument = gql`
    query patientSearch($input: PatientSearchInput!, $storeId: String!) {
  patientSearch(input: $input, storeId: $storeId) {
    ... on PatientSearchConnector {
      __typename
      nodes {
        score
        patient {
          ...PatientRow
        }
      }
      totalCount
    }
  }
}
    ${PatientRowFragmentDoc}`;
export const CentralPatientSearchDocument = gql`
    query centralPatientSearch($input: CentralPatientSearchInput!, $storeId: String!) {
  centralPatientSearch(input: $input, storeId: $storeId) {
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
export const InsertPatientDocument = gql`
    mutation insertPatient($storeId: String!, $input: InsertPatientInput!) {
  insertPatient(storeId: $storeId, input: $input) {
    ... on PatientNode {
      __typename
      ...PatientRow
    }
  }
}
    ${PatientRowFragmentDoc}`;
export const UpdatePatientDocument = gql`
    mutation updatePatient($storeId: String!, $input: UpdatePatientInput!) {
  updatePatient(storeId: $storeId, input: $input) {
    ... on PatientNode {
      __typename
      ...PatientRow
    }
  }
}
    ${PatientRowFragmentDoc}`;

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
    insertPatient(variables: InsertPatientMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertPatientMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertPatientMutation>(InsertPatientDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertPatient', 'mutation');
    },
    updatePatient(variables: UpdatePatientMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdatePatientMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdatePatientMutation>(UpdatePatientDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updatePatient', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockPatientsQuery((req, res, ctx) => {
 *   const { storeId, key, desc, first, offset, filter } = req.variables;
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
 *   const { input, storeId } = req.variables;
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
