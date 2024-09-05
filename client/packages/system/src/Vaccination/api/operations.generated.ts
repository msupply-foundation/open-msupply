import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { VaccineCourseItemFragmentDoc } from '../../../../programs/src/api/operations.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type VaccinationCourseDoseFragment = { __typename: 'VaccineCourseDoseNode', id: string, label: string, vaccineCourse: { __typename: 'VaccineCourseNode', id: string, vaccineCourseItems?: Array<{ __typename: 'VaccineCourseItemNode', id: string, itemId: string, name: string }> | null } };

export type VaccineCourseDoseQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
}>;


export type VaccineCourseDoseQuery = { __typename: 'Queries', vaccineCourseDose: { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'VaccineCourseDoseNode', id: string, label: string, vaccineCourse: { __typename: 'VaccineCourseNode', id: string, vaccineCourseItems?: Array<{ __typename: 'VaccineCourseItemNode', id: string, itemId: string, name: string }> | null } } };

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
export const VaccineCourseDoseDocument = gql`
    query vaccineCourseDose($id: String!) {
  vaccineCourseDose(id: $id) {
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    vaccineCourseDose(variables: VaccineCourseDoseQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<VaccineCourseDoseQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<VaccineCourseDoseQuery>(VaccineCourseDoseDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'vaccineCourseDose', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;