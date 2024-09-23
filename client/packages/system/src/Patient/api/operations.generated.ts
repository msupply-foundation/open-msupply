import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PatientRowFragment = { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, createdDatetime?: string | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', name: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } };

export type ProgramPatientRowFragment = { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, createdDatetime?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } };

export type PatientsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.PatientSortInput> | Types.PatientSortInput>;
  filter?: Types.InputMaybe<Types.PatientFilterInput>;
}>;


export type PatientsQuery = { __typename: 'Queries', patients: { __typename: 'PatientConnector', totalCount: number, nodes: Array<{ __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, createdDatetime?: string | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', name: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } }> } };

export type PatientByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  nameId: Types.Scalars['String']['input'];
}>;


export type PatientByIdQuery = { __typename: 'Queries', patients: { __typename: 'PatientConnector', totalCount: number, nodes: Array<{ __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, createdDatetime?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } }> } };

export type PatientSearchQueryVariables = Types.Exact<{
  input: Types.PatientSearchInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type PatientSearchQuery = { __typename: 'Queries', patientSearch: { __typename: 'PatientSearchConnector', totalCount: number, nodes: Array<{ __typename: 'PatientSearchNode', score: number, patient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, createdDatetime?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } } }> } };

export type CentralPatientSearchQueryVariables = Types.Exact<{
  input: Types.CentralPatientSearchInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type CentralPatientSearchQuery = { __typename: 'Queries', centralPatientSearch: { __typename: 'CentralPatientSearchConnector', totalCount: number, nodes: Array<{ __typename: 'CentralPatientNode', id: string, code: string, dateOfBirth?: string | null, firstName: string, lastName: string }> } | { __typename: 'CentralPatientSearchError', error: { __typename: 'ConnectionError', description: string } } };

export type LinkPatientToStoreMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  nameId: Types.Scalars['String']['input'];
}>;


export type LinkPatientToStoreMutation = { __typename: 'Mutations', linkPatientToStore: { __typename: 'LinkPatientPatientToStoreError', error: { __typename: 'ConnectionError', description: string } } | { __typename: 'NameStoreJoinNode', id: string, storeId: string, nameId: string } };

export type InsertProgramPatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertProgramPatientInput;
}>;


export type InsertProgramPatientMutation = { __typename: 'Mutations', insertProgramPatient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, createdDatetime?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } } };

export type UpdateProgramPatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateProgramPatientInput;
}>;


export type UpdateProgramPatientMutation = { __typename: 'Mutations', updateProgramPatient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, createdDatetime?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } } };

export type InsertPatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertPatientInput;
}>;


export type InsertPatientMutation = { __typename: 'Mutations', insertPatient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, createdDatetime?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } } };

export type UpdatePatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdatePatientInput;
}>;


export type UpdatePatientMutation = { __typename: 'Mutations', updatePatient: { __typename: 'PatientNode', id: string, code: string, code2?: string | null, firstName?: string | null, lastName?: string | null, name: string, dateOfBirth?: string | null, address1?: string | null, phone?: string | null, gender?: Types.GenderType | null, email?: string | null, createdDatetime?: string | null, documentDraft?: any | null, isDeceased: boolean, dateOfDeath?: string | null, document?: { __typename: 'DocumentNode', id: string, name: string, type: string } | null, programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', programEnrolmentId?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null } }> } } };

export type LatestPatientEncounterQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  patientId: Types.Scalars['String']['input'];
  encounterType?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type LatestPatientEncounterQuery = { __typename: 'Queries', encounters: { __typename: 'EncounterConnector', totalCount: number, nodes: Array<{ __typename: 'EncounterNode', id: string, type: string, startDatetime: string, suggestedNextEncounter?: { __typename: 'SuggestedNextEncounterNode', startDatetime: string, label?: string | null } | null }> } };

export const PatientRowFragmentDoc = gql`
    fragment PatientRow on PatientNode {
  id
  code
  code2
  firstName
  lastName
  name
  dateOfBirth
  address1
  phone
  gender
  email
  createdDatetime
  document {
    name
  }
  isDeceased
  dateOfDeath
  programEnrolments {
    ... on ProgramEnrolmentConnector {
      __typename
      nodes {
        programEnrolmentId
        document {
          documentRegistry {
            name
          }
        }
      }
      totalCount
    }
  }
}
    `;
export const ProgramPatientRowFragmentDoc = gql`
    fragment ProgramPatientRow on PatientNode {
  id
  code
  code2
  firstName
  lastName
  name
  dateOfBirth
  address1
  phone
  gender
  email
  createdDatetime
  document {
    id
    name
    type
  }
  documentDraft
  isDeceased
  dateOfDeath
  programEnrolments {
    ... on ProgramEnrolmentConnector {
      __typename
      nodes {
        programEnrolmentId
        document {
          documentRegistry {
            name
          }
        }
      }
      totalCount
    }
  }
}
    `;
export const PatientsDocument = gql`
    query patients($storeId: String!, $page: PaginationInput, $sort: [PatientSortInput!], $filter: PatientFilterInput) {
  patients(storeId: $storeId, page: $page, sort: $sort, filter: $filter) {
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
        ...ProgramPatientRow
      }
      totalCount
    }
  }
}
    ${ProgramPatientRowFragmentDoc}`;
export const PatientSearchDocument = gql`
    query patientSearch($input: PatientSearchInput!, $storeId: String!) {
  patientSearch(input: $input, storeId: $storeId) {
    ... on PatientSearchConnector {
      __typename
      nodes {
        score
        patient {
          ...ProgramPatientRow
        }
      }
      totalCount
    }
  }
}
    ${ProgramPatientRowFragmentDoc}`;
export const CentralPatientSearchDocument = gql`
    query centralPatientSearch($input: CentralPatientSearchInput!, $storeId: String!) {
  centralPatientSearch(input: $input, storeId: $storeId) {
    __typename
    ... on CentralPatientSearchConnector {
      nodes {
        id
        code
        dateOfBirth
        firstName
        lastName
      }
      totalCount
    }
    ... on CentralPatientSearchError {
      error {
        __typename
        ... on ConnectionError {
          description
        }
      }
    }
  }
}
    `;
export const LinkPatientToStoreDocument = gql`
    mutation linkPatientToStore($storeId: String!, $nameId: String!) {
  linkPatientToStore(nameId: $nameId, storeId: $storeId) {
    __typename
    ... on NameStoreJoinNode {
      id
      storeId
      nameId
    }
    ... on LinkPatientPatientToStoreError {
      error {
        __typename
        ... on ConnectionError {
          description
        }
      }
    }
  }
}
    `;
export const InsertProgramPatientDocument = gql`
    mutation insertProgramPatient($storeId: String!, $input: InsertProgramPatientInput!) {
  insertProgramPatient(storeId: $storeId, input: $input) {
    ... on PatientNode {
      __typename
      ...ProgramPatientRow
    }
  }
}
    ${ProgramPatientRowFragmentDoc}`;
export const UpdateProgramPatientDocument = gql`
    mutation updateProgramPatient($storeId: String!, $input: UpdateProgramPatientInput!) {
  updateProgramPatient(storeId: $storeId, input: $input) {
    ... on PatientNode {
      __typename
      ...ProgramPatientRow
    }
  }
}
    ${ProgramPatientRowFragmentDoc}`;
export const InsertPatientDocument = gql`
    mutation insertPatient($storeId: String!, $input: InsertPatientInput!) {
  insertPatient(storeId: $storeId, input: $input) {
    ... on PatientNode {
      __typename
      ...ProgramPatientRow
    }
  }
}
    ${ProgramPatientRowFragmentDoc}`;
export const UpdatePatientDocument = gql`
    mutation updatePatient($storeId: String!, $input: UpdatePatientInput!) {
  updatePatient(storeId: $storeId, input: $input) {
    ... on PatientNode {
      __typename
      ...ProgramPatientRow
    }
  }
}
    ${ProgramPatientRowFragmentDoc}`;
export const LatestPatientEncounterDocument = gql`
    query latestPatientEncounter($storeId: String!, $patientId: String!, $encounterType: String) {
  encounters(
    storeId: $storeId
    filter: {patientId: {equalTo: $patientId}, type: {equalTo: $encounterType}}
    sort: {key: startDatetime, desc: true}
    page: {first: 1}
  ) {
    ... on EncounterConnector {
      __typename
      nodes {
        id
        type
        startDatetime
        suggestedNextEncounter {
          startDatetime
          label
        }
      }
      totalCount
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    patients(variables: PatientsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PatientsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PatientsQuery>(PatientsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'patients', 'query', variables);
    },
    patientById(variables: PatientByIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PatientByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PatientByIdQuery>(PatientByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'patientById', 'query', variables);
    },
    patientSearch(variables: PatientSearchQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<PatientSearchQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PatientSearchQuery>(PatientSearchDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'patientSearch', 'query', variables);
    },
    centralPatientSearch(variables: CentralPatientSearchQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CentralPatientSearchQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<CentralPatientSearchQuery>(CentralPatientSearchDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'centralPatientSearch', 'query', variables);
    },
    linkPatientToStore(variables: LinkPatientToStoreMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LinkPatientToStoreMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<LinkPatientToStoreMutation>(LinkPatientToStoreDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'linkPatientToStore', 'mutation', variables);
    },
    insertProgramPatient(variables: InsertProgramPatientMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertProgramPatientMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertProgramPatientMutation>(InsertProgramPatientDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertProgramPatient', 'mutation', variables);
    },
    updateProgramPatient(variables: UpdateProgramPatientMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateProgramPatientMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateProgramPatientMutation>(UpdateProgramPatientDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateProgramPatient', 'mutation', variables);
    },
    insertPatient(variables: InsertPatientMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertPatientMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertPatientMutation>(InsertPatientDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertPatient', 'mutation', variables);
    },
    updatePatient(variables: UpdatePatientMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdatePatientMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdatePatientMutation>(UpdatePatientDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updatePatient', 'mutation', variables);
    },
    latestPatientEncounter(variables: LatestPatientEncounterQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LatestPatientEncounterQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LatestPatientEncounterQuery>(LatestPatientEncounterDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'latestPatientEncounter', 'query', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;