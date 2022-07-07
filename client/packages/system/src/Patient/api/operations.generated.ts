import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type PatientRowFragment = { __typename: 'PatientNode', id: string, code: string, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null };

export type PatientFragment = { __typename: 'PatientNode', address1?: string | null, address2?: string | null, code: string, country?: string | null, dateOfBirth?: string | null, email?: string | null, firstName?: string | null, lastName?: string | null, gender?: Types.GenderType | null, id: string, name: string, phone?: string | null, website?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null };

export type PatientsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key: Types.PatientSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  filter?: Types.InputMaybe<Types.PatientFilterInput>;
}>;


export type PatientsQuery = { __typename: 'FullQuery', patients: { __typename: 'PatientConnector', totalCount: number, nodes: Array<{ __typename: 'PatientNode', id: string, code: string, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null }> } };

export type PatientByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  nameId: Types.Scalars['String'];
}>;


export type PatientByIdQuery = { __typename: 'FullQuery', patients: { __typename: 'PatientConnector', totalCount: number, nodes: Array<{ __typename: 'PatientNode', address1?: string | null, address2?: string | null, code: string, country?: string | null, dateOfBirth?: string | null, email?: string | null, firstName?: string | null, lastName?: string | null, gender?: Types.GenderType | null, id: string, name: string, phone?: string | null, website?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null }> } };

export type PatientSearchQueryVariables = Types.Exact<{
  input: Types.PatientSearchInput;
  storeId: Types.Scalars['String'];
}>;


export type PatientSearchQuery = { __typename: 'FullQuery', patientSearch: { __typename: 'PatientSearchConnector', totalCount: number, nodes: Array<{ __typename: 'PatientSearchNode', score: number, patient: { __typename: 'PatientNode', address1?: string | null, address2?: string | null, code: string, country?: string | null, dateOfBirth?: string | null, email?: string | null, firstName?: string | null, lastName?: string | null, gender?: Types.GenderType | null, id: string, name: string, phone?: string | null, website?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null } }> } };

export type InsertPatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.InsertPatientInput;
}>;


export type InsertPatientMutation = { __typename: 'FullMutation', insertPatient: { __typename: 'PatientNode', id: string, code: string, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null } };

export type UpdatePatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdatePatientInput;
}>;


export type UpdatePatientMutation = { __typename: 'FullMutation', updatePatient: { __typename: 'PatientNode', id: string, code: string, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null } };

export const PatientRowFragmentDoc = gql`
    fragment PatientRow on PatientNode {
  id
  code
  firstName
  lastName
  name
  dateOfBirth
  gender
  email
  document {
    id
    name
    type
  }
}
    `;
export const PatientFragmentDoc = gql`
    fragment Patient on PatientNode {
  address1
  address2
  code
  country
  dateOfBirth
  document {
    id
    name
    type
  }
  email
  firstName
  lastName
  gender
  id
  name
  phone
  website
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
        ...Patient
      }
      totalCount
    }
  }
}
    ${PatientFragmentDoc}`;
export const PatientSearchDocument = gql`
    query patientSearch($input: PatientSearchInput!, $storeId: String!) {
  patientSearch(input: $input, storeId: $storeId) {
    ... on PatientSearchConnector {
      __typename
      nodes {
        score
        patient {
          ...Patient
        }
      }
      totalCount
    }
  }
}
    ${PatientFragmentDoc}`;
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
    patients(variables: PatientsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<PatientsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PatientsQuery>(PatientsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'patients', 'query');
    },
    patientById(variables: PatientByIdQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<PatientByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PatientByIdQuery>(PatientByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'patientById', 'query');
    },
    patientSearch(variables: PatientSearchQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<PatientSearchQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PatientSearchQuery>(PatientSearchDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'patientSearch', 'query');
    },
    insertPatient(variables: InsertPatientMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertPatientMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertPatientMutation>(InsertPatientDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertPatient', 'mutation');
    },
    updatePatient(variables: UpdatePatientMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdatePatientMutation> {
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
