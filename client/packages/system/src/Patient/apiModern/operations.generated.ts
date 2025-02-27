import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type InsuranceFragment = { __typename: 'InsuranceNode', id: string, insuranceProviderId: string, policyType: Types.InsurancePolicyNodeType, policyNumber: string, policyNumberFamily?: string | null, policyNumberPerson?: string | null, discountPercentage: number, expiryDate: string, isActive: boolean, insuranceProviders?: { __typename: 'InsuranceProviderNode', id: string, providerName: string } | null };

export type InsurancePoliciesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  nameId: Types.Scalars['String']['input'];
  sort?: Types.InputMaybe<Array<Types.InsuranceSortInput> | Types.InsuranceSortInput>;
}>;


export type InsurancePoliciesQuery = { __typename: 'Queries', insurancePolicies: { __typename: 'InsuranceConnector', nodes: Array<{ __typename: 'InsuranceNode', id: string, insuranceProviderId: string, policyType: Types.InsurancePolicyNodeType, policyNumber: string, policyNumberFamily?: string | null, policyNumberPerson?: string | null, discountPercentage: number, expiryDate: string, isActive: boolean, insuranceProviders?: { __typename: 'InsuranceProviderNode', id: string, providerName: string } | null }> } };

export type InsertInsuranceMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertInsuranceInput;
}>;


export type InsertInsuranceMutation = { __typename: 'Mutations', insertInsurance: { __typename: 'IdResponse', id: string } };

export type UpdateInsuranceMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateInsuranceInput;
}>;


export type UpdateInsuranceMutation = { __typename: 'Mutations', updateInsurance: { __typename: 'IdResponse', id: string } };

export type InsuranceProvidersFragment = { __typename: 'InsuranceProvidersNode', id: string, providerName: string, isActive: boolean, prescriptionValidityDays?: number | null };

export type InsuranceProvidersQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
}>;


export type InsuranceProvidersQuery = { __typename: 'Queries', insuranceProviders: { __typename: 'InsuranceProvidersConnector', nodes: Array<{ __typename: 'InsuranceProvidersNode', id: string, providerName: string, isActive: boolean, prescriptionValidityDays?: number | null }> } };

export const InsuranceFragmentDoc = gql`
    fragment Insurance on InsuranceNode {
  id
  insuranceProviderId
  policyType
  policyNumber
  policyNumberFamily
  policyNumberPerson
  discountPercentage
  expiryDate
  isActive
  insuranceProviders {
    id
    providerName
  }
}
    `;
export const InsuranceProvidersFragmentDoc = gql`
    fragment InsuranceProviders on InsuranceProvidersNode {
  id
  providerName
  isActive
  prescriptionValidityDays
}
    `;
export const InsurancePoliciesDocument = gql`
    query insurancePolicies($storeId: String!, $nameId: String!, $sort: [InsuranceSortInput!]) {
  insurancePolicies(storeId: $storeId, nameId: $nameId, sort: $sort) {
    ... on InsuranceConnector {
      __typename
      nodes {
        ...Insurance
      }
    }
  }
}
    ${InsuranceFragmentDoc}`;
export const InsertInsuranceDocument = gql`
    mutation insertInsurance($storeId: String!, $input: InsertInsuranceInput!) {
  insertInsurance(storeId: $storeId, input: $input) {
    ... on IdResponse {
      id
    }
  }
}
    `;
export const UpdateInsuranceDocument = gql`
    mutation updateInsurance($storeId: String!, $input: UpdateInsuranceInput!) {
  updateInsurance(storeId: $storeId, input: $input) {
    ... on IdResponse {
      id
    }
  }
}
    `;
export const InsuranceProvidersDocument = gql`
    query insuranceProviders($storeId: String!) {
  insuranceProviders(storeId: $storeId) {
    ... on InsuranceProvidersConnector {
      __typename
      nodes {
        ...InsuranceProviders
      }
    }
  }
}
    ${InsuranceProvidersFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    insurancePolicies(variables: InsurancePoliciesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsurancePoliciesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsurancePoliciesQuery>(InsurancePoliciesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insurancePolicies', 'query', variables);
    },
    insertInsurance(variables: InsertInsuranceMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertInsuranceMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertInsuranceMutation>(InsertInsuranceDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertInsurance', 'mutation', variables);
    },
    updateInsurance(variables: UpdateInsuranceMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateInsuranceMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateInsuranceMutation>(UpdateInsuranceDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateInsurance', 'mutation', variables);
    },
    insuranceProviders(variables: InsuranceProvidersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsuranceProvidersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsuranceProvidersQuery>(InsuranceProvidersDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insuranceProviders', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;