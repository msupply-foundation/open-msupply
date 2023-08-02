import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type PrescriptionRowFragment = { __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, pickedDatetime?: string | null, verifiedDatetime?: string | null, id: string, invoiceNumber: number, otherPartyId: string, otherPartyName: string, type: Types.InvoiceNodeType, status: Types.InvoiceNodeStatus, colour?: string | null, pricing: { __typename: 'PricingNode', totalAfterTax: number } };

export type PrescriptionsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type PrescriptionsQuery = { __typename: 'Queries', invoices: { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, pickedDatetime?: string | null, verifiedDatetime?: string | null, id: string, invoiceNumber: number, otherPartyId: string, otherPartyName: string, type: Types.InvoiceNodeType, status: Types.InvoiceNodeStatus, colour?: string | null, pricing: { __typename: 'PricingNode', totalAfterTax: number } }> } };

export type PrescriptionByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type PrescriptionByNumberQuery = { __typename: 'Queries', invoiceByNumber: { __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, pickedDatetime?: string | null, verifiedDatetime?: string | null, id: string, invoiceNumber: number, otherPartyId: string, otherPartyName: string, type: Types.InvoiceNodeType, status: Types.InvoiceNodeStatus, colour?: string | null, pricing: { __typename: 'PricingNode', totalAfterTax: number } } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type InsertPrescriptionMutationVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  patientId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type InsertPrescriptionMutation = { __typename: 'Mutations', insertPrescription: { __typename: 'InsertPrescriptionError', error: { __typename: 'OtherPartyNotAPatient', description: string } | { __typename: 'OtherPartyNotVisible', description: string } } | { __typename: 'InvoiceNode', id: string, invoiceNumber: number } };

export type UpsertPrescriptionMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchPrescriptionInput;
}>;


export type UpsertPrescriptionMutation = { __typename: 'Mutations', batchPrescription: { __typename: 'BatchPrescriptionResponse', updatePrescriptions?: Array<{ __typename: 'UpdatePrescriptionResponseWithId', id: string, response: { __typename: 'InvoiceNode' } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'UpdatePrescriptionError', error: { __typename: 'CanOnlyChangeToPickedWhenNoUnallocatedLines', description: string } | { __typename: 'CannotReverseInvoiceStatus', description: string } | { __typename: 'InvoiceIsNotEditable', description: string } | { __typename: 'OtherPartyNotAPatient', description: string } | { __typename: 'OtherPartyNotVisible', description: string } | { __typename: 'RecordNotFound', description: string } } }> | null } };

export type DeletePrescriptionsMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  deletePrescriptions: Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input'];
}>;


export type DeletePrescriptionsMutation = { __typename: 'Mutations', batchPrescription: { __typename: 'BatchPrescriptionResponse', deletePrescriptions?: Array<{ __typename: 'DeletePrescriptionResponseWithId', id: string, response: { __typename: 'DeletePrescriptionError', error: { __typename: 'CannotDeleteInvoiceWithLines', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export const PrescriptionRowFragmentDoc = gql`
    fragment PrescriptionRow on InvoiceNode {
  __typename
  comment
  createdDatetime
  pickedDatetime
  verifiedDatetime
  id
  invoiceNumber
  otherPartyId
  otherPartyName
  type
  status
  colour
  pricing {
    __typename
    totalAfterTax
  }
}
    `;
export const PrescriptionsDocument = gql`
    query prescriptions($first: Int, $offset: Int, $key: InvoiceSortFieldInput!, $desc: Boolean, $filter: InvoiceFilterInput, $storeId: String!) {
  invoices(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
    storeId: $storeId
  ) {
    ... on InvoiceConnector {
      __typename
      nodes {
        ...PrescriptionRow
      }
      totalCount
    }
  }
}
    ${PrescriptionRowFragmentDoc}`;
export const PrescriptionByNumberDocument = gql`
    query prescriptionByNumber($invoiceNumber: Int!, $storeId: String!) {
  invoiceByNumber(
    invoiceNumber: $invoiceNumber
    storeId: $storeId
    type: PRESCRIPTION
  ) {
    __typename
    ... on NodeError {
      __typename
      error {
        description
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on RecordNotFound {
          __typename
          description
        }
      }
    }
    ... on InvoiceNode {
      ...PrescriptionRow
    }
  }
}
    ${PrescriptionRowFragmentDoc}`;
export const InsertPrescriptionDocument = gql`
    mutation insertPrescription($id: String!, $patientId: String!, $storeId: String!) {
  insertPrescription(storeId: $storeId, input: {id: $id, patientId: $patientId}) {
    __typename
    ... on InvoiceNode {
      id
      invoiceNumber
    }
    ... on InsertPrescriptionError {
      __typename
      error {
        description
        ... on OtherPartyNotVisible {
          __typename
          description
        }
        ... on OtherPartyNotAPatient {
          __typename
          description
        }
        description
      }
    }
  }
}
    `;
export const UpsertPrescriptionDocument = gql`
    mutation upsertPrescription($storeId: String!, $input: BatchPrescriptionInput!) {
  batchPrescription(storeId: $storeId, input: $input) {
    __typename
    updatePrescriptions {
      id
      response {
        ... on UpdatePrescriptionError {
          __typename
          error {
            description
          }
        }
        ... on NodeError {
          __typename
          error {
            description
          }
        }
      }
    }
  }
}
    `;
export const DeletePrescriptionsDocument = gql`
    mutation deletePrescriptions($storeId: String!, $deletePrescriptions: [String!]!) {
  batchPrescription(
    storeId: $storeId
    input: {deletePrescriptions: $deletePrescriptions}
  ) {
    __typename
    deletePrescriptions {
      id
      response {
        ... on DeletePrescriptionError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on CannotDeleteInvoiceWithLines {
              __typename
              description
            }
            ... on CannotEditInvoice {
              __typename
              description
            }
          }
        }
        ... on DeleteResponse {
          id
        }
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    prescriptions(variables: PrescriptionsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PrescriptionsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PrescriptionsQuery>(PrescriptionsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'prescriptions', 'query');
    },
    prescriptionByNumber(variables: PrescriptionByNumberQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PrescriptionByNumberQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PrescriptionByNumberQuery>(PrescriptionByNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'prescriptionByNumber', 'query');
    },
    insertPrescription(variables: InsertPrescriptionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertPrescriptionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertPrescriptionMutation>(InsertPrescriptionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertPrescription', 'mutation');
    },
    upsertPrescription(variables: UpsertPrescriptionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpsertPrescriptionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpsertPrescriptionMutation>(UpsertPrescriptionDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'upsertPrescription', 'mutation');
    },
    deletePrescriptions(variables: DeletePrescriptionsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeletePrescriptionsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeletePrescriptionsMutation>(DeletePrescriptionsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deletePrescriptions', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockPrescriptionsQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ invoices })
 *   )
 * })
 */
export const mockPrescriptionsQuery = (resolver: ResponseResolver<GraphQLRequest<PrescriptionsQueryVariables>, GraphQLContext<PrescriptionsQuery>, any>) =>
  graphql.query<PrescriptionsQuery, PrescriptionsQueryVariables>(
    'prescriptions',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockPrescriptionByNumberQuery((req, res, ctx) => {
 *   const { invoiceNumber, storeId } = req.variables;
 *   return res(
 *     ctx.data({ invoiceByNumber })
 *   )
 * })
 */
export const mockPrescriptionByNumberQuery = (resolver: ResponseResolver<GraphQLRequest<PrescriptionByNumberQueryVariables>, GraphQLContext<PrescriptionByNumberQuery>, any>) =>
  graphql.query<PrescriptionByNumberQuery, PrescriptionByNumberQueryVariables>(
    'prescriptionByNumber',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertPrescriptionMutation((req, res, ctx) => {
 *   const { id, patientId, storeId } = req.variables;
 *   return res(
 *     ctx.data({ insertPrescription })
 *   )
 * })
 */
export const mockInsertPrescriptionMutation = (resolver: ResponseResolver<GraphQLRequest<InsertPrescriptionMutationVariables>, GraphQLContext<InsertPrescriptionMutation>, any>) =>
  graphql.mutation<InsertPrescriptionMutation, InsertPrescriptionMutationVariables>(
    'insertPrescription',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpsertPrescriptionMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ batchPrescription })
 *   )
 * })
 */
export const mockUpsertPrescriptionMutation = (resolver: ResponseResolver<GraphQLRequest<UpsertPrescriptionMutationVariables>, GraphQLContext<UpsertPrescriptionMutation>, any>) =>
  graphql.mutation<UpsertPrescriptionMutation, UpsertPrescriptionMutationVariables>(
    'upsertPrescription',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeletePrescriptionsMutation((req, res, ctx) => {
 *   const { storeId, deletePrescriptions } = req.variables;
 *   return res(
 *     ctx.data({ batchPrescription })
 *   )
 * })
 */
export const mockDeletePrescriptionsMutation = (resolver: ResponseResolver<GraphQLRequest<DeletePrescriptionsMutationVariables>, GraphQLContext<DeletePrescriptionsMutation>, any>) =>
  graphql.mutation<DeletePrescriptionsMutation, DeletePrescriptionsMutationVariables>(
    'deletePrescriptions',
    resolver
  )
