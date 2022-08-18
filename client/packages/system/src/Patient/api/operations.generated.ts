import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type PatientRowFragment = { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, isDeceased: boolean, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null };

export type PatientDocumentFragment = { __typename: 'DocumentRegistryNode', id: string, documentType: string, formSchemaId: string, jsonSchema: any, name?: string | null, context: Types.DocumentRegistryNodeContext, parentId?: string | null, uiSchema: any, uiSchemaType: string };

export type PatientDocumentRegistryFragment = { __typename: 'DocumentRegistryNode', id: string, documentType: string, formSchemaId: string, jsonSchema: any, name?: string | null, context: Types.DocumentRegistryNodeContext, parentId?: string | null, uiSchema: any, uiSchemaType: string, children: Array<{ __typename: 'DocumentRegistryNode', id: string, documentType: string, formSchemaId: string, jsonSchema: any, name?: string | null, context: Types.DocumentRegistryNodeContext, parentId?: string | null, uiSchema: any, uiSchemaType: string }> };

export type ProgramRowFragment = { __typename: 'ProgramNode', enrolmentDatetime: string, name: string, patientId: string, programPatientId?: string | null, type: string, document: { __typename: 'DocumentNode', data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, formSchemaId: string, jsonSchema: any, name?: string | null, context: Types.DocumentRegistryNodeContext, parentId?: string | null, uiSchema: any, uiSchemaType: string, children: Array<{ __typename: 'DocumentRegistryNode', id: string, documentType: string, formSchemaId: string, jsonSchema: any, name?: string | null, context: Types.DocumentRegistryNodeContext, parentId?: string | null, uiSchema: any, uiSchemaType: string }> } | null } };

export type PatientFragment = { __typename: 'PatientNode', address1?: string | null, address2?: string | null, code: string, code2?: string | null, country?: string | null, dateOfBirth?: string | null, email?: string | null, firstName?: string | null, lastName?: string | null, gender?: Types.GenderType | null, id: string, name: string, phone?: string | null, website?: string | null, isDeceased: boolean, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null };

export type PatientsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key: Types.PatientSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  filter?: Types.InputMaybe<Types.PatientFilterInput>;
}>;


export type PatientsQuery = { __typename: 'FullQuery', patients: { __typename: 'PatientConnector', totalCount: number, nodes: Array<{ __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, isDeceased: boolean, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null }> } };

export type PatientByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  nameId: Types.Scalars['String'];
}>;


export type PatientByIdQuery = { __typename: 'FullQuery', patients: { __typename: 'PatientConnector', totalCount: number, nodes: Array<{ __typename: 'PatientNode', address1?: string | null, address2?: string | null, code: string, code2?: string | null, country?: string | null, dateOfBirth?: string | null, email?: string | null, firstName?: string | null, lastName?: string | null, gender?: Types.GenderType | null, id: string, name: string, phone?: string | null, website?: string | null, isDeceased: boolean, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null }> } };

export type PatientSearchQueryVariables = Types.Exact<{
  input: Types.PatientSearchInput;
  storeId: Types.Scalars['String'];
}>;


export type PatientSearchQuery = { __typename: 'FullQuery', patientSearch: { __typename: 'PatientSearchConnector', totalCount: number, nodes: Array<{ __typename: 'PatientSearchNode', score: number, patient: { __typename: 'PatientNode', address1?: string | null, address2?: string | null, code: string, code2?: string | null, country?: string | null, dateOfBirth?: string | null, email?: string | null, firstName?: string | null, lastName?: string | null, gender?: Types.GenderType | null, id: string, name: string, phone?: string | null, website?: string | null, isDeceased: boolean, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null } }> } };

export type GetDocumentHistoryQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  name: Types.Scalars['String'];
}>;


export type GetDocumentHistoryQuery = { __typename: 'FullQuery', documentHistory: { __typename: 'DocumentConnector', totalCount: number, nodes: Array<{ __typename: 'DocumentNode', author: string, data: any, id: string, name: string, parents: Array<string>, timestamp: string, type: string }> } };

export type ProgramsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key?: Types.InputMaybe<Types.ProgramSortFieldInput>;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.ProgramFilterInput>;
}>;


export type ProgramsQuery = { __typename: 'FullQuery', programs: { __typename: 'ProgramConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramNode', enrolmentDatetime: string, name: string, patientId: string, programPatientId?: string | null, type: string, document: { __typename: 'DocumentNode', data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, formSchemaId: string, jsonSchema: any, name?: string | null, context: Types.DocumentRegistryNodeContext, parentId?: string | null, uiSchema: any, uiSchemaType: string, children: Array<{ __typename: 'DocumentRegistryNode', id: string, documentType: string, formSchemaId: string, jsonSchema: any, name?: string | null, context: Types.DocumentRegistryNodeContext, parentId?: string | null, uiSchema: any, uiSchemaType: string }> } | null } }> } };

export type InsertPatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.InsertPatientInput;
}>;


export type InsertPatientMutation = { __typename: 'FullMutation', insertPatient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, isDeceased: boolean, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null } };

export type UpdatePatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdatePatientInput;
}>;


export type UpdatePatientMutation = { __typename: 'FullMutation', updatePatient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, gender?: Types.GenderType | null, email?: string | null, isDeceased: boolean, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null } };

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
    id
    name
    type
  }
  isDeceased
}
    `;
export const PatientDocumentFragmentDoc = gql`
    fragment PatientDocument on DocumentRegistryNode {
  id
  documentType
  formSchemaId
  jsonSchema
  name
  context
  parentId
  uiSchema
  uiSchemaType
}
    `;
export const PatientDocumentRegistryFragmentDoc = gql`
    fragment PatientDocumentRegistry on DocumentRegistryNode {
  ...PatientDocument
  children {
    ...PatientDocument
  }
}
    ${PatientDocumentFragmentDoc}`;
export const ProgramRowFragmentDoc = gql`
    fragment ProgramRow on ProgramNode {
  enrolmentDatetime
  name
  patientId
  programPatientId
  type
  document {
    documentRegistry {
      ...PatientDocumentRegistry
    }
    data
  }
}
    ${PatientDocumentRegistryFragmentDoc}`;
export const PatientFragmentDoc = gql`
    fragment Patient on PatientNode {
  address1
  address2
  code
  code2
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
  isDeceased
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
export const GetDocumentHistoryDocument = gql`
    query getDocumentHistory($storeId: String!, $name: String!) {
  documentHistory(storeId: $storeId, name: $name) {
    __typename
    ... on DocumentConnector {
      totalCount
      nodes {
        __typename
        author
        data
        id
        name
        parents
        timestamp
        type
      }
    }
  }
}
    `;
export const ProgramsDocument = gql`
    query programs($storeId: String!, $key: ProgramSortFieldInput, $desc: Boolean, $filter: ProgramFilterInput) {
  programs(storeId: $storeId, sort: {key: $key, desc: $desc}, filter: $filter) {
    ... on ProgramConnector {
      __typename
      nodes {
        ...ProgramRow
      }
      totalCount
    }
  }
}
    ${ProgramRowFragmentDoc}`;
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
    getDocumentHistory(variables: GetDocumentHistoryQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<GetDocumentHistoryQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetDocumentHistoryQuery>(GetDocumentHistoryDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getDocumentHistory', 'query');
    },
    programs(variables: ProgramsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ProgramsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramsQuery>(ProgramsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programs', 'query');
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
 * mockGetDocumentHistoryQuery((req, res, ctx) => {
 *   const { storeId, name } = req.variables;
 *   return res(
 *     ctx.data({ documentHistory })
 *   )
 * })
 */
export const mockGetDocumentHistoryQuery = (resolver: ResponseResolver<GraphQLRequest<GetDocumentHistoryQueryVariables>, GraphQLContext<GetDocumentHistoryQuery>, any>) =>
  graphql.query<GetDocumentHistoryQuery, GetDocumentHistoryQueryVariables>(
    'getDocumentHistory',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockProgramsQuery((req, res, ctx) => {
 *   const { storeId, key, desc, filter } = req.variables;
 *   return res(
 *     ctx.data({ programs })
 *   )
 * })
 */
export const mockProgramsQuery = (resolver: ResponseResolver<GraphQLRequest<ProgramsQueryVariables>, GraphQLContext<ProgramsQuery>, any>) =>
  graphql.query<ProgramsQuery, ProgramsQueryVariables>(
    'programs',
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
