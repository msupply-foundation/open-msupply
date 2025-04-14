import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
import { VaccineCourseItemFragmentDoc } from '../../../../programs/src/api/operations.generated';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type VaccinationCourseDoseFragment = {
  __typename: 'VaccineCourseDoseNode';
  id: string;
  label: string;
  vaccineCourse: {
    __typename: 'VaccineCourseNode';
    id: string;
    vaccineCourseItems?: Array<{
      __typename: 'VaccineCourseItemNode';
      id: string;
      itemId: string;
      name: string;
    }> | null;
  };
};

export type VaccinationDetailFragment = {
  __typename: 'VaccinationNode';
  id: string;
  facilityNameId?: string | null;
  facilityFreeText?: string | null;
  vaccinationDate?: string | null;
  given: boolean;
  notGivenReason?: string | null;
  comment?: string | null;
  clinician?: {
    __typename: 'ClinicianNode';
    id: string;
    firstName?: string | null;
    lastName: string;
  } | null;
  stockLine?: {
    __typename: 'StockLineNode';
    id: string;
    itemId: string;
    itemName: string;
    batch?: string | null;
  } | null;
  invoice?: {
    __typename: 'InvoiceNode';
    id: string;
    store?: { __typename: 'StoreNode'; id: string } | null;
  } | null;
};

export type VaccinationCardItemFragment = {
  __typename: 'VaccinationCardItemNode';
  id: string;
  vaccineCourseId: string;
  vaccineCourseDoseId: string;
  vaccinationId?: string | null;
  label: string;
  minAgeMonths: number;
  customAgeLabel?: string | null;
  vaccinationDate?: string | null;
  suggestedDate?: string | null;
  given?: boolean | null;
  batch?: string | null;
  facilityName?: string | null;
  status?: Types.VaccinationCardItemNodeStatus | null;
};

export type VaccinationCardFragment = {
  __typename: 'VaccinationCardNode';
  id: string;
  patientFirstName?: string | null;
  patientLastName?: string | null;
  programName: string;
  enrolmentStoreId?: string | null;
  items: Array<{
    __typename: 'VaccinationCardItemNode';
    id: string;
    vaccineCourseId: string;
    vaccineCourseDoseId: string;
    vaccinationId?: string | null;
    label: string;
    minAgeMonths: number;
    customAgeLabel?: string | null;
    vaccinationDate?: string | null;
    suggestedDate?: string | null;
    given?: boolean | null;
    batch?: string | null;
    facilityName?: string | null;
    status?: Types.VaccinationCardItemNodeStatus | null;
  }>;
};

export type VaccinationCardQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  programEnrolmentId: Types.Scalars['String']['input'];
}>;

export type VaccinationCardQuery = {
  __typename: 'Queries';
  vaccinationCard:
    | {
        __typename: 'NodeError';
        error:
          | { __typename: 'DatabaseError'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      }
    | {
        __typename: 'VaccinationCardNode';
        id: string;
        patientFirstName?: string | null;
        patientLastName?: string | null;
        programName: string;
        enrolmentStoreId?: string | null;
        items: Array<{
          __typename: 'VaccinationCardItemNode';
          id: string;
          vaccineCourseId: string;
          vaccineCourseDoseId: string;
          vaccinationId?: string | null;
          label: string;
          minAgeMonths: number;
          customAgeLabel?: string | null;
          vaccinationDate?: string | null;
          suggestedDate?: string | null;
          given?: boolean | null;
          batch?: string | null;
          facilityName?: string | null;
          status?: Types.VaccinationCardItemNodeStatus | null;
        }>;
      };
};

export type VaccinationQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  vaccinationId: Types.Scalars['String']['input'];
}>;

export type VaccinationQuery = {
  __typename: 'Queries';
  vaccination?: {
    __typename: 'VaccinationNode';
    id: string;
    facilityNameId?: string | null;
    facilityFreeText?: string | null;
    vaccinationDate?: string | null;
    given: boolean;
    notGivenReason?: string | null;
    comment?: string | null;
    clinician?: {
      __typename: 'ClinicianNode';
      id: string;
      firstName?: string | null;
      lastName: string;
    } | null;
    stockLine?: {
      __typename: 'StockLineNode';
      id: string;
      itemId: string;
      itemName: string;
      batch?: string | null;
    } | null;
    invoice?: {
      __typename: 'InvoiceNode';
      id: string;
      store?: { __typename: 'StoreNode'; id: string } | null;
    } | null;
  } | null;
};

export type VaccineCourseDoseQueryVariables = Types.Exact<{
  doseId: Types.Scalars['String']['input'];
}>;

export type VaccineCourseDoseQuery = {
  __typename: 'Queries';
  vaccineCourseDose:
    | {
        __typename: 'NodeError';
        error:
          | { __typename: 'DatabaseError'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      }
    | {
        __typename: 'VaccineCourseDoseNode';
        id: string;
        label: string;
        vaccineCourse: {
          __typename: 'VaccineCourseNode';
          id: string;
          vaccineCourseItems?: Array<{
            __typename: 'VaccineCourseItemNode';
            id: string;
            itemId: string;
            name: string;
          }> | null;
        };
      };
};

export type InsertVaccinationMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertVaccinationInput;
}>;

export type InsertVaccinationMutation = {
  __typename: 'Mutations';
  insertVaccination: {
    __typename: 'VaccinationNode';
    id: string;
    invoice?: { __typename: 'InvoiceNode'; id: string } | null;
  };
};

export type UpdateVaccinationMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateVaccinationInput;
}>;

export type UpdateVaccinationMutation = {
  __typename: 'Mutations';
  updateVaccination:
    | {
        __typename: 'UpdateVaccinationError';
        error: { __typename: 'NotMostRecentGivenDose'; description: string };
      }
    | {
        __typename: 'VaccinationNode';
        id: string;
        invoice?: { __typename: 'InvoiceNode'; id: string } | null;
      };
};

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
  ${VaccineCourseItemFragmentDoc}
`;
export const VaccinationDetailFragmentDoc = gql`
  fragment VaccinationDetail on VaccinationNode {
    __typename
    id
    facilityNameId
    facilityFreeText
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
      itemName
      batch
    }
    invoice {
      id
      store {
        id
      }
    }
    notGivenReason
    comment
  }
`;
export const VaccinationCardItemFragmentDoc = gql`
  fragment VaccinationCardItem on VaccinationCardItemNode {
    __typename
    id
    vaccineCourseId
    vaccineCourseDoseId
    vaccinationId
    label
    minAgeMonths
    customAgeLabel
    vaccinationDate
    suggestedDate
    given
    batch
    facilityName(storeId: $storeId)
    status
  }
`;
export const VaccinationCardFragmentDoc = gql`
  fragment VaccinationCard on VaccinationCardNode {
    __typename
    id
    patientFirstName
    patientLastName
    programName
    enrolmentStoreId
    items {
      ... on VaccinationCardItemNode {
        ...VaccinationCardItem
      }
    }
  }
  ${VaccinationCardItemFragmentDoc}
`;
export const VaccinationCardDocument = gql`
  query vaccinationCard($storeId: String!, $programEnrolmentId: String!) {
    vaccinationCard(
      storeId: $storeId
      programEnrolmentId: $programEnrolmentId
    ) {
      ... on VaccinationCardNode {
        ...VaccinationCard
      }
      ... on NodeError {
        __typename
        error {
          description
        }
      }
    }
  }
  ${VaccinationCardFragmentDoc}
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
  ${VaccinationDetailFragmentDoc}
`;
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
  ${VaccinationCourseDoseFragmentDoc}
`;
export const InsertVaccinationDocument = gql`
  mutation insertVaccination(
    $storeId: String!
    $input: InsertVaccinationInput!
  ) {
    insertVaccination(storeId: $storeId, input: $input) {
      __typename
      ... on VaccinationNode {
        __typename
        id
        invoice {
          id
        }
      }
    }
  }
`;
export const UpdateVaccinationDocument = gql`
  mutation updateVaccination(
    $storeId: String!
    $input: UpdateVaccinationInput!
  ) {
    updateVaccination(storeId: $storeId, input: $input) {
      __typename
      ... on VaccinationNode {
        __typename
        id
        invoice {
          id
        }
      }
      ... on UpdateVaccinationError {
        __typename
        error {
          description
          ... on NotMostRecentGivenDose {
            __typename
            description
          }
        }
      }
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    vaccinationCard(
      variables: VaccinationCardQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<VaccinationCardQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<VaccinationCardQuery>(
            VaccinationCardDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'vaccinationCard',
        'query',
        variables
      );
    },
    vaccination(
      variables: VaccinationQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<VaccinationQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<VaccinationQuery>(VaccinationDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'vaccination',
        'query',
        variables
      );
    },
    vaccineCourseDose(
      variables: VaccineCourseDoseQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<VaccineCourseDoseQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<VaccineCourseDoseQuery>(
            VaccineCourseDoseDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'vaccineCourseDose',
        'query',
        variables
      );
    },
    insertVaccination(
      variables: InsertVaccinationMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertVaccinationMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertVaccinationMutation>(
            InsertVaccinationDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertVaccination',
        'mutation',
        variables
      );
    },
    updateVaccination(
      variables: UpdateVaccinationMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpdateVaccinationMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateVaccinationMutation>(
            UpdateVaccinationDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateVaccination',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
