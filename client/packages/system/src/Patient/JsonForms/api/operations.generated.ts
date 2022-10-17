import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type DocumentFragment = { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null };

export type DocumentByNameQueryVariables = Types.Exact<{
  name: Types.Scalars['String'];
  storeId: Types.Scalars['String'];
}>;


export type DocumentByNameQuery = { __typename: 'Queries', document?: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null } | null };

export type DocumentRegistryFragment = { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any };

export type DocumentRegistriesQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.DocumentRegistryFilterInput>;
  sort?: Types.InputMaybe<Types.DocumentRegistrySortInput>;
}>;


export type DocumentRegistriesQuery = { __typename: 'Queries', documentRegistries: { __typename: 'DocumentRegistryConnector', nodes: Array<{ __typename: 'DocumentRegistryNode', context: Types.DocumentRegistryNodeContext, documentType: string, formSchemaId: string, id: string, jsonSchema: any, name?: string | null, parentId?: string | null, uiSchema: any, uiSchemaType: string }> } };

export type AllocateProgramNumberMutationVariables = Types.Exact<{
  numberName: Types.Scalars['String'];
  storeId: Types.Scalars['String'];
}>;


export type AllocateProgramNumberMutation = { __typename: 'Mutations', allocateProgramNumber: { __typename: 'NumberNode', number: number } };

export type EncounterFieldsFragment = { __typename: 'EncounterFieldsNode', fields: Array<any>, encounter: { __typename: 'EncounterNode', name: string, startDatetime: string, endDatetime?: string | null } };

export type EncounterFieldsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  patientId: Types.Scalars['String'];
  fields?: Types.InputMaybe<Array<Types.Scalars['String']> | Types.Scalars['String']>;
}>;


export type EncounterFieldsQuery = { __typename: 'Queries', encounterFields: { __typename: 'EncounterFieldsConnector', nodes: Array<{ __typename: 'EncounterFieldsNode', fields: Array<any>, encounter: { __typename: 'EncounterNode', name: string, startDatetime: string, endDatetime?: string | null } }> } };

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
export const DocumentRegistryFragmentDoc = gql`
    fragment DocumentRegistry on DocumentRegistryNode {
  __typename
  id
  documentType
  context
  name
  parentId
  formSchemaId
  jsonSchema
  uiSchemaType
  uiSchema
}
    `;
export const EncounterFieldsFragmentDoc = gql`
    fragment EncounterFields on EncounterFieldsNode {
  fields
  encounter {
    name
    startDatetime
    endDatetime
  }
}
    `;
export const DocumentByNameDocument = gql`
    query documentByName($name: String!, $storeId: String!) {
  document(name: $name, storeId: $storeId) {
    __typename
    ... on DocumentNode {
      ...Document
    }
  }
}
    ${DocumentFragmentDoc}`;
export const DocumentRegistriesDocument = gql`
    query documentRegistries($filter: DocumentRegistryFilterInput, $sort: DocumentRegistrySortInput) {
  documentRegistries(filter: $filter, sort: $sort) {
    ... on DocumentRegistryConnector {
      __typename
      nodes {
        __typename
        context
        documentType
        formSchemaId
        id
        jsonSchema
        name
        parentId
        uiSchema
        uiSchemaType
      }
    }
  }
}
    `;
export const AllocateProgramNumberDocument = gql`
    mutation allocateProgramNumber($numberName: String!, $storeId: String!) {
  allocateProgramNumber(input: {numberName: $numberName}, storeId: $storeId) {
    ... on NumberNode {
      __typename
      number
    }
  }
}
    `;
export const EncounterFieldsDocument = gql`
    query encounterFields($storeId: String!, $patientId: String!, $fields: [String!]) {
  encounterFields(
    input: {fields: $fields}
    storeId: $storeId
    sort: {key: startDatetime}
    filter: {patientId: {equalTo: $patientId}}
  ) {
    ... on EncounterFieldsConnector {
      __typename
      nodes {
        __typename
        ...EncounterFields
      }
    }
  }
}
    ${EncounterFieldsFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    documentByName(variables: DocumentByNameQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DocumentByNameQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DocumentByNameQuery>(DocumentByNameDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'documentByName', 'query');
    },
    documentRegistries(variables?: DocumentRegistriesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DocumentRegistriesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DocumentRegistriesQuery>(DocumentRegistriesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'documentRegistries', 'query');
    },
    allocateProgramNumber(variables: AllocateProgramNumberMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<AllocateProgramNumberMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<AllocateProgramNumberMutation>(AllocateProgramNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'allocateProgramNumber', 'mutation');
    },
    encounterFields(variables: EncounterFieldsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<EncounterFieldsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EncounterFieldsQuery>(EncounterFieldsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'encounterFields', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDocumentByNameQuery((req, res, ctx) => {
 *   const { name, storeId } = req.variables;
 *   return res(
 *     ctx.data({ document })
 *   )
 * })
 */
export const mockDocumentByNameQuery = (resolver: ResponseResolver<GraphQLRequest<DocumentByNameQueryVariables>, GraphQLContext<DocumentByNameQuery>, any>) =>
  graphql.query<DocumentByNameQuery, DocumentByNameQueryVariables>(
    'documentByName',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDocumentRegistriesQuery((req, res, ctx) => {
 *   const { filter, sort } = req.variables;
 *   return res(
 *     ctx.data({ documentRegistries })
 *   )
 * })
 */
export const mockDocumentRegistriesQuery = (resolver: ResponseResolver<GraphQLRequest<DocumentRegistriesQueryVariables>, GraphQLContext<DocumentRegistriesQuery>, any>) =>
  graphql.query<DocumentRegistriesQuery, DocumentRegistriesQueryVariables>(
    'documentRegistries',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAllocateProgramNumberMutation((req, res, ctx) => {
 *   const { numberName, storeId } = req.variables;
 *   return res(
 *     ctx.data({ allocateProgramNumber })
 *   )
 * })
 */
export const mockAllocateProgramNumberMutation = (resolver: ResponseResolver<GraphQLRequest<AllocateProgramNumberMutationVariables>, GraphQLContext<AllocateProgramNumberMutation>, any>) =>
  graphql.mutation<AllocateProgramNumberMutation, AllocateProgramNumberMutationVariables>(
    'allocateProgramNumber',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockEncounterFieldsQuery((req, res, ctx) => {
 *   const { storeId, patientId, fields } = req.variables;
 *   return res(
 *     ctx.data({ encounterFields })
 *   )
 * })
 */
export const mockEncounterFieldsQuery = (resolver: ResponseResolver<GraphQLRequest<EncounterFieldsQueryVariables>, GraphQLContext<EncounterFieldsQuery>, any>) =>
  graphql.query<EncounterFieldsQuery, EncounterFieldsQueryVariables>(
    'encounterFields',
    resolver
  )
