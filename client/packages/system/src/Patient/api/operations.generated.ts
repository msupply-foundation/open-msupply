import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type PatientRowFragment = { __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null };

export type PatientFragment = { __typename: 'NameNode', address1?: string | null, address2?: string | null, chargeCode?: string | null, code: string, comment?: string | null, country?: string | null, createdDatetime?: string | null, email?: string | null, firstName?: string | null, id: string, isCustomer: boolean, isDonor: boolean, isManufacturer: boolean, isOnHold: boolean, isSupplier: boolean, isSystemName: boolean, isVisible: boolean, name: string, phone?: string | null, type: Types.NameNodeType, website?: string | null, store?: { __typename: 'StoreNode', id: string, code: string } | null };

export type PatientsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key: Types.NameSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  filter?: Types.InputMaybe<Types.NameFilterInput>;
}>;


export type PatientsQuery = { __typename: 'FullQuery', names: { __typename: 'NameConnector', totalCount: number, nodes: Array<{ __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, isOnHold: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null }> } };

export type PatientByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  nameId: Types.Scalars['String'];
}>;


export type PatientByIdQuery = { __typename: 'FullQuery', names: { __typename: 'NameConnector', totalCount: number, nodes: Array<{ __typename: 'NameNode', address1?: string | null, address2?: string | null, chargeCode?: string | null, code: string, comment?: string | null, country?: string | null, createdDatetime?: string | null, email?: string | null, firstName?: string | null, id: string, isCustomer: boolean, isDonor: boolean, isManufacturer: boolean, isOnHold: boolean, isSupplier: boolean, isSystemName: boolean, isVisible: boolean, name: string, phone?: string | null, type: Types.NameNodeType, website?: string | null, store?: { __typename: 'StoreNode', id: string, code: string } | null }> } };

export const PatientRowFragmentDoc = gql`
    fragment PatientRow on NameNode {
  code
  id
  isCustomer
  isSupplier
  isOnHold
  name
  store {
    id
    code
  }
}
    `;
export const PatientFragmentDoc = gql`
    fragment Patient on NameNode {
  address1
  address2
  chargeCode
  code
  comment
  country
  createdDatetime
  email
  firstName
  id
  isCustomer
  isDonor
  isManufacturer
  isOnHold
  isSupplier
  isSystemName
  isVisible
  name
  phone
  type
  website
  store {
    id
    code
  }
}
    `;
export const PatientsDocument = gql`
    query patients($storeId: String!, $key: NameSortFieldInput!, $desc: Boolean, $first: Int, $offset: Int, $filter: NameFilterInput) {
  names(
    storeId: $storeId
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on NameConnector {
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
  names(storeId: $storeId, filter: {id: {equalTo: $nameId}}) {
    ... on NameConnector {
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
 *     ctx.data({ names })
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
 *     ctx.data({ names })
 *   )
 * })
 */
export const mockPatientByIdQuery = (resolver: ResponseResolver<GraphQLRequest<PatientByIdQueryVariables>, GraphQLContext<PatientByIdQuery>, any>) =>
  graphql.query<PatientByIdQuery, PatientByIdQueryVariables>(
    'patientById',
    resolver
  )
