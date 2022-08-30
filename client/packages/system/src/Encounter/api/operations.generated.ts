import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type EncounterRowFragment = { __typename: 'EncounterNode', id: string, program: string, startDatetime: string, endDatetime?: string | null, status?: Types.EncounterNodeStatus | null, name: string, type: string, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null }, patient: { __typename: 'NameNode', id: string, firstName?: string | null, lastName?: string | null, name: string } };

export type EncounterDocumentRegistryFragment = { __typename: 'DocumentRegistryNode', context: Types.DocumentRegistryNodeContext, documentType: string, formSchemaId: string, id: string, jsonSchema: any, name?: string | null, parentId?: string | null, uiSchema: any, uiSchemaType: string, children: Array<{ __typename: 'DocumentRegistryNode', id: string }> };

export type EncounterDocumentFragment = { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', context: Types.DocumentRegistryNodeContext, documentType: string, formSchemaId: string, id: string, jsonSchema: any, name?: string | null, parentId?: string | null, uiSchema: any, uiSchemaType: string, children: Array<{ __typename: 'DocumentRegistryNode', id: string }> } | null };

export type EncounterFragment = { __typename: 'EncounterNode', id: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, program: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'NameNode', id: string, firstName?: string | null, lastName?: string | null, name: string }, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', context: Types.DocumentRegistryNodeContext, documentType: string, formSchemaId: string, id: string, jsonSchema: any, name?: string | null, parentId?: string | null, uiSchema: any, uiSchemaType: string, children: Array<{ __typename: 'DocumentRegistryNode', id: string }> } | null } };

export type EncountersQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key?: Types.InputMaybe<Types.EncounterSortFieldInput>;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.EncounterFilterInput>;
}>;


export type EncountersQuery = { __typename: 'FullQuery', encounters: { __typename: 'EncounterConnector', totalCount: number, nodes: Array<{ __typename: 'EncounterNode', id: string, program: string, startDatetime: string, endDatetime?: string | null, status?: Types.EncounterNodeStatus | null, name: string, type: string, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null }, patient: { __typename: 'NameNode', id: string, firstName?: string | null, lastName?: string | null, name: string } }> } };

export type EncounterDocumentRegistriesQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.DocumentRegistryFilterInput>;
}>;


export type EncounterDocumentRegistriesQuery = { __typename: 'FullQuery', documentRegistries: { __typename: 'DocumentRegistryConnector', totalCount: number, nodes: Array<{ __typename: 'DocumentRegistryNode', context: Types.DocumentRegistryNodeContext, documentType: string, formSchemaId: string, id: string, jsonSchema: any, name?: string | null, parentId?: string | null, uiSchema: any, uiSchemaType: string, children: Array<{ __typename: 'DocumentRegistryNode', id: string }> }> } };

export type EncounterByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  encounterId: Types.Scalars['String'];
}>;


export type EncounterByIdQuery = { __typename: 'FullQuery', encounters: { __typename: 'EncounterConnector', totalCount: number, nodes: Array<{ __typename: 'EncounterNode', id: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, program: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'NameNode', id: string, firstName?: string | null, lastName?: string | null, name: string }, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', context: Types.DocumentRegistryNodeContext, documentType: string, formSchemaId: string, id: string, jsonSchema: any, name?: string | null, parentId?: string | null, uiSchema: any, uiSchemaType: string, children: Array<{ __typename: 'DocumentRegistryNode', id: string }> } | null } }> } };

export type InsertEncounterMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.InsertEncounterInput;
}>;


export type InsertEncounterMutation = { __typename: 'FullMutation', insertEncounter: { __typename: 'EncounterNode', id: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, program: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'NameNode', id: string, firstName?: string | null, lastName?: string | null, name: string }, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', context: Types.DocumentRegistryNodeContext, documentType: string, formSchemaId: string, id: string, jsonSchema: any, name?: string | null, parentId?: string | null, uiSchema: any, uiSchemaType: string, children: Array<{ __typename: 'DocumentRegistryNode', id: string }> } | null } } };

export type UpdateEncounterMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdateEncounterInput;
}>;


export type UpdateEncounterMutation = { __typename: 'FullMutation', updateEncounter: { __typename: 'EncounterNode', id: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, program: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'NameNode', id: string, firstName?: string | null, lastName?: string | null, name: string }, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', context: Types.DocumentRegistryNodeContext, documentType: string, formSchemaId: string, id: string, jsonSchema: any, name?: string | null, parentId?: string | null, uiSchema: any, uiSchemaType: string, children: Array<{ __typename: 'DocumentRegistryNode', id: string }> } | null } } };

export const EncounterRowFragmentDoc = gql`
    fragment EncounterRow on EncounterNode {
  id
  document {
    documentRegistry {
      name
    }
  }
  program
  startDatetime
  endDatetime
  status
  name
  type
  patient {
    id
    firstName
    lastName
    name
  }
}
    `;
export const EncounterDocumentRegistryFragmentDoc = gql`
    fragment EncounterDocumentRegistry on DocumentRegistryNode {
  context
  documentType
  formSchemaId
  id
  jsonSchema
  name
  parentId
  uiSchema
  uiSchemaType
  children {
    id
  }
}
    `;
export const EncounterDocumentFragmentDoc = gql`
    fragment EncounterDocument on DocumentNode {
  id
  name
  parents
  author
  timestamp
  type
  data
  documentRegistry {
    ...EncounterDocumentRegistry
  }
}
    ${EncounterDocumentRegistryFragmentDoc}`;
export const EncounterFragmentDoc = gql`
    fragment Encounter on EncounterNode {
  id
  type
  name
  status
  patient {
    id
    firstName
    lastName
    name
  }
  program
  startDatetime
  endDatetime
  document {
    ...EncounterDocument
  }
}
    ${EncounterDocumentFragmentDoc}`;
export const EncountersDocument = gql`
    query encounters($storeId: String!, $key: EncounterSortFieldInput, $desc: Boolean, $filter: EncounterFilterInput) {
  encounters(storeId: $storeId, sort: {key: $key, desc: $desc}, filter: $filter) {
    ... on EncounterConnector {
      nodes {
        ...EncounterRow
      }
      totalCount
    }
  }
}
    ${EncounterRowFragmentDoc}`;
export const EncounterDocumentRegistriesDocument = gql`
    query encounterDocumentRegistries($filter: DocumentRegistryFilterInput) {
  documentRegistries(filter: $filter) {
    ... on DocumentRegistryConnector {
      nodes {
        ...EncounterDocumentRegistry
      }
      totalCount
    }
  }
}
    ${EncounterDocumentRegistryFragmentDoc}`;
export const EncounterByIdDocument = gql`
    query encounterById($storeId: String!, $encounterId: String!) {
  encounters(storeId: $storeId, filter: {id: {equalTo: $encounterId}}) {
    ... on EncounterConnector {
      __typename
      nodes {
        ...Encounter
      }
      totalCount
    }
  }
}
    ${EncounterFragmentDoc}`;
export const InsertEncounterDocument = gql`
    mutation insertEncounter($storeId: String!, $input: InsertEncounterInput!) {
  insertEncounter(storeId: $storeId, input: $input) {
    ... on EncounterNode {
      __typename
      ...Encounter
    }
  }
}
    ${EncounterFragmentDoc}`;
export const UpdateEncounterDocument = gql`
    mutation updateEncounter($storeId: String!, $input: UpdateEncounterInput!) {
  updateEncounter(storeId: $storeId, input: $input) {
    ... on EncounterNode {
      __typename
      ...Encounter
    }
  }
}
    ${EncounterFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    encounters(variables: EncountersQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<EncountersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EncountersQuery>(EncountersDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'encounters', 'query');
    },
    encounterDocumentRegistries(variables?: EncounterDocumentRegistriesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<EncounterDocumentRegistriesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EncounterDocumentRegistriesQuery>(EncounterDocumentRegistriesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'encounterDocumentRegistries', 'query');
    },
    encounterById(variables: EncounterByIdQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<EncounterByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EncounterByIdQuery>(EncounterByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'encounterById', 'query');
    },
    insertEncounter(variables: InsertEncounterMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertEncounterMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertEncounterMutation>(InsertEncounterDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertEncounter', 'mutation');
    },
    updateEncounter(variables: UpdateEncounterMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateEncounterMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateEncounterMutation>(UpdateEncounterDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateEncounter', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockEncountersQuery((req, res, ctx) => {
 *   const { storeId, key, desc, filter } = req.variables;
 *   return res(
 *     ctx.data({ encounters })
 *   )
 * })
 */
export const mockEncountersQuery = (resolver: ResponseResolver<GraphQLRequest<EncountersQueryVariables>, GraphQLContext<EncountersQuery>, any>) =>
  graphql.query<EncountersQuery, EncountersQueryVariables>(
    'encounters',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockEncounterDocumentRegistriesQuery((req, res, ctx) => {
 *   const { filter } = req.variables;
 *   return res(
 *     ctx.data({ documentRegistries })
 *   )
 * })
 */
export const mockEncounterDocumentRegistriesQuery = (resolver: ResponseResolver<GraphQLRequest<EncounterDocumentRegistriesQueryVariables>, GraphQLContext<EncounterDocumentRegistriesQuery>, any>) =>
  graphql.query<EncounterDocumentRegistriesQuery, EncounterDocumentRegistriesQueryVariables>(
    'encounterDocumentRegistries',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockEncounterByIdQuery((req, res, ctx) => {
 *   const { storeId, encounterId } = req.variables;
 *   return res(
 *     ctx.data({ encounters })
 *   )
 * })
 */
export const mockEncounterByIdQuery = (resolver: ResponseResolver<GraphQLRequest<EncounterByIdQueryVariables>, GraphQLContext<EncounterByIdQuery>, any>) =>
  graphql.query<EncounterByIdQuery, EncounterByIdQueryVariables>(
    'encounterById',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertEncounterMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertEncounter })
 *   )
 * })
 */
export const mockInsertEncounterMutation = (resolver: ResponseResolver<GraphQLRequest<InsertEncounterMutationVariables>, GraphQLContext<InsertEncounterMutation>, any>) =>
  graphql.mutation<InsertEncounterMutation, InsertEncounterMutationVariables>(
    'insertEncounter',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateEncounterMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updateEncounter })
 *   )
 * })
 */
export const mockUpdateEncounterMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateEncounterMutationVariables>, GraphQLContext<UpdateEncounterMutation>, any>) =>
  graphql.mutation<UpdateEncounterMutation, UpdateEncounterMutationVariables>(
    'updateEncounter',
    resolver
  )
