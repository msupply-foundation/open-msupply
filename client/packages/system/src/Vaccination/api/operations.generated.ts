import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { VaccineCourseItemFragmentDoc } from '../../../../programs/src/api/operations.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type VaccinationCourseDoseFragment = { __typename: 'VaccineCourseDoseNode', id: string, label: string, vaccineCourse: { __typename: 'VaccineCourseNode', id: string, vaccineCourseItems?: Array<{ __typename: 'VaccineCourseItemNode', id: string, itemId: string, name: string }> | null } };

export type VaccinationDetailFragment = { __typename: 'VaccinationNode', id: string, facilityName?: string | null, vaccinationDate: string, given: boolean, notGivenReason?: string | null, comment?: string | null, clinician?: { __typename: 'ClinicianNode', id: string, firstName?: string | null, lastName: string } | null, stockLine?: { __typename: 'StockLineNode', id: string, itemId: string, batch?: string | null } | null, invoice?: { __typename: 'InvoiceNode', id: string, invoiceNumber: number } | null };

export type VaccinationQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  vaccinationId: Types.Scalars['String']['input'];
}>;


export type VaccinationQuery = { __typename: 'Queries', vaccination?: { __typename: 'VaccinationNode', id: string, facilityName?: string | null, vaccinationDate: string, given: boolean, notGivenReason?: string | null, comment?: string | null, clinician?: { __typename: 'ClinicianNode', id: string, firstName?: string | null, lastName: string } | null, stockLine?: { __typename: 'StockLineNode', id: string, itemId: string, batch?: string | null } | null, invoice?: { __typename: 'InvoiceNode', id: string, invoiceNumber: number } | null } | null };

export type VaccineCourseDoseQueryVariables = Types.Exact<{
  doseId: Types.Scalars['String']['input'];
}>;


export type VaccineCourseDoseQuery = { __typename: 'Queries', vaccineCourseDose: { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'VaccineCourseDoseNode', id: string, label: string, vaccineCourse: { __typename: 'VaccineCourseNode', id: string, vaccineCourseItems?: Array<{ __typename: 'VaccineCourseItemNode', id: string, itemId: string, name: string }> | null } } };

export type InsertVaccinationMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertVaccinationInput;
}>;


export type InsertVaccinationMutation = { __typename: 'Mutations', insertVaccination: { __typename: 'VaccinationNode', id: string } };

export const VaccinationCourseDoseFragmentDoc = gql`
    fragment VaccinationCourseDose on VaccineCourseDoseNode {
  __typename
  id
  label
  vaccineCourse {
    id
    vaccineCourseItems {
      ...VaccineCourseItem
    }
  }
}
    ${VaccineCourseItemFragmentDoc}`;
export const VaccinationDetailFragmentDoc = gql`
    fragment VaccinationDetail on VaccinationNode {
  __typename
  id
  facilityName
  vaccinationDate
  clinician {
    id
    firstName
    lastName
  }
  given
  stockLine {
    id
    itemId
    batch
  }
  invoice {
    id
    invoiceNumber
  }
  notGivenReason
  comment
}
    `;
export const VaccinationDocument = gql`
    query vaccination($storeId: String!, $vaccinationId: String!) {
  vaccination(storeId: $storeId, id: $vaccinationId) {
    __typename
    ... on VaccinationNode {
      ...VaccinationDetail
    }
  }
}
    ${VaccinationDetailFragmentDoc}`;
export const VaccineCourseDoseDocument = gql`
    query vaccineCourseDose($doseId: String!) {
  vaccineCourseDose(id: $doseId) {
    __typename
    ... on NodeError {
      __typename
      error {
        description
      }
    }
    ... on VaccineCourseDoseNode {
      ...VaccinationCourseDose
    }
  }
}
    ${VaccinationCourseDoseFragmentDoc}`;
export const InsertVaccinationDocument = gql`
    mutation insertVaccination($storeId: String!, $input: InsertVaccinationInput!) {
  insertVaccination(storeId: $storeId, input: $input) {
    __typename
    ... on VaccinationNode {
      __typename
      id
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    vaccination(variables: VaccinationQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<VaccinationQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<VaccinationQuery>(VaccinationDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'vaccination', 'query', variables);
    },
    vaccineCourseDose(variables: VaccineCourseDoseQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<VaccineCourseDoseQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<VaccineCourseDoseQuery>(VaccineCourseDoseDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'vaccineCourseDose', 'query', variables);
    },
    insertVaccination(variables: InsertVaccinationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertVaccinationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertVaccinationMutation>(InsertVaccinationDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertVaccination', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;