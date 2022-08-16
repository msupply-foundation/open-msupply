import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type DocumentFragment = { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null };

export type ProgramRowFragment = { __typename: 'ProgramNode', enrolmentDatetime: string, name: string, patientId: string, programPatientId?: string | null, type: string };

export type ProgramFragment = { __typename: 'ProgramNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null } };

export type ProgramsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key?: Types.InputMaybe<Types.ProgramSortFieldInput>;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.ProgramFilterInput>;
}>;


export type ProgramsQuery = { __typename: 'FullQuery', programs: { __typename: 'ProgramConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramNode', enrolmentDatetime: string, name: string, patientId: string, programPatientId?: string | null, type: string }> } };

export type ProgramByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  programId: Types.Scalars['String'];
}>;


export type ProgramByIdQuery = { __typename: 'FullQuery', programs: { __typename: 'ProgramConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null } }> } };

export type InsertProgramMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.InsertProgramInput;
}>;


export type InsertProgramMutation = { __typename: 'FullMutation', insertProgram: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null } };

export type UpdateProgramMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdateProgramInput;
}>;


export type UpdateProgramMutation = { __typename: 'FullMutation', updateProgram: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null } };

export const ProgramRowFragmentDoc = gql`
    fragment ProgramRow on ProgramNode {
  enrolmentDatetime
  name
  patientId
  programPatientId
  type
}
    `;
export const DocumentFragmentDoc = gql`
    fragment Document on DocumentNode {
  id
  name
  parents
  author
  timestamp
  type
  data
  documentRegistry {
    uiSchemaType
    documentType
    context
    formSchemaId
    jsonSchema
    uiSchema
  }
}
    `;
export const ProgramFragmentDoc = gql`
    fragment Program on ProgramNode {
  type
  programPatientId
  patientId
  name
  enrolmentDatetime
  document {
    ...Document
  }
}
    ${DocumentFragmentDoc}`;
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
export const ProgramByIdDocument = gql`
    query programById($storeId: String!, $programId: String!) {
  programs(storeId: $storeId, filter: {id: {equalTo: $programId}}) {
    ... on ProgramConnector {
      __typename
      nodes {
        ...Program
      }
      totalCount
    }
  }
}
    ${ProgramFragmentDoc}`;
export const InsertProgramDocument = gql`
    mutation insertProgram($storeId: String!, $input: InsertProgramInput!) {
  insertProgram(storeId: $storeId, input: $input) {
    ... on DocumentNode {
      __typename
      ...Document
    }
  }
}
    ${DocumentFragmentDoc}`;
export const UpdateProgramDocument = gql`
    mutation updateProgram($storeId: String!, $input: UpdateProgramInput!) {
  updateProgram(storeId: $storeId, input: $input) {
    ... on DocumentNode {
      __typename
      ...Document
    }
  }
}
    ${DocumentFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    programs(variables: ProgramsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ProgramsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramsQuery>(ProgramsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programs', 'query');
    },
    programById(variables: ProgramByIdQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ProgramByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramByIdQuery>(ProgramByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programById', 'query');
    },
    insertProgram(variables: InsertProgramMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertProgramMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertProgramMutation>(InsertProgramDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertProgram', 'mutation');
    },
    updateProgram(variables: UpdateProgramMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateProgramMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateProgramMutation>(UpdateProgramDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateProgram', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

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
 * mockProgramByIdQuery((req, res, ctx) => {
 *   const { storeId, programId } = req.variables;
 *   return res(
 *     ctx.data({ programs })
 *   )
 * })
 */
export const mockProgramByIdQuery = (resolver: ResponseResolver<GraphQLRequest<ProgramByIdQueryVariables>, GraphQLContext<ProgramByIdQuery>, any>) =>
  graphql.query<ProgramByIdQuery, ProgramByIdQueryVariables>(
    'programById',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertProgramMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertProgram })
 *   )
 * })
 */
export const mockInsertProgramMutation = (resolver: ResponseResolver<GraphQLRequest<InsertProgramMutationVariables>, GraphQLContext<InsertProgramMutation>, any>) =>
  graphql.mutation<InsertProgramMutation, InsertProgramMutationVariables>(
    'insertProgram',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateProgramMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updateProgram })
 *   )
 * })
 */
export const mockUpdateProgramMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateProgramMutationVariables>, GraphQLContext<UpdateProgramMutation>, any>) =>
  graphql.mutation<UpdateProgramMutation, UpdateProgramMutationVariables>(
    'updateProgram',
    resolver
  )
