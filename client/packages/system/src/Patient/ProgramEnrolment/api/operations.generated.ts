import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type ProgramEnrolmentDocumentFragment = { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null };

export type ProgramEnrolmentFragment = { __typename: 'ProgramEnrolmentNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null } };

export type ProgramEnrolmentByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  programId: Types.Scalars['String'];
}>;


export type ProgramEnrolmentByIdQuery = { __typename: 'FullQuery', programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null } }> } };

export type InsertProgramEnrolmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.InsertProgramEnrolmentInput;
}>;


export type InsertProgramEnrolmentMutation = { __typename: 'FullMutation', insertProgramEnrolment: { __typename: 'ProgramEnrolmentNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null } } };

export type UpdateProgramEnrolmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdateProgramEnrolmentInput;
}>;


export type UpdateProgramEnrolmentMutation = { __typename: 'FullMutation', updateProgramEnrolment: { __typename: 'ProgramEnrolmentNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null } } };

export const ProgramEnrolmentDocumentFragmentDoc = gql`
    fragment ProgramEnrolmentDocument on DocumentNode {
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
export const ProgramEnrolmentFragmentDoc = gql`
    fragment ProgramEnrolment on ProgramEnrolmentNode {
  type
  programPatientId
  patientId
  name
  enrolmentDatetime
  document {
    ...ProgramEnrolmentDocument
  }
}
    ${ProgramEnrolmentDocumentFragmentDoc}`;
export const ProgramEnrolmentByIdDocument = gql`
    query programEnrolmentById($storeId: String!, $programId: String!) {
  programEnrolments(storeId: $storeId, filter: {id: {equalTo: $programId}}) {
    ... on ProgramEnrolmentConnector {
      __typename
      nodes {
        ...ProgramEnrolment
      }
      totalCount
    }
  }
}
    ${ProgramEnrolmentFragmentDoc}`;
export const InsertProgramEnrolmentDocument = gql`
    mutation insertProgramEnrolment($storeId: String!, $input: InsertProgramEnrolmentInput!) {
  insertProgramEnrolment(storeId: $storeId, input: $input) {
    ... on ProgramEnrolmentNode {
      __typename
      ...ProgramEnrolment
    }
  }
}
    ${ProgramEnrolmentFragmentDoc}`;
export const UpdateProgramEnrolmentDocument = gql`
    mutation updateProgramEnrolment($storeId: String!, $input: UpdateProgramEnrolmentInput!) {
  updateProgramEnrolment(storeId: $storeId, input: $input) {
    ... on ProgramEnrolmentNode {
      __typename
      ...ProgramEnrolment
    }
  }
}
    ${ProgramEnrolmentFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    programEnrolmentById(variables: ProgramEnrolmentByIdQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ProgramEnrolmentByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramEnrolmentByIdQuery>(ProgramEnrolmentByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programEnrolmentById', 'query');
    },
    insertProgramEnrolment(variables: InsertProgramEnrolmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertProgramEnrolmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertProgramEnrolmentMutation>(InsertProgramEnrolmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertProgramEnrolment', 'mutation');
    },
    updateProgramEnrolment(variables: UpdateProgramEnrolmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateProgramEnrolmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateProgramEnrolmentMutation>(UpdateProgramEnrolmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateProgramEnrolment', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockProgramEnrolmentByIdQuery((req, res, ctx) => {
 *   const { storeId, programId } = req.variables;
 *   return res(
 *     ctx.data({ programEnrolments })
 *   )
 * })
 */
export const mockProgramEnrolmentByIdQuery = (resolver: ResponseResolver<GraphQLRequest<ProgramEnrolmentByIdQueryVariables>, GraphQLContext<ProgramEnrolmentByIdQuery>, any>) =>
  graphql.query<ProgramEnrolmentByIdQuery, ProgramEnrolmentByIdQueryVariables>(
    'programEnrolmentById',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertProgramEnrolmentMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertProgramEnrolment })
 *   )
 * })
 */
export const mockInsertProgramEnrolmentMutation = (resolver: ResponseResolver<GraphQLRequest<InsertProgramEnrolmentMutationVariables>, GraphQLContext<InsertProgramEnrolmentMutation>, any>) =>
  graphql.mutation<InsertProgramEnrolmentMutation, InsertProgramEnrolmentMutationVariables>(
    'insertProgramEnrolment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateProgramEnrolmentMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updateProgramEnrolment })
 *   )
 * })
 */
export const mockUpdateProgramEnrolmentMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateProgramEnrolmentMutationVariables>, GraphQLContext<UpdateProgramEnrolmentMutation>, any>) =>
  graphql.mutation<UpdateProgramEnrolmentMutation, UpdateProgramEnrolmentMutationVariables>(
    'updateProgramEnrolment',
    resolver
  )
