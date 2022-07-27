import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type DocumentFragment = { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null };

export type ProgramFragment = { __typename: 'ProgramNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null } };

export type ProgramsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key?: Types.InputMaybe<Types.ProgramSortFieldInput>;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.ProgramFilterInput>;
}>;


export type ProgramsQuery = { __typename: 'FullQuery', programs: { __typename: 'ProgramConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', uiSchemaType: string, documentType: string, context: Types.DocumentRegistryNodeContext, formSchemaId: string, jsonSchema: any, uiSchema: any } | null } }> } };

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
      nodes {
        ...Program
      }
      totalCount
    }
  }
}
    ${ProgramFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    programs(variables: ProgramsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ProgramsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramsQuery>(ProgramsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programs', 'query');
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
