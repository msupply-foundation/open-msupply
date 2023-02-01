import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type DocumentRegistryFragment = { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any };

export type DocumentFragment = { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null };

export type DocumentByNameQueryVariables = Types.Exact<{
  name: Types.Scalars['String'];
  storeId: Types.Scalars['String'];
}>;


export type DocumentByNameQuery = { __typename: 'Queries', document?: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } | null };

export type DocumentsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  page?: Types.InputMaybe<Types.PaginationInput>;
  filter?: Types.InputMaybe<Types.DocumentFilterInput>;
  sort?: Types.InputMaybe<Types.DocumentSortInput>;
}>;


export type DocumentsQuery = { __typename: 'Queries', documents: { __typename: 'DocumentConnector', nodes: Array<{ __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null }> } };

export type DocumentRegistriesQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.DocumentRegistryFilterInput>;
  sort?: Types.InputMaybe<Types.DocumentRegistrySortInput>;
}>;


export type DocumentRegistriesQuery = { __typename: 'Queries', documentRegistries: { __typename: 'DocumentRegistryConnector', totalCount: number, nodes: Array<{ __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any }> } };

export type DocumentRegistryWithChildrenFragment = { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any, children: Array<{ __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any }> };

export type DocumentRegistriesWithChildrenQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.DocumentRegistryFilterInput>;
  sort?: Types.InputMaybe<Types.DocumentRegistrySortInput>;
}>;


export type DocumentRegistriesWithChildrenQuery = { __typename: 'Queries', documentRegistries: { __typename: 'DocumentRegistryConnector', totalCount: number, nodes: Array<{ __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any, children: Array<{ __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any }> }> } };

export type GetDocumentHistoryQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  name: Types.Scalars['String'];
}>;


export type GetDocumentHistoryQuery = { __typename: 'Queries', documentHistory: { __typename: 'DocumentConnector', totalCount: number, nodes: Array<{ __typename: 'DocumentNode', author: string, data: any, id: string, name: string, parents: Array<string>, timestamp: string, type: string }> } };

export type AllocateProgramNumberMutationVariables = Types.Exact<{
  numberName: Types.Scalars['String'];
  storeId: Types.Scalars['String'];
}>;


export type AllocateProgramNumberMutation = { __typename: 'Mutations', allocateProgramNumber: { __typename: 'NumberNode', number: number } };

export type EncounterFieldsFragment = { __typename: 'EncounterFieldsNode', fields: Array<any>, encounter: { __typename: 'EncounterNode', name: string, startDatetime: string, endDatetime?: string | null } };

export type ProgramEventFragment = { __typename: 'ProgramEventNode', activeDatetime: string, type: string, data?: string | null };

export type EncounterFieldsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  patientId: Types.Scalars['String'];
  fields?: Types.InputMaybe<Array<Types.Scalars['String']> | Types.Scalars['String']>;
}>;


export type EncounterFieldsQuery = { __typename: 'Queries', encounterFields: { __typename: 'EncounterFieldsConnector', nodes: Array<{ __typename: 'EncounterFieldsNode', fields: Array<any>, encounter: { __typename: 'EncounterNode', name: string, startDatetime: string, endDatetime?: string | null } }> } };

export type EncounterDocumentRegistryFragment = { __typename: 'DocumentRegistryNode', context: Types.DocumentRegistryNodeContext, documentType: string, formSchemaId: string, id: string, jsonSchema: any, name?: string | null, parentId?: string | null, uiSchema: any, uiSchemaType: string, children: Array<{ __typename: 'DocumentRegistryNode', id: string }> };

export type EncounterFragment = { __typename: 'EncounterNode', id: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, program: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'NameNode', id: string, firstName?: string | null, lastName?: string | null, name: string }, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } };

export type EncountersWithDocumentQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key?: Types.InputMaybe<Types.EncounterSortFieldInput>;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.EncounterFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
}>;


export type EncountersWithDocumentQuery = { __typename: 'Queries', encounters: { __typename: 'EncounterConnector', totalCount: number, nodes: Array<{ __typename: 'EncounterNode', id: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, program: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'NameNode', id: string, firstName?: string | null, lastName?: string | null, name: string }, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } }> } };

export type EncounterByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  encounterId: Types.Scalars['String'];
}>;


export type EncounterByIdQuery = { __typename: 'Queries', encounters: { __typename: 'EncounterConnector', totalCount: number, nodes: Array<{ __typename: 'EncounterNode', id: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, program: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'NameNode', id: string, firstName?: string | null, lastName?: string | null, name: string }, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } }> } };

export type EncounterRowFragment = { __typename: 'EncounterNode', id: string, program: string, startDatetime: string, endDatetime?: string | null, status?: Types.EncounterNodeStatus | null, name: string, type: string, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null }, patient: { __typename: 'NameNode', id: string, firstName?: string | null, lastName?: string | null, name: string }, events: Array<{ __typename: 'ProgramEventNode', activeDatetime: string, type: string, data?: string | null }> };

export type EncountersQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key?: Types.InputMaybe<Types.EncounterSortFieldInput>;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.EncounterFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
  eventTime: Types.Scalars['String'];
}>;


export type EncountersQuery = { __typename: 'Queries', encounters: { __typename: 'EncounterConnector', totalCount: number, nodes: Array<{ __typename: 'EncounterNode', id: string, program: string, startDatetime: string, endDatetime?: string | null, status?: Types.EncounterNodeStatus | null, name: string, type: string, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null }, patient: { __typename: 'NameNode', id: string, firstName?: string | null, lastName?: string | null, name: string }, events: Array<{ __typename: 'ProgramEventNode', activeDatetime: string, type: string, data?: string | null }> }> } };

export type InsertEncounterMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.InsertEncounterInput;
}>;


export type InsertEncounterMutation = { __typename: 'Mutations', insertEncounter: { __typename: 'EncounterNode', id: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, program: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'NameNode', id: string, firstName?: string | null, lastName?: string | null, name: string }, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } } };

export type UpdateEncounterMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdateEncounterInput;
}>;


export type UpdateEncounterMutation = { __typename: 'Mutations', updateEncounter: { __typename: 'EncounterNode', id: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, program: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'NameNode', id: string, firstName?: string | null, lastName?: string | null, name: string }, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } } };

export type ProgramEnrolmentRowFragment = { __typename: 'ProgramEnrolmentNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, name?: string | null } | null }, events: Array<{ __typename: 'ProgramEventNode', activeDatetime: string, type: string, data?: string | null }> };

export type ProgramEnrolmentsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key: Types.ProgramEnrolmentSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.ProgramEnrolmentFilterInput>;
  eventTime: Types.Scalars['String'];
}>;


export type ProgramEnrolmentsQuery = { __typename: 'Queries', programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, name?: string | null } | null }, events: Array<{ __typename: 'ProgramEventNode', activeDatetime: string, type: string, data?: string | null }> }> } };

export type ProgramEnrolmentFragment = { __typename: 'ProgramEnrolmentNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } };

export type ProgramEnrolmentByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  programId: Types.Scalars['String'];
}>;


export type ProgramEnrolmentByIdQuery = { __typename: 'Queries', programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } }> } };

export type InsertProgramEnrolmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.InsertProgramEnrolmentInput;
}>;


export type InsertProgramEnrolmentMutation = { __typename: 'Mutations', insertProgramEnrolment: { __typename: 'ProgramEnrolmentNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } } };

export type UpdateProgramEnrolmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdateProgramEnrolmentInput;
}>;


export type UpdateProgramEnrolmentMutation = { __typename: 'Mutations', updateProgramEnrolment: { __typename: 'ProgramEnrolmentNode', type: string, programPatientId?: string | null, patientId: string, name: string, enrolmentDatetime: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, author: string, timestamp: string, type: string, data: any, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, documentType: string, context: Types.DocumentRegistryNodeContext, name?: string | null, parentId?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } } };

export type ClinicianFragment = { __typename: 'ClinicianNode', address1?: string | null, address2?: string | null, code: string, email?: string | null, firstName?: string | null, id: string, initials: string, isFemale: boolean, lastName: string, mobile?: string | null, phone?: string | null };

export type CliniciansQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key: Types.ClinicianSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.ClinicianFilterInput>;
}>;


export type CliniciansQuery = { __typename: 'Queries', clinicians: { __typename: 'ClinicianConnector', totalCount: number, nodes: Array<{ __typename: 'ClinicianNode', address1?: string | null, address2?: string | null, code: string, email?: string | null, firstName?: string | null, id: string, initials: string, isFemale: boolean, lastName: string, mobile?: string | null, phone?: string | null }> } };

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
export const DocumentRegistryWithChildrenFragmentDoc = gql`
    fragment DocumentRegistryWithChildren on DocumentRegistryNode {
  ...DocumentRegistry
  children {
    ...DocumentRegistry
  }
}
    ${DocumentRegistryFragmentDoc}`;
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
    ...DocumentRegistry
  }
}
    ${DocumentRegistryFragmentDoc}`;
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
    ...Document
  }
}
    ${DocumentFragmentDoc}`;
export const ProgramEventFragmentDoc = gql`
    fragment ProgramEvent on ProgramEventNode {
  activeDatetime
  type
  data
}
    `;
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
  events(at: $eventTime) {
    ...ProgramEvent
  }
}
    ${ProgramEventFragmentDoc}`;
export const ProgramEnrolmentRowFragmentDoc = gql`
    fragment ProgramEnrolmentRow on ProgramEnrolmentNode {
  type
  programPatientId
  patientId
  name
  enrolmentDatetime
  document {
    documentRegistry {
      id
      name
    }
  }
  events(at: $eventTime) {
    ...ProgramEvent
  }
}
    ${ProgramEventFragmentDoc}`;
export const ProgramEnrolmentFragmentDoc = gql`
    fragment ProgramEnrolment on ProgramEnrolmentNode {
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
export const ClinicianFragmentDoc = gql`
    fragment Clinician on ClinicianNode {
  address1
  address2
  code
  email
  firstName
  id
  initials
  isFemale
  lastName
  mobile
  phone
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
export const DocumentsDocument = gql`
    query documents($storeId: String!, $page: PaginationInput, $filter: DocumentFilterInput, $sort: DocumentSortInput) {
  documents(storeId: $storeId, page: $page, filter: $filter, sort: $sort) {
    __typename
    ... on DocumentConnector {
      nodes {
        ...Document
      }
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
        ...DocumentRegistry
      }
      totalCount
    }
  }
}
    ${DocumentRegistryFragmentDoc}`;
export const DocumentRegistriesWithChildrenDocument = gql`
    query documentRegistriesWithChildren($filter: DocumentRegistryFilterInput, $sort: DocumentRegistrySortInput) {
  documentRegistries(sort: $sort, filter: $filter) {
    ... on DocumentRegistryConnector {
      __typename
      totalCount
      nodes {
        __typename
        ...DocumentRegistryWithChildren
      }
    }
  }
}
    ${DocumentRegistryWithChildrenFragmentDoc}`;
export const GetDocumentHistoryDocument = gql`
    query getDocumentHistory($storeId: String!, $name: String!) {
  documentHistory(storeId: $storeId, name: $name) {
    __typename
    ... on DocumentConnector {
      totalCount
      nodes {
        __typename
        author
        data
        id
        name
        parents
        timestamp
        type
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
export const EncountersWithDocumentDocument = gql`
    query encountersWithDocument($storeId: String!, $key: EncounterSortFieldInput, $desc: Boolean, $filter: EncounterFilterInput, $page: PaginationInput) {
  encounters(
    storeId: $storeId
    sort: {key: $key, desc: $desc}
    filter: $filter
    page: $page
  ) {
    ... on EncounterConnector {
      __typename
      nodes {
        __typename
        ...Encounter
      }
      totalCount
    }
  }
}
    ${EncounterFragmentDoc}`;
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
export const EncountersDocument = gql`
    query encounters($storeId: String!, $key: EncounterSortFieldInput, $desc: Boolean, $filter: EncounterFilterInput, $page: PaginationInput, $eventTime: String!) {
  encounters(
    storeId: $storeId
    sort: {key: $key, desc: $desc}
    filter: $filter
    page: $page
  ) {
    ... on EncounterConnector {
      __typename
      nodes {
        __typename
        ...EncounterRow
      }
      totalCount
    }
  }
}
    ${EncounterRowFragmentDoc}`;
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
export const ProgramEnrolmentsDocument = gql`
    query programEnrolments($storeId: String!, $key: ProgramEnrolmentSortFieldInput!, $desc: Boolean, $filter: ProgramEnrolmentFilterInput, $eventTime: String!) {
  programEnrolments(
    storeId: $storeId
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on ProgramEnrolmentConnector {
      __typename
      nodes {
        ...ProgramEnrolmentRow
      }
      totalCount
    }
  }
}
    ${ProgramEnrolmentRowFragmentDoc}`;
export const ProgramEnrolmentByIdDocument = gql`
    query programEnrolmentById($storeId: String!, $programId: String!) {
  programEnrolments(storeId: $storeId, filter: {id: {equalTo: $programId}}) {
    ... on ProgramEnrolmentConnector {
      __typename
      nodes {
        ...ProgramEnrolment
      }
      totalCount
    }
  }
}
    ${ProgramEnrolmentFragmentDoc}`;
export const InsertProgramEnrolmentDocument = gql`
    mutation insertProgramEnrolment($storeId: String!, $input: InsertProgramEnrolmentInput!) {
  insertProgramEnrolment(storeId: $storeId, input: $input) {
    ... on ProgramEnrolmentNode {
      __typename
      ...ProgramEnrolment
    }
  }
}
    ${ProgramEnrolmentFragmentDoc}`;
export const UpdateProgramEnrolmentDocument = gql`
    mutation updateProgramEnrolment($storeId: String!, $input: UpdateProgramEnrolmentInput!) {
  updateProgramEnrolment(storeId: $storeId, input: $input) {
    ... on ProgramEnrolmentNode {
      __typename
      ...ProgramEnrolment
    }
  }
}
    ${ProgramEnrolmentFragmentDoc}`;
export const CliniciansDocument = gql`
    query clinicians($storeId: String!, $key: ClinicianSortFieldInput!, $desc: Boolean, $filter: ClinicianFilterInput) {
  clinicians(storeId: $storeId, sort: {key: $key, desc: $desc}, filter: $filter) {
    __typename
    ... on ClinicianConnector {
      nodes {
        __typename
        ...Clinician
      }
      totalCount
    }
  }
}
    ${ClinicianFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    documentByName(variables: DocumentByNameQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DocumentByNameQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DocumentByNameQuery>(DocumentByNameDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'documentByName', 'query');
    },
    documents(variables: DocumentsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DocumentsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DocumentsQuery>(DocumentsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'documents', 'query');
    },
    documentRegistries(variables?: DocumentRegistriesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DocumentRegistriesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DocumentRegistriesQuery>(DocumentRegistriesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'documentRegistries', 'query');
    },
    documentRegistriesWithChildren(variables?: DocumentRegistriesWithChildrenQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DocumentRegistriesWithChildrenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DocumentRegistriesWithChildrenQuery>(DocumentRegistriesWithChildrenDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'documentRegistriesWithChildren', 'query');
    },
    getDocumentHistory(variables: GetDocumentHistoryQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<GetDocumentHistoryQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetDocumentHistoryQuery>(GetDocumentHistoryDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getDocumentHistory', 'query');
    },
    allocateProgramNumber(variables: AllocateProgramNumberMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<AllocateProgramNumberMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<AllocateProgramNumberMutation>(AllocateProgramNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'allocateProgramNumber', 'mutation');
    },
    encounterFields(variables: EncounterFieldsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<EncounterFieldsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EncounterFieldsQuery>(EncounterFieldsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'encounterFields', 'query');
    },
    encountersWithDocument(variables: EncountersWithDocumentQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<EncountersWithDocumentQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EncountersWithDocumentQuery>(EncountersWithDocumentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'encountersWithDocument', 'query');
    },
    encounterById(variables: EncounterByIdQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<EncounterByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EncounterByIdQuery>(EncounterByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'encounterById', 'query');
    },
    encounters(variables: EncountersQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<EncountersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EncountersQuery>(EncountersDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'encounters', 'query');
    },
    insertEncounter(variables: InsertEncounterMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertEncounterMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertEncounterMutation>(InsertEncounterDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertEncounter', 'mutation');
    },
    updateEncounter(variables: UpdateEncounterMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateEncounterMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateEncounterMutation>(UpdateEncounterDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateEncounter', 'mutation');
    },
    programEnrolments(variables: ProgramEnrolmentsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ProgramEnrolmentsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramEnrolmentsQuery>(ProgramEnrolmentsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programEnrolments', 'query');
    },
    programEnrolmentById(variables: ProgramEnrolmentByIdQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ProgramEnrolmentByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramEnrolmentByIdQuery>(ProgramEnrolmentByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programEnrolmentById', 'query');
    },
    insertProgramEnrolment(variables: InsertProgramEnrolmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertProgramEnrolmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertProgramEnrolmentMutation>(InsertProgramEnrolmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertProgramEnrolment', 'mutation');
    },
    updateProgramEnrolment(variables: UpdateProgramEnrolmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateProgramEnrolmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateProgramEnrolmentMutation>(UpdateProgramEnrolmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateProgramEnrolment', 'mutation');
    },
    clinicians(variables: CliniciansQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<CliniciansQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<CliniciansQuery>(CliniciansDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'clinicians', 'query');
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
 * mockDocumentsQuery((req, res, ctx) => {
 *   const { storeId, page, filter, sort } = req.variables;
 *   return res(
 *     ctx.data({ documents })
 *   )
 * })
 */
export const mockDocumentsQuery = (resolver: ResponseResolver<GraphQLRequest<DocumentsQueryVariables>, GraphQLContext<DocumentsQuery>, any>) =>
  graphql.query<DocumentsQuery, DocumentsQueryVariables>(
    'documents',
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
 * mockDocumentRegistriesWithChildrenQuery((req, res, ctx) => {
 *   const { filter, sort } = req.variables;
 *   return res(
 *     ctx.data({ documentRegistries })
 *   )
 * })
 */
export const mockDocumentRegistriesWithChildrenQuery = (resolver: ResponseResolver<GraphQLRequest<DocumentRegistriesWithChildrenQueryVariables>, GraphQLContext<DocumentRegistriesWithChildrenQuery>, any>) =>
  graphql.query<DocumentRegistriesWithChildrenQuery, DocumentRegistriesWithChildrenQueryVariables>(
    'documentRegistriesWithChildren',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockGetDocumentHistoryQuery((req, res, ctx) => {
 *   const { storeId, name } = req.variables;
 *   return res(
 *     ctx.data({ documentHistory })
 *   )
 * })
 */
export const mockGetDocumentHistoryQuery = (resolver: ResponseResolver<GraphQLRequest<GetDocumentHistoryQueryVariables>, GraphQLContext<GetDocumentHistoryQuery>, any>) =>
  graphql.query<GetDocumentHistoryQuery, GetDocumentHistoryQueryVariables>(
    'getDocumentHistory',
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

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockEncountersWithDocumentQuery((req, res, ctx) => {
 *   const { storeId, key, desc, filter, page } = req.variables;
 *   return res(
 *     ctx.data({ encounters })
 *   )
 * })
 */
export const mockEncountersWithDocumentQuery = (resolver: ResponseResolver<GraphQLRequest<EncountersWithDocumentQueryVariables>, GraphQLContext<EncountersWithDocumentQuery>, any>) =>
  graphql.query<EncountersWithDocumentQuery, EncountersWithDocumentQueryVariables>(
    'encountersWithDocument',
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
 * mockEncountersQuery((req, res, ctx) => {
 *   const { storeId, key, desc, filter, page, eventTime } = req.variables;
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

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockProgramEnrolmentsQuery((req, res, ctx) => {
 *   const { storeId, key, desc, filter, eventTime } = req.variables;
 *   return res(
 *     ctx.data({ programEnrolments })
 *   )
 * })
 */
export const mockProgramEnrolmentsQuery = (resolver: ResponseResolver<GraphQLRequest<ProgramEnrolmentsQueryVariables>, GraphQLContext<ProgramEnrolmentsQuery>, any>) =>
  graphql.query<ProgramEnrolmentsQuery, ProgramEnrolmentsQueryVariables>(
    'programEnrolments',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockProgramEnrolmentByIdQuery((req, res, ctx) => {
 *   const { storeId, programId } = req.variables;
 *   return res(
 *     ctx.data({ programEnrolments })
 *   )
 * })
 */
export const mockProgramEnrolmentByIdQuery = (resolver: ResponseResolver<GraphQLRequest<ProgramEnrolmentByIdQueryVariables>, GraphQLContext<ProgramEnrolmentByIdQuery>, any>) =>
  graphql.query<ProgramEnrolmentByIdQuery, ProgramEnrolmentByIdQueryVariables>(
    'programEnrolmentById',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertProgramEnrolmentMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertProgramEnrolment })
 *   )
 * })
 */
export const mockInsertProgramEnrolmentMutation = (resolver: ResponseResolver<GraphQLRequest<InsertProgramEnrolmentMutationVariables>, GraphQLContext<InsertProgramEnrolmentMutation>, any>) =>
  graphql.mutation<InsertProgramEnrolmentMutation, InsertProgramEnrolmentMutationVariables>(
    'insertProgramEnrolment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateProgramEnrolmentMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updateProgramEnrolment })
 *   )
 * })
 */
export const mockUpdateProgramEnrolmentMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateProgramEnrolmentMutationVariables>, GraphQLContext<UpdateProgramEnrolmentMutation>, any>) =>
  graphql.mutation<UpdateProgramEnrolmentMutation, UpdateProgramEnrolmentMutationVariables>(
    'updateProgramEnrolment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockCliniciansQuery((req, res, ctx) => {
 *   const { storeId, key, desc, filter } = req.variables;
 *   return res(
 *     ctx.data({ clinicians })
 *   )
 * })
 */
export const mockCliniciansQuery = (resolver: ResponseResolver<GraphQLRequest<CliniciansQueryVariables>, GraphQLContext<CliniciansQuery>, any>) =>
  graphql.query<CliniciansQuery, CliniciansQueryVariables>(
    'clinicians',
    resolver
  )
