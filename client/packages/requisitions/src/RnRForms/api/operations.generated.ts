import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type RnRFormFragment = { __typename: 'RnRFormNode', id: string, createdDatetime: string, periodId: string, periodName: string, periodLength: number, programId: string, programName: string, supplierName: string, supplierId: string, status: Types.RnRFormNodeStatus };

export type RnRFormLineFragment = { __typename: 'RnRFormLineNode', id: string, averageMonthlyConsumption: number, previousMonthlyConsumptionValues: string, initialBalance: number, quantityReceived: number, quantityConsumed: number, adjustedQuantityConsumed: number, adjustments: number, stockOutDuration: number, finalBalance: number, maximumQuantity: number, expiryDate?: string | null, calculatedRequestedQuantity: number, enteredRequestedQuantity?: number | null, comment?: string | null, confirmed: boolean, item: { __typename: 'ItemNode', code: string, name: string, unitName?: string | null, strength?: string | null, venCategory: Types.VenCategoryType } };

export type PeriodFragment = { __typename: 'PeriodNode', id: string, name: string, startDate: string, endDate: string };

export type PeriodScheduleFragment = { __typename: 'PeriodScheduleNode', id: string, name: string, periods: Array<{ __typename: 'SchedulePeriodNode', id: string, inUse: boolean, period: { __typename: 'PeriodNode', id: string, name: string, startDate: string, endDate: string } }> };

export type RnrFormsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.RnRFormSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.RnRFormFilterInput>;
}>;


export type RnrFormsQuery = { __typename: 'Queries', rAndRForms: { __typename: 'RnRFormConnector', totalCount: number, nodes: Array<{ __typename: 'RnRFormNode', id: string, createdDatetime: string, periodId: string, periodName: string, periodLength: number, programId: string, programName: string, supplierName: string, supplierId: string, status: Types.RnRFormNodeStatus }> } };

export type SchedulesAndPeriodsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  programId: Types.Scalars['String']['input'];
}>;


export type SchedulesAndPeriodsQuery = { __typename: 'Queries', schedulesWithPeriodsByProgram: { __typename: 'PeriodSchedulesConnector', nodes: Array<{ __typename: 'PeriodScheduleNode', id: string, name: string, periods: Array<{ __typename: 'SchedulePeriodNode', id: string, inUse: boolean, period: { __typename: 'PeriodNode', id: string, name: string, startDate: string, endDate: string } }> }> } };

export type RAndRFormDetailQueryVariables = Types.Exact<{
  rnrFormId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type RAndRFormDetailQuery = { __typename: 'Queries', rAndRForm: { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'RnRFormNode', id: string, createdDatetime: string, periodId: string, periodName: string, periodLength: number, programId: string, programName: string, supplierName: string, supplierId: string, status: Types.RnRFormNodeStatus, lines: Array<{ __typename: 'RnRFormLineNode', id: string, averageMonthlyConsumption: number, previousMonthlyConsumptionValues: string, initialBalance: number, quantityReceived: number, quantityConsumed: number, adjustedQuantityConsumed: number, adjustments: number, stockOutDuration: number, finalBalance: number, maximumQuantity: number, expiryDate?: string | null, calculatedRequestedQuantity: number, enteredRequestedQuantity?: number | null, comment?: string | null, confirmed: boolean, item: { __typename: 'ItemNode', code: string, name: string, unitName?: string | null, strength?: string | null, venCategory: Types.VenCategoryType } }> } };

export type CreateRnRFormMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertRnRFormInput;
}>;


export type CreateRnRFormMutation = { __typename: 'Mutations', insertRnrForm: { __typename: 'RnRFormNode', id: string, createdDatetime: string, periodId: string, periodName: string, periodLength: number, programId: string, programName: string, supplierName: string, supplierId: string, status: Types.RnRFormNodeStatus } };

export type UpdateRnRFormLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateRnRFormInput;
}>;


export type UpdateRnRFormLinesMutation = { __typename: 'Mutations', updateRnrForm: { __typename: 'RnRFormNode', id: string, createdDatetime: string, periodId: string, periodName: string, periodLength: number, programId: string, programName: string, supplierName: string, supplierId: string, status: Types.RnRFormNodeStatus } };

export type FinaliseRnRFormMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.FinaliseRnRFormInput;
}>;


export type FinaliseRnRFormMutation = { __typename: 'Mutations', finaliseRnrForm: { __typename: 'RnRFormNode', id: string, createdDatetime: string, periodId: string, periodName: string, periodLength: number, programId: string, programName: string, supplierName: string, supplierId: string, status: Types.RnRFormNodeStatus } };

export const RnRFormFragmentDoc = gql`
    fragment RnRForm on RnRFormNode {
  id
  createdDatetime
  periodId
  periodName
  periodLength
  programId
  programName
  supplierName
  supplierId
  status
}
    `;
export const RnRFormLineFragmentDoc = gql`
    fragment RnRFormLine on RnRFormLineNode {
  id
  averageMonthlyConsumption
  previousMonthlyConsumptionValues
  initialBalance
  quantityReceived
  quantityConsumed
  adjustedQuantityConsumed
  adjustments
  stockOutDuration
  finalBalance
  maximumQuantity
  expiryDate
  calculatedRequestedQuantity
  enteredRequestedQuantity
  comment
  confirmed
  item {
    code
    name
    unitName
    strength
    venCategory
  }
}
    `;
export const PeriodFragmentDoc = gql`
    fragment Period on PeriodNode {
  id
  name
  startDate
  endDate
}
    `;
export const PeriodScheduleFragmentDoc = gql`
    fragment PeriodSchedule on PeriodScheduleNode {
  id
  name
  periods {
    id
    inUse
    period {
      ...Period
    }
  }
}
    ${PeriodFragmentDoc}`;
export const RnrFormsDocument = gql`
    query rnrForms($storeId: String!, $first: Int, $offset: Int, $key: RnRFormSortFieldInput!, $desc: Boolean, $filter: RnRFormFilterInput) {
  rAndRForms(
    storeId: $storeId
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on RnRFormConnector {
      __typename
      nodes {
        __typename
        ...RnRForm
      }
      totalCount
    }
  }
}
    ${RnRFormFragmentDoc}`;
export const SchedulesAndPeriodsDocument = gql`
    query schedulesAndPeriods($storeId: String!, $programId: String!) {
  schedulesWithPeriodsByProgram(storeId: $storeId, programId: $programId) {
    __typename
    ... on PeriodSchedulesConnector {
      nodes {
        ...PeriodSchedule
      }
    }
  }
}
    ${PeriodScheduleFragmentDoc}`;
export const RAndRFormDetailDocument = gql`
    query rAndRFormDetail($rnrFormId: String!, $storeId: String!) {
  rAndRForm(rnrFormId: $rnrFormId, storeId: $storeId) {
    __typename
    ... on NodeError {
      __typename
      error {
        description
      }
    }
    ... on RnRFormNode {
      __typename
      ...RnRForm
      lines {
        ...RnRFormLine
      }
    }
  }
}
    ${RnRFormFragmentDoc}
${RnRFormLineFragmentDoc}`;
export const CreateRnRFormDocument = gql`
    mutation createRnRForm($storeId: String!, $input: InsertRnRFormInput!) {
  insertRnrForm(storeId: $storeId, input: $input) {
    __typename
    ... on RnRFormNode {
      __typename
      ...RnRForm
    }
  }
}
    ${RnRFormFragmentDoc}`;
export const UpdateRnRFormLinesDocument = gql`
    mutation updateRnRFormLines($storeId: String!, $input: UpdateRnRFormInput!) {
  updateRnrForm(storeId: $storeId, input: $input) {
    __typename
    ... on RnRFormNode {
      __typename
      ...RnRForm
    }
  }
}
    ${RnRFormFragmentDoc}`;
export const FinaliseRnRFormDocument = gql`
    mutation finaliseRnRForm($storeId: String!, $input: FinaliseRnRFormInput!) {
  finaliseRnrForm(storeId: $storeId, input: $input) {
    __typename
    ... on RnRFormNode {
      __typename
      ...RnRForm
    }
  }
}
    ${RnRFormFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    rnrForms(variables: RnrFormsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<RnrFormsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RnrFormsQuery>(RnrFormsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'rnrForms', 'query', variables);
    },
    schedulesAndPeriods(variables: SchedulesAndPeriodsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<SchedulesAndPeriodsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<SchedulesAndPeriodsQuery>(SchedulesAndPeriodsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'schedulesAndPeriods', 'query', variables);
    },
    rAndRFormDetail(variables: RAndRFormDetailQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<RAndRFormDetailQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<RAndRFormDetailQuery>(RAndRFormDetailDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'rAndRFormDetail', 'query', variables);
    },
    createRnRForm(variables: CreateRnRFormMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<CreateRnRFormMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateRnRFormMutation>(CreateRnRFormDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'createRnRForm', 'mutation', variables);
    },
    updateRnRFormLines(variables: UpdateRnRFormLinesMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateRnRFormLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateRnRFormLinesMutation>(UpdateRnRFormLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateRnRFormLines', 'mutation', variables);
    },
    finaliseRnRForm(variables: FinaliseRnRFormMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<FinaliseRnRFormMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<FinaliseRnRFormMutation>(FinaliseRnRFormDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'finaliseRnRForm', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;