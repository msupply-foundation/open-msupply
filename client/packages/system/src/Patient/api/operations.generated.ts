import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type PatientRowFragment = { __typename: 'PatientNode', id: string, code: string, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null };

export type PatientFragment = { __typename: 'PatientNode', address1?: string | null, address2?: string | null, code: string, country?: string | null, dateOfBirth?: string | null, email?: string | null, firstName?: string | null, lastName?: string | null, gender?: Types.GenderType | null, id: string, name: string, phone?: string | null, website?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null };

export type PatientsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key: Types.PatientSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  filter?: Types.InputMaybe<Types.PatientFilterInput>;
}>;


export type PatientsQuery = { __typename: 'FullQuery', patients: { __typename: 'PatientConnector', totalCount: number, nodes: Array<{ __typename: 'PatientNode', id: string, code: string, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null }> } };

export type PatientByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  nameId: Types.Scalars['String'];
}>;


export type PatientByIdQuery = { __typename: 'FullQuery', patients: { __typename: 'PatientConnector', totalCount: number, nodes: Array<{ __typename: 'PatientNode', address1?: string | null, address2?: string | null, code: string, country?: string | null, dateOfBirth?: string | null, email?: string | null, firstName?: string | null, lastName?: string | null, gender?: Types.GenderType | null, id: string, name: string, phone?: string | null, website?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null }> } };

export const PatientRowFragmentDoc = gql`
    fragment PatientRow on PatientNode {
  id
  code
  firstName
  lastName
  name
  dateOfBirth
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    patients(variables: PatientsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<PatientsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PatientsQuery>(PatientsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'patients', 'query');
    },
    patientById(variables: PatientByIdQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<PatientByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PatientByIdQuery>(PatientByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'patientById', 'query');
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
