import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { EncounterDocumentRegistryFragmentDoc } from '../../Encounter/api/operations.generated';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw';
export type PatientRowFragment = {
  __typename: 'PatientNode';
  id: string;
  code: string;
  code2?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name: string;
  dateOfBirth?: string | null;
  gender?: Types.GenderType | null;
  email?: string | null;
  isDeceased: boolean;
  document?: {
    __typename: 'DocumentNode';
    id: string;
    name: string;
    type: string;
  } | null;
};

export type PatientDocumentFragment = {
  __typename: 'DocumentRegistryNode';
  id: string;
  documentType: string;
  formSchemaId: string;
  jsonSchema: any;
  name?: string | null;
  context: Types.DocumentRegistryNodeContext;
  parentId?: string | null;
  uiSchema: any;
  uiSchemaType: string;
};

export type PatientDocumentRegistryFragment = {
  __typename: 'DocumentRegistryNode';
  id: string;
  documentType: string;
  formSchemaId: string;
  jsonSchema: any;
  name?: string | null;
  context: Types.DocumentRegistryNodeContext;
  parentId?: string | null;
  uiSchema: any;
  uiSchemaType: string;
  children: Array<{
    __typename: 'DocumentRegistryNode';
    id: string;
    documentType: string;
    formSchemaId: string;
    jsonSchema: any;
    name?: string | null;
    context: Types.DocumentRegistryNodeContext;
    parentId?: string | null;
    uiSchema: any;
    uiSchemaType: string;
  }>;
};

export type ProgramEventFragment = {
  __typename: 'ProgramEventNode';
  activeDatetime: string;
  name?: string | null;
  type: string;
};

export type ProgramEnrolmentRowFragment = {
  __typename: 'ProgramEnrolmentNode';
  enrolmentDatetime: string;
  name: string;
  patientId: string;
  programPatientId?: string | null;
  type: string;
  document: {
    __typename: 'DocumentNode';
    documentRegistry?: {
      __typename: 'DocumentRegistryNode';
      id: string;
      name?: string | null;
    } | null;
  };
  events: Array<{
    __typename: 'ProgramEventNode';
    activeDatetime: string;
    name?: string | null;
    type: string;
  }>;
};

export type PatientFragment = {
  __typename: 'PatientNode';
  address1?: string | null;
  address2?: string | null;
  code: string;
  code2?: string | null;
  country?: string | null;
  dateOfBirth?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  gender?: Types.GenderType | null;
  id: string;
  name: string;
  phone?: string | null;
  website?: string | null;
  isDeceased: boolean;
  document?: {
    __typename: 'DocumentNode';
    id: string;
    name: string;
    type: string;
  } | null;
};

export type PatientsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key: Types.PatientSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  filter?: Types.InputMaybe<Types.PatientFilterInput>;
}>;

export type PatientsQuery = {
  __typename: 'Queries';
  patients: {
    __typename: 'PatientConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'PatientNode';
      id: string;
      code: string;
      code2?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      name: string;
      dateOfBirth?: string | null;
      gender?: Types.GenderType | null;
      email?: string | null;
      isDeceased: boolean;
      document?: {
        __typename: 'DocumentNode';
        id: string;
        name: string;
        type: string;
      } | null;
    }>;
  };
};

export type PatientByIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  nameId: Types.Scalars['String'];
}>;

export type PatientByIdQuery = {
  __typename: 'Queries';
  patients: {
    __typename: 'PatientConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'PatientNode';
      address1?: string | null;
      address2?: string | null;
      code: string;
      code2?: string | null;
      country?: string | null;
      dateOfBirth?: string | null;
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      gender?: Types.GenderType | null;
      id: string;
      name: string;
      phone?: string | null;
      website?: string | null;
      isDeceased: boolean;
      document?: {
        __typename: 'DocumentNode';
        id: string;
        name: string;
        type: string;
      } | null;
    }>;
  };
};

export type PatientSearchQueryVariables = Types.Exact<{
  input: Types.PatientSearchInput;
  storeId: Types.Scalars['String'];
}>;

export type PatientSearchQuery = {
  __typename: 'Queries';
  patientSearch: {
    __typename: 'PatientSearchConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'PatientSearchNode';
      score: number;
      patient: {
        __typename: 'PatientNode';
        address1?: string | null;
        address2?: string | null;
        code: string;
        code2?: string | null;
        country?: string | null;
        dateOfBirth?: string | null;
        email?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        gender?: Types.GenderType | null;
        id: string;
        name: string;
        phone?: string | null;
        website?: string | null;
        isDeceased: boolean;
        document?: {
          __typename: 'DocumentNode';
          id: string;
          name: string;
          type: string;
        } | null;
      };
    }>;
  };
};

export type GetDocumentHistoryQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  name: Types.Scalars['String'];
}>;

export type GetDocumentHistoryQuery = {
  __typename: 'Queries';
  documentHistory: {
    __typename: 'DocumentConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'DocumentNode';
      author: string;
      data: any;
      id: string;
      name: string;
      parents: Array<string>;
      timestamp: string;
      type: string;
    }>;
  };
};

export type ProgramEnrolmentsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key: Types.ProgramEnrolmentSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.ProgramEnrolmentFilterInput>;
  eventTime: Types.Scalars['String'];
}>;

export type ProgramEnrolmentsQuery = {
  __typename: 'Queries';
  programEnrolments: {
    __typename: 'ProgramEnrolmentConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'ProgramEnrolmentNode';
      enrolmentDatetime: string;
      name: string;
      patientId: string;
      programPatientId?: string | null;
      type: string;
      document: {
        __typename: 'DocumentNode';
        documentRegistry?: {
          __typename: 'DocumentRegistryNode';
          id: string;
          name?: string | null;
        } | null;
      };
      events: Array<{
        __typename: 'ProgramEventNode';
        activeDatetime: string;
        name?: string | null;
        type: string;
      }>;
    }>;
  };
};

export type DocumentRegistriesQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.DocumentRegistryFilterInput>;
  key?: Types.InputMaybe<Types.DocumentRegistrySortFieldInput>;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
}>;

export type DocumentRegistriesQuery = {
  __typename: 'Queries';
  documentRegistries: {
    __typename: 'DocumentRegistryConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'DocumentRegistryNode';
      context: Types.DocumentRegistryNodeContext;
      documentType: string;
      formSchemaId: string;
      id: string;
      jsonSchema: any;
      name?: string | null;
      parentId?: string | null;
      uiSchema: any;
      uiSchemaType: string;
      children: Array<{ __typename: 'DocumentRegistryNode'; id: string }>;
    }>;
  };
};

export type InsertPatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.InsertPatientInput;
}>;

export type InsertPatientMutation = {
  __typename: 'Mutations';
  insertPatient: {
    __typename: 'PatientNode';
    id: string;
    code: string;
    code2?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    name: string;
    dateOfBirth?: string | null;
    gender?: Types.GenderType | null;
    email?: string | null;
    isDeceased: boolean;
    document?: {
      __typename: 'DocumentNode';
      id: string;
      name: string;
      type: string;
    } | null;
  };
};

export type UpdatePatientMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.UpdatePatientInput;
}>;

export type UpdatePatientMutation = {
  __typename: 'Mutations';
  updatePatient: {
    __typename: 'PatientNode';
    id: string;
    code: string;
    code2?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    name: string;
    dateOfBirth?: string | null;
    gender?: Types.GenderType | null;
    email?: string | null;
    isDeceased: boolean;
    document?: {
      __typename: 'DocumentNode';
      id: string;
      name: string;
      type: string;
    } | null;
  };
};

export type PatientEncounterRowFragment = {
  __typename: 'EncounterNode';
  id: string;
  program: string;
  startDatetime: string;
  endDatetime?: string | null;
  status?: Types.EncounterNodeStatus | null;
  name: string;
  type: string;
  document: {
    __typename: 'DocumentNode';
    documentRegistry?: {
      __typename: 'DocumentRegistryNode';
      name?: string | null;
    } | null;
  };
  patient: {
    __typename: 'NameNode';
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    name: string;
  };
  events: Array<{
    __typename: 'ProgramEventNode';
    activeDatetime: string;
    name?: string | null;
    type: string;
  }>;
};

export type EncountersQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  key: Types.EncounterSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.EncounterFilterInput>;
  page?: Types.InputMaybe<Types.PaginationInput>;
  eventTime: Types.Scalars['String'];
}>;

export type EncountersQuery = {
  __typename: 'Queries';
  encounters: {
    __typename: 'EncounterConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'EncounterNode';
      id: string;
      program: string;
      startDatetime: string;
      endDatetime?: string | null;
      status?: Types.EncounterNodeStatus | null;
      name: string;
      type: string;
      document: {
        __typename: 'DocumentNode';
        documentRegistry?: {
          __typename: 'DocumentRegistryNode';
          name?: string | null;
        } | null;
      };
      patient: {
        __typename: 'NameNode';
        id: string;
        firstName?: string | null;
        lastName?: string | null;
        name: string;
      };
      events: Array<{
        __typename: 'ProgramEventNode';
        activeDatetime: string;
        name?: string | null;
        type: string;
      }>;
    }>;
  };
};

export const PatientRowFragmentDoc = gql`
  fragment PatientRow on PatientNode {
    id
    code
    code2
    firstName
    lastName
    name
    dateOfBirth
    gender
    email
    document {
      id
      name
      type
    }
    isDeceased
  }
`;
export const PatientDocumentFragmentDoc = gql`
  fragment PatientDocument on DocumentRegistryNode {
    id
    documentType
    formSchemaId
    jsonSchema
    name
    context
    parentId
    uiSchema
    uiSchemaType
  }
`;
export const PatientDocumentRegistryFragmentDoc = gql`
  fragment PatientDocumentRegistry on DocumentRegistryNode {
    ...PatientDocument
    children {
      ...PatientDocument
    }
  }
  ${PatientDocumentFragmentDoc}
`;
export const ProgramEventFragmentDoc = gql`
  fragment ProgramEvent on ProgramEventNode {
    activeDatetime
    name
    type
  }
`;
export const ProgramEnrolmentRowFragmentDoc = gql`
  fragment ProgramEnrolmentRow on ProgramEnrolmentNode {
    enrolmentDatetime
    name
    patientId
    programPatientId
    type
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
  ${ProgramEventFragmentDoc}
`;
export const PatientFragmentDoc = gql`
  fragment Patient on PatientNode {
    address1
    address2
    code
    code2
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
    isDeceased
  }
`;
export const PatientEncounterRowFragmentDoc = gql`
  fragment PatientEncounterRow on EncounterNode {
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
  ${ProgramEventFragmentDoc}
`;
export const PatientsDocument = gql`
  query patients(
    $storeId: String!
    $key: PatientSortFieldInput!
    $desc: Boolean
    $first: Int
    $offset: Int
    $filter: PatientFilterInput
  ) {
    patients(
      storeId: $storeId
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
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
  ${PatientRowFragmentDoc}
`;
export const PatientByIdDocument = gql`
  query patientById($storeId: String!, $nameId: String!) {
    patients(storeId: $storeId, filter: { id: { equalTo: $nameId } }) {
      ... on PatientConnector {
        __typename
        nodes {
          ...Patient
        }
        totalCount
      }
    }
  }
  ${PatientFragmentDoc}
`;
export const PatientSearchDocument = gql`
  query patientSearch($input: PatientSearchInput!, $storeId: String!) {
    patientSearch(input: $input, storeId: $storeId) {
      ... on PatientSearchConnector {
        __typename
        nodes {
          score
          patient {
            ...Patient
          }
        }
        totalCount
      }
    }
  }
  ${PatientFragmentDoc}
`;
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
export const ProgramEnrolmentsDocument = gql`
  query programEnrolments(
    $storeId: String!
    $key: ProgramEnrolmentSortFieldInput!
    $desc: Boolean
    $filter: ProgramEnrolmentFilterInput
    $eventTime: String!
  ) {
    programEnrolments(
      storeId: $storeId
      sort: { key: $key, desc: $desc }
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
  ${ProgramEnrolmentRowFragmentDoc}
`;
export const DocumentRegistriesDocument = gql`
  query documentRegistries(
    $filter: DocumentRegistryFilterInput
    $key: DocumentRegistrySortFieldInput
    $desc: Boolean
  ) {
    documentRegistries(filter: $filter, sort: { key: $key, desc: $desc }) {
      ... on DocumentRegistryConnector {
        nodes {
          ...EncounterDocumentRegistry
        }
        totalCount
      }
    }
  }
  ${EncounterDocumentRegistryFragmentDoc}
`;
export const InsertPatientDocument = gql`
  mutation insertPatient($storeId: String!, $input: InsertPatientInput!) {
    insertPatient(storeId: $storeId, input: $input) {
      ... on PatientNode {
        __typename
        ...PatientRow
      }
    }
  }
  ${PatientRowFragmentDoc}
`;
export const UpdatePatientDocument = gql`
  mutation updatePatient($storeId: String!, $input: UpdatePatientInput!) {
    updatePatient(storeId: $storeId, input: $input) {
      ... on PatientNode {
        __typename
        ...PatientRow
      }
    }
  }
  ${PatientRowFragmentDoc}
`;
export const EncountersDocument = gql`
  query encounters(
    $storeId: String!
    $key: EncounterSortFieldInput!
    $desc: Boolean
    $filter: EncounterFilterInput
    $page: PaginationInput
    $eventTime: String!
  ) {
    encounters(
      storeId: $storeId
      sort: { key: $key, desc: $desc }
      filter: $filter
      page: $page
    ) {
      ... on EncounterConnector {
        nodes {
          ...PatientEncounterRow
        }
        totalCount
      }
    }
  }
  ${PatientEncounterRowFragmentDoc}
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    patients(
      variables: PatientsQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<PatientsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PatientsQuery>(PatientsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'patients',
        'query'
      );
    },
    patientById(
      variables: PatientByIdQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<PatientByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PatientByIdQuery>(PatientByIdDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'patientById',
        'query'
      );
    },
    patientSearch(
      variables: PatientSearchQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<PatientSearchQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PatientSearchQuery>(PatientSearchDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'patientSearch',
        'query'
      );
    },
    getDocumentHistory(
      variables: GetDocumentHistoryQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<GetDocumentHistoryQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GetDocumentHistoryQuery>(
            GetDocumentHistoryDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'getDocumentHistory',
        'query'
      );
    },
    programEnrolments(
      variables: ProgramEnrolmentsQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<ProgramEnrolmentsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ProgramEnrolmentsQuery>(
            ProgramEnrolmentsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'programEnrolments',
        'query'
      );
    },
    documentRegistries(
      variables?: DocumentRegistriesQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<DocumentRegistriesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DocumentRegistriesQuery>(
            DocumentRegistriesDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'documentRegistries',
        'query'
      );
    },
    insertPatient(
      variables: InsertPatientMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<InsertPatientMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertPatientMutation>(
            InsertPatientDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertPatient',
        'mutation'
      );
    },
    updatePatient(
      variables: UpdatePatientMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<UpdatePatientMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdatePatientMutation>(
            UpdatePatientDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updatePatient',
        'mutation'
      );
    },
    encounters(
      variables: EncountersQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<EncountersQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<EncountersQuery>(EncountersDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'encounters',
        'query'
      );
    },
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
export const mockPatientsQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<PatientsQueryVariables>,
    GraphQLContext<PatientsQuery>,
    any
  >
) => graphql.query<PatientsQuery, PatientsQueryVariables>('patients', resolver);

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
export const mockPatientByIdQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<PatientByIdQueryVariables>,
    GraphQLContext<PatientByIdQuery>,
    any
  >
) =>
  graphql.query<PatientByIdQuery, PatientByIdQueryVariables>(
    'patientById',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockPatientSearchQuery((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ patientSearch })
 *   )
 * })
 */
export const mockPatientSearchQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<PatientSearchQueryVariables>,
    GraphQLContext<PatientSearchQuery>,
    any
  >
) =>
  graphql.query<PatientSearchQuery, PatientSearchQueryVariables>(
    'patientSearch',
    resolver
  );

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
export const mockGetDocumentHistoryQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<GetDocumentHistoryQueryVariables>,
    GraphQLContext<GetDocumentHistoryQuery>,
    any
  >
) =>
  graphql.query<GetDocumentHistoryQuery, GetDocumentHistoryQueryVariables>(
    'getDocumentHistory',
    resolver
  );

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
export const mockProgramEnrolmentsQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<ProgramEnrolmentsQueryVariables>,
    GraphQLContext<ProgramEnrolmentsQuery>,
    any
  >
) =>
  graphql.query<ProgramEnrolmentsQuery, ProgramEnrolmentsQueryVariables>(
    'programEnrolments',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDocumentRegistriesQuery((req, res, ctx) => {
 *   const { filter, key, desc } = req.variables;
 *   return res(
 *     ctx.data({ documentRegistries })
 *   )
 * })
 */
export const mockDocumentRegistriesQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<DocumentRegistriesQueryVariables>,
    GraphQLContext<DocumentRegistriesQuery>,
    any
  >
) =>
  graphql.query<DocumentRegistriesQuery, DocumentRegistriesQueryVariables>(
    'documentRegistries',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertPatientMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ insertPatient })
 *   )
 * })
 */
export const mockInsertPatientMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<InsertPatientMutationVariables>,
    GraphQLContext<InsertPatientMutation>,
    any
  >
) =>
  graphql.mutation<InsertPatientMutation, InsertPatientMutationVariables>(
    'insertPatient',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdatePatientMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ updatePatient })
 *   )
 * })
 */
export const mockUpdatePatientMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<UpdatePatientMutationVariables>,
    GraphQLContext<UpdatePatientMutation>,
    any
  >
) =>
  graphql.mutation<UpdatePatientMutation, UpdatePatientMutationVariables>(
    'updatePatient',
    resolver
  );

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
export const mockEncountersQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<EncountersQueryVariables>,
    GraphQLContext<EncountersQuery>,
    any
  >
) =>
  graphql.query<EncountersQuery, EncountersQueryVariables>(
    'encounters',
    resolver
  );
