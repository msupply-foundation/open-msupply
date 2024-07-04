import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
export type DocumentRegistryFragment = { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any };

export type DocumentFragment = { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null };

export type DocumentByNameQueryVariables = Types.Exact<{
  name: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type DocumentByNameQuery = { __typename: 'Queries', document?: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } | null };

export type DocumentsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  page?: Types.InputMaybe<Types.PaginationInput>;
  filter?: Types.InputMaybe<Types.DocumentFilterInput>;
  sort?: Types.InputMaybe<Types.DocumentSortInput>;
}>;


export type DocumentsQuery = { __typename: 'Queries', documents: { __typename: 'DocumentConnector', nodes: Array<{ __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null }> } };

export type DocumentRegistriesQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.DocumentRegistryFilterInput>;
  sort?: Types.InputMaybe<Types.DocumentRegistrySortInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type DocumentRegistriesQuery = { __typename: 'Queries', documentRegistries: { __typename: 'DocumentRegistryConnector', totalCount: number, nodes: Array<{ __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any }> } };

export type GetDocumentHistoryQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  name: Types.Scalars['String']['input'];
}>;


export type GetDocumentHistoryQuery = { __typename: 'Queries', documentHistory: { __typename: 'DocumentConnector', totalCount: number, nodes: Array<{ __typename: 'DocumentNode', data: any, id: string, name: string, parents: Array<string>, timestamp: string, type: string, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null }> } };

export type AllocateProgramNumberMutationVariables = Types.Exact<{
  numberName: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type AllocateProgramNumberMutation = { __typename: 'Mutations', allocateProgramNumber: { __typename: 'NumberNode', number: number } };

export type EncounterFieldsFragment = { __typename: 'EncounterFieldsNode', fields: Array<any>, encounter: { __typename: 'EncounterNode', name: string, startDatetime: string, endDatetime?: string | null } };

export type ProgramEventFragment = { __typename: 'ProgramEventNode', activeStartDatetime: string, type: string, data?: string | null, documentName?: string | null };

export type EncounterFieldsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  patientId: Types.Scalars['String']['input'];
  fields?: Types.InputMaybe<Array<Types.Scalars['String']['input']> | Types.Scalars['String']['input']>;
}>;


export type EncounterFieldsQuery = { __typename: 'Queries', encounterFields: { __typename: 'EncounterFieldsConnector', nodes: Array<{ __typename: 'EncounterFieldsNode', fields: Array<any>, encounter: { __typename: 'EncounterNode', name: string, startDatetime: string, endDatetime?: string | null } }> } };

export type EncounterDocumentRegistryFragment = { __typename: 'DocumentRegistryNode', category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, formSchemaId: string, id: string, jsonSchema: any, name?: string | null, uiSchema: any, uiSchemaType: string };

export type EncounterFragment = { __typename: 'EncounterNode', id: string, contextId: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, createdDatetime: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'PatientNode', id: string, firstName?: string | null, lastName?: string | null, code: string, code2?: string | null, name: string, dateOfBirth?: string | null }, clinician?: { __typename: 'ClinicianNode', id: string, firstName?: string | null, lastName: string } | null, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } };

export type EncountersWithDocumentQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  key?: Types.InputMaybe<Types.EncounterSortFieldInput>;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.EncounterFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
}>;


export type EncountersWithDocumentQuery = { __typename: 'Queries', encounters: { __typename: 'EncounterConnector', totalCount: number, nodes: Array<{ __typename: 'EncounterNode', id: string, contextId: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, createdDatetime: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'PatientNode', id: string, firstName?: string | null, lastName?: string | null, code: string, code2?: string | null, name: string, dateOfBirth?: string | null }, clinician?: { __typename: 'ClinicianNode', id: string, firstName?: string | null, lastName: string } | null, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } }> } };

export type EncounterByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  encounterId: Types.Scalars['String']['input'];
}>;


export type EncounterByIdQuery = { __typename: 'Queries', encounters: { __typename: 'EncounterConnector', totalCount: number, nodes: Array<{ __typename: 'EncounterNode', id: string, contextId: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, createdDatetime: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'PatientNode', id: string, firstName?: string | null, lastName?: string | null, code: string, code2?: string | null, name: string, dateOfBirth?: string | null }, clinician?: { __typename: 'ClinicianNode', id: string, firstName?: string | null, lastName: string } | null, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } }> } };

export type EncounterByDocNameQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  documentName: Types.Scalars['String']['input'];
}>;


export type EncounterByDocNameQuery = { __typename: 'Queries', encounters: { __typename: 'EncounterConnector', totalCount: number, nodes: Array<{ __typename: 'EncounterNode', id: string, contextId: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, createdDatetime: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'PatientNode', id: string, firstName?: string | null, lastName?: string | null, code: string, code2?: string | null, name: string, dateOfBirth?: string | null }, clinician?: { __typename: 'ClinicianNode', id: string, firstName?: string | null, lastName: string } | null, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } }> } };

export type EncounterRowFragment = { __typename: 'EncounterNode', id: string, contextId: string, startDatetime: string, endDatetime?: string | null, status?: Types.EncounterNodeStatus | null, name: string, type: string, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null }, patient: { __typename: 'PatientNode', id: string, firstName?: string | null, lastName?: string | null, name: string }, activeProgramEvents: { __typename: 'ProgramEventConnector', nodes: Array<{ __typename: 'ProgramEventNode', activeStartDatetime: string, type: string, data?: string | null, documentName?: string | null }> } };

export type EncountersQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  key?: Types.InputMaybe<Types.EncounterSortFieldInput>;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.EncounterFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
  eventTime: Types.Scalars['String']['input'];
}>;


export type EncountersQuery = { __typename: 'Queries', encounters: { __typename: 'EncounterConnector', totalCount: number, nodes: Array<{ __typename: 'EncounterNode', id: string, contextId: string, startDatetime: string, endDatetime?: string | null, status?: Types.EncounterNodeStatus | null, name: string, type: string, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', name?: string | null } | null }, patient: { __typename: 'PatientNode', id: string, firstName?: string | null, lastName?: string | null, name: string }, activeProgramEvents: { __typename: 'ProgramEventConnector', nodes: Array<{ __typename: 'ProgramEventNode', activeStartDatetime: string, type: string, data?: string | null, documentName?: string | null }> } }> } };

export type InsertEncounterMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertEncounterInput;
}>;


export type InsertEncounterMutation = { __typename: 'Mutations', insertEncounter: { __typename: 'EncounterNode', id: string, contextId: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, createdDatetime: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'PatientNode', id: string, firstName?: string | null, lastName?: string | null, code: string, code2?: string | null, name: string, dateOfBirth?: string | null }, clinician?: { __typename: 'ClinicianNode', id: string, firstName?: string | null, lastName: string } | null, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } } };

export type UpdateEncounterMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateEncounterInput;
}>;


export type UpdateEncounterMutation = { __typename: 'Mutations', updateEncounter: { __typename: 'EncounterNode', id: string, contextId: string, type: string, name: string, status?: Types.EncounterNodeStatus | null, createdDatetime: string, startDatetime: string, endDatetime?: string | null, patient: { __typename: 'PatientNode', id: string, firstName?: string | null, lastName?: string | null, code: string, code2?: string | null, name: string, dateOfBirth?: string | null }, clinician?: { __typename: 'ClinicianNode', id: string, firstName?: string | null, lastName: string } | null, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } } };

export type ProgramEnrolmentRowFragment = { __typename: 'ProgramEnrolmentNode', type: string, programEnrolmentId?: string | null, patientId: string, contextId: string, name: string, enrolmentDatetime: string, status?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, name?: string | null } | null }, activeProgramEvents: { __typename: 'ProgramEventConnector', nodes: Array<{ __typename: 'ProgramEventNode', activeStartDatetime: string, type: string, data?: string | null, documentName?: string | null }> } };

export type ProgramEnrolmentsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  key: Types.ProgramEnrolmentSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ProgramEnrolmentFilterInput>;
  eventTime: Types.Scalars['String']['input'];
}>;


export type ProgramEnrolmentsQuery = { __typename: 'Queries', programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', type: string, programEnrolmentId?: string | null, patientId: string, contextId: string, name: string, enrolmentDatetime: string, status?: string | null, document: { __typename: 'DocumentNode', documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, name?: string | null } | null }, activeProgramEvents: { __typename: 'ProgramEventConnector', nodes: Array<{ __typename: 'ProgramEventNode', activeStartDatetime: string, type: string, data?: string | null, documentName?: string | null }> } }> } };

export type ProgramEnrolmentFragment = { __typename: 'ProgramEnrolmentNode', type: string, programEnrolmentId?: string | null, patientId: string, name: string, enrolmentDatetime: string, status?: string | null, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } };

export type ProgramEnrolmentByDocNameQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  documentName: Types.Scalars['String']['input'];
}>;


export type ProgramEnrolmentByDocNameQuery = { __typename: 'Queries', programEnrolments: { __typename: 'ProgramEnrolmentConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEnrolmentNode', type: string, programEnrolmentId?: string | null, patientId: string, name: string, enrolmentDatetime: string, status?: string | null, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } }> } };

export type InsertProgramEnrolmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertProgramEnrolmentInput;
}>;


export type InsertProgramEnrolmentMutation = { __typename: 'Mutations', insertProgramEnrolment: { __typename: 'ProgramEnrolmentNode', type: string, programEnrolmentId?: string | null, patientId: string, name: string, enrolmentDatetime: string, status?: string | null, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } } };

export type UpdateProgramEnrolmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateProgramEnrolmentInput;
}>;


export type UpdateProgramEnrolmentMutation = { __typename: 'Mutations', updateProgramEnrolment: { __typename: 'ProgramEnrolmentNode', type: string, programEnrolmentId?: string | null, patientId: string, name: string, enrolmentDatetime: string, status?: string | null, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } } };

export type ClinicianFragment = { __typename: 'ClinicianNode', address1?: string | null, address2?: string | null, code: string, email?: string | null, firstName?: string | null, id: string, initials: string, gender?: Types.GenderType | null, lastName: string, mobile?: string | null, phone?: string | null };

export type CliniciansQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  key: Types.ClinicianSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ClinicianFilterInput>;
}>;


export type CliniciansQuery = { __typename: 'Queries', clinicians: { __typename: 'ClinicianConnector', totalCount: number, nodes: Array<{ __typename: 'ClinicianNode', address1?: string | null, address2?: string | null, code: string, email?: string | null, firstName?: string | null, id: string, initials: string, gender?: Types.GenderType | null, lastName: string, mobile?: string | null, phone?: string | null }> } };

export type FormSchemaFragment = { __typename: 'FormSchemaNode', id: string, jsonSchema: any, type: string, uiSchema: any };

export type FormSchemasQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.FormSchemaFilterInput>;
}>;


export type FormSchemasQuery = { __typename: 'Queries', formSchemas: { __typename: 'FormSchemaConnector', nodes: Array<{ __typename: 'FormSchemaNode', id: string, jsonSchema: any, type: string, uiSchema: any }> } };

export type ActiveProgramEventsQueryVariables = Types.Exact<{
  at?: Types.InputMaybe<Types.Scalars['String']['input']>;
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.ProgramEventFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
}>;


export type ActiveProgramEventsQuery = { __typename: 'Queries', activeProgramEvents: { __typename: 'ProgramEventConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramEventNode', activeStartDatetime: string, type: string, data?: string | null, documentName?: string | null }> } };

export type ContactTraceRowFragment = { __typename: 'ContactTraceNode', contactTraceId?: string | null, storeId?: string | null, datetime: string, documentId: string, id: string, firstName?: string | null, lastName?: string | null, gender?: Types.GenderType | null, dateOfBirth?: string | null, age?: number | null, patientId: string, relationship?: string | null, document: { __typename: 'DocumentNode', name: string, type: string, id: string }, patient: { __typename: 'PatientNode', id: string, name: string, firstName?: string | null, lastName?: string | null }, contactPatient?: { __typename: 'PatientNode', id: string, name: string, firstName?: string | null, lastName?: string | null } | null, program: { __typename: 'ProgramNode', id: string, name: string } };

export type ContactTracesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  key?: Types.InputMaybe<Types.ContactTraceSortFieldInput>;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ContactTraceFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
}>;


export type ContactTracesQuery = { __typename: 'Queries', contactTraces: { __typename: 'ContactTraceConnector', totalCount: number, nodes: Array<{ __typename: 'ContactTraceNode', contactTraceId?: string | null, storeId?: string | null, datetime: string, documentId: string, id: string, firstName?: string | null, lastName?: string | null, gender?: Types.GenderType | null, dateOfBirth?: string | null, age?: number | null, patientId: string, relationship?: string | null, document: { __typename: 'DocumentNode', name: string, type: string, id: string }, patient: { __typename: 'PatientNode', id: string, name: string, firstName?: string | null, lastName?: string | null }, contactPatient?: { __typename: 'PatientNode', id: string, name: string, firstName?: string | null, lastName?: string | null } | null, program: { __typename: 'ProgramNode', id: string, name: string } }> } };

export type ContactTraceFragment = { __typename: 'ContactTraceNode', id: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } };

export type InsertContactTraceMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertContactTraceInput;
}>;


export type InsertContactTraceMutation = { __typename: 'Mutations', insertContactTrace: { __typename: 'ContactTraceNode', id: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } } };

export type UpdateContactTraceMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateContactTraceInput;
}>;


export type UpdateContactTraceMutation = { __typename: 'Mutations', updateContactTrace: { __typename: 'ContactTraceNode', id: string, document: { __typename: 'DocumentNode', id: string, name: string, parents: Array<string>, timestamp: string, type: string, data: any, user?: { __typename: 'UserNode', userId: string, username: string, email?: string | null } | null, documentRegistry?: { __typename: 'DocumentRegistryNode', id: string, category: Types.DocumentRegistryCategoryNode, documentType: string, contextId: string, name?: string | null, formSchemaId: string, jsonSchema: any, uiSchemaType: string, uiSchema: any } | null } } };

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
  category
  documentType
  contextId
  formSchemaId
  id
  jsonSchema
  name
  uiSchema
  uiSchemaType
}
    `;
export const DocumentRegistryFragmentDoc = gql`
    fragment DocumentRegistry on DocumentRegistryNode {
  __typename
  id
  category
  documentType
  contextId
  name
  formSchemaId
  jsonSchema
  uiSchemaType
  uiSchema
}
    `;
export const DocumentFragmentDoc = gql`
    fragment Document on DocumentNode {
  id
  name
  parents
  user {
    userId
    username
    email
  }
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
  contextId
  type
  name
  status
  patient {
    id
    firstName
    lastName
    code
    code2
    name
    dateOfBirth
  }
  clinician {
    id
    firstName
    lastName
  }
  createdDatetime
  startDatetime
  endDatetime
  document {
    ...Document
  }
}
    ${DocumentFragmentDoc}`;
export const ProgramEventFragmentDoc = gql`
    fragment ProgramEvent on ProgramEventNode {
  activeStartDatetime
  type
  data
  documentName
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
  contextId
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
  activeProgramEvents(at: $eventTime, filter: {isCurrentEncounter: true}) {
    ... on ProgramEventConnector {
      nodes {
        __typename
        ...ProgramEvent
      }
    }
  }
}
    ${ProgramEventFragmentDoc}`;
export const ProgramEnrolmentRowFragmentDoc = gql`
    fragment ProgramEnrolmentRow on ProgramEnrolmentNode {
  type
  programEnrolmentId
  patientId
  contextId
  name
  enrolmentDatetime
  status
  document {
    documentRegistry {
      id
      name
    }
  }
  activeProgramEvents(at: $eventTime) {
    ... on ProgramEventConnector {
      nodes {
        __typename
        ...ProgramEvent
      }
    }
  }
}
    ${ProgramEventFragmentDoc}`;
export const ProgramEnrolmentFragmentDoc = gql`
    fragment ProgramEnrolment on ProgramEnrolmentNode {
  type
  programEnrolmentId
  patientId
  name
  enrolmentDatetime
  status
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
  gender
  lastName
  mobile
  phone
}
    `;
export const FormSchemaFragmentDoc = gql`
    fragment FormSchema on FormSchemaNode {
  id
  jsonSchema
  type
  uiSchema
}
    `;
export const ContactTraceRowFragmentDoc = gql`
    fragment ContactTraceRow on ContactTraceNode {
  __typename
  contactTraceId
  storeId
  datetime
  document {
    name
    type
    id
  }
  documentId
  id
  firstName
  lastName
  gender
  dateOfBirth
  age
  patientId
  relationship
  patient {
    id
    name
    firstName
    lastName
  }
  contactPatient {
    id
    name
    firstName
    lastName
  }
  program {
    id
    name
  }
}
    `;
export const ContactTraceFragmentDoc = gql`
    fragment ContactTrace on ContactTraceNode {
  id
  document {
    ...Document
  }
}
    ${DocumentFragmentDoc}`;
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
    query documentRegistries($filter: DocumentRegistryFilterInput, $sort: DocumentRegistrySortInput, $storeId: String!) {
  documentRegistries(filter: $filter, sort: $sort, storeId: $storeId) {
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
export const GetDocumentHistoryDocument = gql`
    query getDocumentHistory($storeId: String!, $name: String!) {
  documentHistory(storeId: $storeId, name: $name) {
    __typename
    ... on DocumentConnector {
      totalCount
      nodes {
        __typename
        user {
          userId
          username
          email
        }
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
  encounters(
    storeId: $storeId
    filter: {id: {equalTo: $encounterId}, includeDeleted: true}
  ) {
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
export const EncounterByDocNameDocument = gql`
    query encounterByDocName($storeId: String!, $documentName: String!) {
  encounters(storeId: $storeId, filter: {documentName: {equalTo: $documentName}}) {
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
export const ProgramEnrolmentByDocNameDocument = gql`
    query programEnrolmentByDocName($storeId: String!, $documentName: String!) {
  programEnrolments(
    storeId: $storeId
    filter: {documentName: {equalTo: $documentName}}
  ) {
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
    ... on ClinicianConnector {
      __typename
      nodes {
        __typename
        ...Clinician
      }
      totalCount
    }
  }
}
    ${ClinicianFragmentDoc}`;
export const FormSchemasDocument = gql`
    query formSchemas($filter: FormSchemaFilterInput) {
  formSchemas(filter: $filter) {
    ... on FormSchemaConnector {
      __typename
      nodes {
        __typename
        ...FormSchema
      }
    }
  }
}
    ${FormSchemaFragmentDoc}`;
export const ActiveProgramEventsDocument = gql`
    query activeProgramEvents($at: String, $storeId: String!, $filter: ProgramEventFilterInput, $page: PaginationInput) {
  activeProgramEvents(at: $at, storeId: $storeId, filter: $filter, page: $page) {
    ... on ProgramEventConnector {
      __typename
      totalCount
      nodes {
        __typename
        ...ProgramEvent
      }
    }
  }
}
    ${ProgramEventFragmentDoc}`;
export const ContactTracesDocument = gql`
    query contactTraces($storeId: String!, $key: ContactTraceSortFieldInput, $desc: Boolean, $filter: ContactTraceFilterInput, $page: PaginationInput) {
  contactTraces(
    storeId: $storeId
    filter: $filter
    sort: {key: $key, desc: $desc}
    page: $page
  ) {
    ... on ContactTraceConnector {
      nodes {
        ...ContactTraceRow
      }
      totalCount
    }
  }
}
    ${ContactTraceRowFragmentDoc}`;
export const InsertContactTraceDocument = gql`
    mutation insertContactTrace($storeId: String!, $input: InsertContactTraceInput!) {
  insertContactTrace(storeId: $storeId, input: $input) {
    ... on ContactTraceNode {
      __typename
      ...ContactTrace
    }
  }
}
    ${ContactTraceFragmentDoc}`;
export const UpdateContactTraceDocument = gql`
    mutation updateContactTrace($storeId: String!, $input: UpdateContactTraceInput!) {
  updateContactTrace(storeId: $storeId, input: $input) {
    ... on ContactTraceNode {
      __typename
      ...ContactTrace
    }
  }
}
    ${ContactTraceFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    documentByName(variables: DocumentByNameQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DocumentByNameQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DocumentByNameQuery>(DocumentByNameDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'documentByName', 'query');
    },
    documents(variables: DocumentsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DocumentsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DocumentsQuery>(DocumentsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'documents', 'query');
    },
    documentRegistries(variables: DocumentRegistriesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DocumentRegistriesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DocumentRegistriesQuery>(DocumentRegistriesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'documentRegistries', 'query');
    },
    getDocumentHistory(variables: GetDocumentHistoryQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<GetDocumentHistoryQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<GetDocumentHistoryQuery>(GetDocumentHistoryDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'getDocumentHistory', 'query');
    },
    allocateProgramNumber(variables: AllocateProgramNumberMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<AllocateProgramNumberMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<AllocateProgramNumberMutation>(AllocateProgramNumberDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'allocateProgramNumber', 'mutation');
    },
    encounterFields(variables: EncounterFieldsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<EncounterFieldsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EncounterFieldsQuery>(EncounterFieldsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'encounterFields', 'query');
    },
    encountersWithDocument(variables: EncountersWithDocumentQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<EncountersWithDocumentQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EncountersWithDocumentQuery>(EncountersWithDocumentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'encountersWithDocument', 'query');
    },
    encounterById(variables: EncounterByIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<EncounterByIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EncounterByIdQuery>(EncounterByIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'encounterById', 'query');
    },
    encounterByDocName(variables: EncounterByDocNameQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<EncounterByDocNameQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EncounterByDocNameQuery>(EncounterByDocNameDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'encounterByDocName', 'query');
    },
    encounters(variables: EncountersQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<EncountersQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EncountersQuery>(EncountersDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'encounters', 'query');
    },
    insertEncounter(variables: InsertEncounterMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertEncounterMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertEncounterMutation>(InsertEncounterDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertEncounter', 'mutation');
    },
    updateEncounter(variables: UpdateEncounterMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateEncounterMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateEncounterMutation>(UpdateEncounterDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateEncounter', 'mutation');
    },
    programEnrolments(variables: ProgramEnrolmentsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ProgramEnrolmentsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramEnrolmentsQuery>(ProgramEnrolmentsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programEnrolments', 'query');
    },
    programEnrolmentByDocName(variables: ProgramEnrolmentByDocNameQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ProgramEnrolmentByDocNameQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramEnrolmentByDocNameQuery>(ProgramEnrolmentByDocNameDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programEnrolmentByDocName', 'query');
    },
    insertProgramEnrolment(variables: InsertProgramEnrolmentMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertProgramEnrolmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertProgramEnrolmentMutation>(InsertProgramEnrolmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertProgramEnrolment', 'mutation');
    },
    updateProgramEnrolment(variables: UpdateProgramEnrolmentMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateProgramEnrolmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateProgramEnrolmentMutation>(UpdateProgramEnrolmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateProgramEnrolment', 'mutation');
    },
    clinicians(variables: CliniciansQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CliniciansQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<CliniciansQuery>(CliniciansDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'clinicians', 'query');
    },
    formSchemas(variables?: FormSchemasQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<FormSchemasQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<FormSchemasQuery>(FormSchemasDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'formSchemas', 'query');
    },
    activeProgramEvents(variables: ActiveProgramEventsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ActiveProgramEventsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ActiveProgramEventsQuery>(ActiveProgramEventsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'activeProgramEvents', 'query');
    },
    contactTraces(variables: ContactTracesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ContactTracesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ContactTracesQuery>(ContactTracesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'contactTraces', 'query');
    },
    insertContactTrace(variables: InsertContactTraceMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertContactTraceMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertContactTraceMutation>(InsertContactTraceDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertContactTrace', 'mutation');
    },
    updateContactTrace(variables: UpdateContactTraceMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateContactTraceMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateContactTraceMutation>(UpdateContactTraceDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateContactTrace', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;