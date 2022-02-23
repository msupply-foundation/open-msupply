import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /**
   * Implement the DateTime<Utc> scalar
   *
   * The input/output is a string in RFC3339 format.
   */
  DateTime: string;
  /**
   * ISO 8601 calendar date without timezone.
   * Format: %Y-%m-%d
   *
   * # Examples
   *
   * * `1994-11-13`
   * * `2000-02-24`
   */
  NaiveDate: string;
  /**
   * ISO 8601 combined date and time without timezone.
   *
   * # Examples
   *
   * * `2015-07-01T08:59:60.123`,
   */
  NaiveDateTime: any;
};

export type AccessDenied = LogoutErrorInterface & {
  __typename?: 'AccessDenied';
  description: Scalars['String'];
  fullError: Scalars['String'];
};

export type AddFromMasterListError = {
  __typename?: 'AddFromMasterListError';
  error: AddFromMasterListErrorInterface;
};

export type AddFromMasterListErrorInterface = {
  description: Scalars['String'];
};

export type AddFromMasterListInput = {
  masterListId: Scalars['String'];
  requestRequisitionId: Scalars['String'];
};

export type AddFromMasterListResponse = AddFromMasterListError | RequisitionLineConnector;

export type AuthToken = {
  __typename?: 'AuthToken';
  /** Bearer token */
  token: Scalars['String'];
};

export type AuthTokenError = {
  __typename?: 'AuthTokenError';
  error: AuthTokenErrorInterface;
};

export type AuthTokenErrorInterface = {
  description: Scalars['String'];
};

export type AuthTokenResponse = AuthToken | AuthTokenError;

export type BatchInboundShipmentInput = {
  deleteInboundShipmentLines?: InputMaybe<Array<DeleteInboundShipmentLineInput>>;
  deleteInboundShipments?: InputMaybe<Array<DeleteInboundShipmentInput>>;
  insertInboundShipmentLines?: InputMaybe<Array<InsertInboundShipmentLineInput>>;
  insertInboundShipments?: InputMaybe<Array<InsertInboundShipmentInput>>;
  updateInboundShipmentLines?: InputMaybe<Array<UpdateInboundShipmentLineInput>>;
  updateInboundShipments?: InputMaybe<Array<UpdateInboundShipmentInput>>;
};

export type BatchInboundShipmentResponse = {
  __typename?: 'BatchInboundShipmentResponse';
  deleteInboundShipmentLines?: Maybe<Array<DeleteInboundShipmentLineResponseWithId>>;
  deleteInboundShipments?: Maybe<Array<DeleteInboundShipmentResponseWithId>>;
  insertInboundShipmentLines?: Maybe<Array<InsertInboundShipmentLineResponseWithId>>;
  insertInboundShipments?: Maybe<Array<InsertInboundShipmentResponseWithId>>;
  updateInboundShipmentLines?: Maybe<Array<UpdateInboundShipmentLineResponseWithId>>;
  updateInboundShipments?: Maybe<Array<UpdateInboundShipmentResponseWithId>>;
};

export type BatchIsReserved = DeleteInboundShipmentLineErrorInterface & UpdateInboundShipmentLineErrorInterface & {
  __typename?: 'BatchIsReserved';
  description: Scalars['String'];
};

export type BatchOutboundShipmentInput = {
  deleteOutboundShipmentLines?: InputMaybe<Array<DeleteOutboundShipmentLineInput>>;
  deleteOutboundShipmentServiceLines?: InputMaybe<Array<DeleteOutboundShipmentServiceLineInput>>;
  deleteOutboundShipmentUnallocatedLines?: InputMaybe<Array<DeleteOutboundShipmentUnallocatedLineInput>>;
  deleteOutboundShipments?: InputMaybe<Array<Scalars['String']>>;
  insertOutboundShipmentLines?: InputMaybe<Array<InsertOutboundShipmentLineInput>>;
  insertOutboundShipmentServiceLines?: InputMaybe<Array<InsertOutboundShipmentServiceLineInput>>;
  insertOutboundShipmentUnallocatedLines?: InputMaybe<Array<InsertOutboundShipmentUnallocatedLineInput>>;
  insertOutboundShipments?: InputMaybe<Array<InsertOutboundShipmentInput>>;
  updateOutboundShipmentLines?: InputMaybe<Array<UpdateOutboundShipmentLineInput>>;
  updateOutboundShipmentServiceLines?: InputMaybe<Array<UpdateOutboundShipmentServiceLineInput>>;
  updateOutboundShipmentUnallocatedLines?: InputMaybe<Array<UpdateOutboundShipmentUnallocatedLineInput>>;
  updateOutboundShipments?: InputMaybe<Array<UpdateOutboundShipmentInput>>;
};

export type BatchOutboundShipmentResponse = {
  __typename?: 'BatchOutboundShipmentResponse';
  deleteOutboundShipmentLines?: Maybe<Array<DeleteOutboundShipmentLineResponseWithId>>;
  deleteOutboundShipmentServiceLines?: Maybe<Array<DeleteOutboundShipmentServiceLineResponseWithId>>;
  deleteOutboundShipmentUnallocatedLines?: Maybe<Array<DeleteOutboundShipmentUnallocatedLineResponseWithId>>;
  deleteOutboundShipments?: Maybe<Array<DeleteOutboundShipmentResponseWithId>>;
  insertOutboundShipmentLines?: Maybe<Array<InsertOutboundShipmentLineResponseWithId>>;
  insertOutboundShipmentServiceLines?: Maybe<Array<InsertOutboundShipmentServiceLineResponseWithId>>;
  insertOutboundShipmentUnallocatedLines?: Maybe<Array<InsertOutboundShipmentUnallocatedLineResponseWithId>>;
  insertOutboundShipments?: Maybe<Array<InsertOutboundShipmentResponseWithId>>;
  updateOutboundShipmentLines?: Maybe<Array<UpdateOutboundShipmentLineResponseWithId>>;
  updateOutboundShipmentServiceLines?: Maybe<Array<UpdateOutboundShipmentServiceLineResponseWithId>>;
  updateOutboundShipmentUnallocatedLines?: Maybe<Array<UpdateOutboundShipmentUnallocatedLineResponseWithId>>;
  updateOutboundShipments?: Maybe<Array<UpdateOutboundShipmentResponseWithId>>;
};

export type BatchStocktakeInput = {
  deleteStocktakeLines?: InputMaybe<Array<DeleteStocktakeLineInput>>;
  deleteStocktakes?: InputMaybe<Array<DeleteStocktakeInput>>;
  insertStocktakeLines?: InputMaybe<Array<InsertStocktakeLineInput>>;
  insertStocktakes?: InputMaybe<Array<InsertStocktakeInput>>;
  updateStocktakeLines?: InputMaybe<Array<UpdateStocktakeLineInput>>;
  updateStocktakes?: InputMaybe<Array<UpdateStocktakeInput>>;
};

export type BatchStocktakeResponse = BatchStocktakeResponses | BatchStocktakeResponsesWithErrors;

export type BatchStocktakeResponses = {
  __typename?: 'BatchStocktakeResponses';
  deleteStocktakeLines?: Maybe<Array<DeleteStocktakeLineResponseWithId>>;
  deleteStocktakes?: Maybe<Array<DeleteStocktakeResponseWithId>>;
  insertStocktakeLines?: Maybe<Array<InsertStocktakeLineResponseWithId>>;
  insertStocktakes?: Maybe<Array<InsertStocktakeResponseWithId>>;
  updateStocktakeLines?: Maybe<Array<UpdateStocktakeLineResponseWithId>>;
  updateStocktakes?: Maybe<Array<UpdateStocktakeResponseWithId>>;
};

export type BatchStocktakeResponsesWithErrors = {
  __typename?: 'BatchStocktakeResponsesWithErrors';
  deleteStocktakeLines?: Maybe<Array<DeleteStocktakeLineResponseWithId>>;
  deleteStocktakes?: Maybe<Array<DeleteStocktakeResponseWithId>>;
  insertStocktakeLines?: Maybe<Array<InsertStocktakeLineResponseWithId>>;
  insertStocktakes?: Maybe<Array<InsertStocktakeResponseWithId>>;
  updateStocktakeLines?: Maybe<Array<UpdateStocktakeLineResponseWithId>>;
  updateStocktakes?: Maybe<Array<UpdateStocktakeResponseWithId>>;
};

export type CanOnlyChangeToAllocatedWhenNoUnallocatedLines = UpdateErrorInterface & {
  __typename?: 'CanOnlyChangeToAllocatedWhenNoUnallocatedLines';
  description: Scalars['String'];
  invoiceLines: InvoiceLineConnector;
};

export type CanOnlyEditInvoicesInLoggedInStoreError = UpdateErrorInterface & {
  __typename?: 'CanOnlyEditInvoicesInLoggedInStoreError';
  description: Scalars['String'];
};

export type CannotChangeStatusOfInvoiceOnHold = UpdateErrorInterface & UpdateInboundShipmentErrorInterface & {
  __typename?: 'CannotChangeStatusOfInvoiceOnHold';
  description: Scalars['String'];
};

export type CannotDeleteInvoiceWithLines = DeleteErrorInterface & DeleteInboundShipmentErrorInterface & {
  __typename?: 'CannotDeleteInvoiceWithLines';
  description: Scalars['String'];
  lines: InvoiceLineConnector;
};

export type CannotDeleteRequisitionWithLines = DeleteRequestRequisitionErrorInterface & {
  __typename?: 'CannotDeleteRequisitionWithLines';
  description: Scalars['String'];
};

export type CannotEditInvoice = DeleteErrorInterface & DeleteInboundShipmentErrorInterface & DeleteInboundShipmentLineErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & InsertInboundShipmentLineErrorInterface & InsertOutboundShipmentLineErrorInterface & InsertOutboundShipmentServiceLineErrorInterface & UpdateInboundShipmentErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & {
  __typename?: 'CannotEditInvoice';
  description: Scalars['String'];
};

export type CannotEditRequisition = AddFromMasterListErrorInterface & CreateRequisitionShipmentErrorInterface & DeleteRequestRequisitionErrorInterface & DeleteRequestRequisitionLineErrorInterface & InsertRequestRequisitionLineErrorInterface & SupplyRequestedQuantityErrorInterface & UpdateRequestRequisitionErrorInterface & UpdateRequestRequisitionLineErrorInterface & UpdateResponseRequisitionErrorInterface & UpdateResponseRequisitionLineErrorInterface & UseSuggestedQuantityErrorInterface & {
  __typename?: 'CannotEditRequisition';
  description: Scalars['String'];
};

export type CannotReverseInvoiceStatus = UpdateErrorInterface & UpdateInboundShipmentErrorInterface & {
  __typename?: 'CannotReverseInvoiceStatus';
  description: Scalars['String'];
};

export type CreateRequisitionShipmentError = {
  __typename?: 'CreateRequisitionShipmentError';
  error: CreateRequisitionShipmentErrorInterface;
};

export type CreateRequisitionShipmentErrorInterface = {
  description: Scalars['String'];
};

export type CreateRequisitionShipmentInput = {
  responseRequisitionId: Scalars['String'];
};

export type CreateRequisitionShipmentResponse = CreateRequisitionShipmentError | InvoiceNode;

export type DatabaseError = AuthTokenErrorInterface & DeleteErrorInterface & DeleteInboundShipmentErrorInterface & DeleteInboundShipmentLineErrorInterface & DeleteLocationErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & InsertErrorInterface & InsertInboundShipmentErrorInterface & InsertInboundShipmentLineErrorInterface & InsertLocationErrorInterface & InsertOutboundShipmentLineErrorInterface & InsertOutboundShipmentServiceLineErrorInterface & NodeErrorInterface & RefreshTokenErrorInterface & UpdateErrorInterface & UpdateInboundShipmentErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateLocationErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & UserRegisterErrorInterface & {
  __typename?: 'DatabaseError';
  description: Scalars['String'];
  fullError: Scalars['String'];
};

export type DatetimeFilterInput = {
  afterOrEqualTo?: InputMaybe<Scalars['DateTime']>;
  beforeOrEqualTo?: InputMaybe<Scalars['DateTime']>;
  equalTo?: InputMaybe<Scalars['DateTime']>;
};

export type DeleteErrorInterface = {
  description: Scalars['String'];
};

export type DeleteInboundShipmentError = {
  __typename?: 'DeleteInboundShipmentError';
  error: DeleteInboundShipmentErrorInterface;
};

export type DeleteInboundShipmentErrorInterface = {
  description: Scalars['String'];
};

export type DeleteInboundShipmentInput = {
  id: Scalars['String'];
};

export type DeleteInboundShipmentLineError = {
  __typename?: 'DeleteInboundShipmentLineError';
  error: DeleteInboundShipmentLineErrorInterface;
};

export type DeleteInboundShipmentLineErrorInterface = {
  description: Scalars['String'];
};

export type DeleteInboundShipmentLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
};

export type DeleteInboundShipmentLineResponse = DeleteInboundShipmentLineError | DeleteResponse;

export type DeleteInboundShipmentLineResponseWithId = {
  __typename?: 'DeleteInboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: DeleteInboundShipmentLineResponse;
};

export type DeleteInboundShipmentResponse = DeleteInboundShipmentError | DeleteResponse;

export type DeleteInboundShipmentResponseWithId = {
  __typename?: 'DeleteInboundShipmentResponseWithId';
  id: Scalars['String'];
  response: DeleteInboundShipmentResponse;
};

export type DeleteLocationError = {
  __typename?: 'DeleteLocationError';
  error: DeleteLocationErrorInterface;
};

export type DeleteLocationErrorInterface = {
  description: Scalars['String'];
};

export type DeleteLocationInput = {
  id: Scalars['String'];
};

export type DeleteLocationResponse = DeleteLocationError | DeleteResponse;

export type DeleteOutboundShipmentError = {
  __typename?: 'DeleteOutboundShipmentError';
  error: DeleteErrorInterface;
};

export type DeleteOutboundShipmentLineError = {
  __typename?: 'DeleteOutboundShipmentLineError';
  error: DeleteOutboundShipmentLineErrorInterface;
};

export type DeleteOutboundShipmentLineErrorInterface = {
  description: Scalars['String'];
};

export type DeleteOutboundShipmentLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
};

export type DeleteOutboundShipmentLineResponse = DeleteOutboundShipmentLineError | DeleteResponse;

export type DeleteOutboundShipmentLineResponseWithId = {
  __typename?: 'DeleteOutboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: DeleteOutboundShipmentLineResponse;
};

export type DeleteOutboundShipmentResponse = DeleteOutboundShipmentError | DeleteResponse;

export type DeleteOutboundShipmentResponseWithId = {
  __typename?: 'DeleteOutboundShipmentResponseWithId';
  id: Scalars['String'];
  response: DeleteOutboundShipmentResponse;
};

export type DeleteOutboundShipmentServiceLineError = {
  __typename?: 'DeleteOutboundShipmentServiceLineError';
  error: DeleteOutboundShipmentServiceLineErrorInterface;
};

export type DeleteOutboundShipmentServiceLineErrorInterface = {
  description: Scalars['String'];
};

export type DeleteOutboundShipmentServiceLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
};

export type DeleteOutboundShipmentServiceLineResponse = DeleteOutboundShipmentServiceLineError | DeleteResponse;

export type DeleteOutboundShipmentServiceLineResponseWithId = {
  __typename?: 'DeleteOutboundShipmentServiceLineResponseWithId';
  id: Scalars['String'];
  response: DeleteOutboundShipmentServiceLineResponse;
};

export type DeleteOutboundShipmentUnallocatedLineError = {
  __typename?: 'DeleteOutboundShipmentUnallocatedLineError';
  error: DeleteOutboundShipmentUnallocatedLineErrorInterface;
};

export type DeleteOutboundShipmentUnallocatedLineErrorInterface = {
  description: Scalars['String'];
};

export type DeleteOutboundShipmentUnallocatedLineInput = {
  id: Scalars['String'];
};

export type DeleteOutboundShipmentUnallocatedLineResponse = DeleteOutboundShipmentUnallocatedLineError | DeleteResponse;

export type DeleteOutboundShipmentUnallocatedLineResponseWithId = {
  __typename?: 'DeleteOutboundShipmentUnallocatedLineResponseWithId';
  id: Scalars['String'];
  response: DeleteOutboundShipmentUnallocatedLineResponse;
};

export type DeleteRequestRequisitionError = {
  __typename?: 'DeleteRequestRequisitionError';
  error: DeleteRequestRequisitionErrorInterface;
};

export type DeleteRequestRequisitionErrorInterface = {
  description: Scalars['String'];
};

export type DeleteRequestRequisitionInput = {
  id: Scalars['String'];
};

export type DeleteRequestRequisitionLineError = {
  __typename?: 'DeleteRequestRequisitionLineError';
  error: DeleteRequestRequisitionLineErrorInterface;
};

export type DeleteRequestRequisitionLineErrorInterface = {
  description: Scalars['String'];
};

export type DeleteRequestRequisitionLineInput = {
  id: Scalars['String'];
};

export type DeleteRequestRequisitionLineResponse = DeleteRequestRequisitionLineError | DeleteResponse;

export type DeleteRequestRequisitionResponse = DeleteRequestRequisitionError | DeleteResponse;

export type DeleteResponse = {
  __typename?: 'DeleteResponse';
  id: Scalars['String'];
};

export type DeleteStocktakeInput = {
  id: Scalars['String'];
};

export type DeleteStocktakeLineInput = {
  id: Scalars['String'];
};

export type DeleteStocktakeLineNode = {
  __typename?: 'DeleteStocktakeLineNode';
  id: Scalars['String'];
};

export type DeleteStocktakeLineResponse = DeleteStocktakeLineNode;

export type DeleteStocktakeLineResponseWithId = {
  __typename?: 'DeleteStocktakeLineResponseWithId';
  id: Scalars['String'];
  response: DeleteStocktakeLineResponse;
};

export type DeleteStocktakeNode = {
  __typename?: 'DeleteStocktakeNode';
  /** The id of the deleted stocktake */
  id: Scalars['String'];
};

export type DeleteStocktakeResponse = DeleteStocktakeNode;

export type DeleteStocktakeResponseWithId = {
  __typename?: 'DeleteStocktakeResponseWithId';
  id: Scalars['String'];
  response: DeleteStocktakeResponse;
};

export type EqualFilterBigNumberInput = {
  equalAny?: InputMaybe<Array<Scalars['Int']>>;
  equalTo?: InputMaybe<Scalars['Int']>;
  notEqualTo?: InputMaybe<Scalars['Int']>;
};

export type EqualFilterBooleanInput = {
  equalAny?: InputMaybe<Array<Scalars['Boolean']>>;
  equalTo?: InputMaybe<Scalars['Boolean']>;
  notEqualTo?: InputMaybe<Scalars['Boolean']>;
};

export type EqualFilterInvoiceStatusInput = {
  equalAny?: InputMaybe<Array<InvoiceNodeStatus>>;
  equalTo?: InputMaybe<InvoiceNodeStatus>;
  notEqualTo?: InputMaybe<InvoiceNodeStatus>;
};

export type EqualFilterInvoiceTypeInput = {
  equalAny?: InputMaybe<Array<InvoiceNodeType>>;
  equalTo?: InputMaybe<InvoiceNodeType>;
  notEqualTo?: InputMaybe<InvoiceNodeType>;
};

export type EqualFilterRequisitionStatusInput = {
  equalAny?: InputMaybe<Array<RequisitionNodeStatus>>;
  equalTo?: InputMaybe<RequisitionNodeStatus>;
  notEqualTo?: InputMaybe<RequisitionNodeStatus>;
};

export type EqualFilterRequisitionTypeInput = {
  equalAny?: InputMaybe<Array<RequisitionNodeType>>;
  equalTo?: InputMaybe<RequisitionNodeType>;
  notEqualTo?: InputMaybe<RequisitionNodeType>;
};

export type EqualFilterStocktakeStatusInput = {
  equalAny?: InputMaybe<Array<StocktakeNodeStatus>>;
  equalTo?: InputMaybe<StocktakeNodeStatus>;
  notEqualTo?: InputMaybe<StocktakeNodeStatus>;
};

export type EqualFilterStringInput = {
  equalAny?: InputMaybe<Array<Scalars['String']>>;
  equalTo?: InputMaybe<Scalars['String']>;
  notEqualTo?: InputMaybe<Scalars['String']>;
};

export enum ForeignKey {
  InvoiceId = 'invoiceId',
  ItemId = 'itemId',
  LocationId = 'locationId',
  OtherPartyId = 'otherPartyId',
  RequisitionId = 'requisitionId',
  StockLineId = 'stockLineId'
}

export type ForeignKeyError = DeleteInboundShipmentLineErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & InsertErrorInterface & InsertInboundShipmentErrorInterface & InsertInboundShipmentLineErrorInterface & InsertOutboundShipmentLineErrorInterface & InsertOutboundShipmentServiceLineErrorInterface & InsertOutboundShipmentUnallocatedLineErrorInterface & InsertRequestRequisitionLineErrorInterface & UpdateErrorInterface & UpdateInboundShipmentErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & UpdateRequestRequisitionLineErrorInterface & UpdateResponseRequisitionLineErrorInterface & {
  __typename?: 'ForeignKeyError';
  description: Scalars['String'];
  key: ForeignKey;
};

export type InboundInvoiceCounts = {
  __typename?: 'InboundInvoiceCounts';
  created: InvoiceCountsSummary;
};

export type InsertErrorInterface = {
  description: Scalars['String'];
};

export type InsertInboundShipmentError = {
  __typename?: 'InsertInboundShipmentError';
  error: InsertInboundShipmentErrorInterface;
};

export type InsertInboundShipmentErrorInterface = {
  description: Scalars['String'];
};

export type InsertInboundShipmentInput = {
  colour?: InputMaybe<Scalars['String']>;
  comment?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  onHold?: InputMaybe<Scalars['Boolean']>;
  otherPartyId: Scalars['String'];
  theirReference?: InputMaybe<Scalars['String']>;
};

export type InsertInboundShipmentLineError = {
  __typename?: 'InsertInboundShipmentLineError';
  error: InsertInboundShipmentLineErrorInterface;
};

export type InsertInboundShipmentLineErrorInterface = {
  description: Scalars['String'];
};

export type InsertInboundShipmentLineInput = {
  batch?: InputMaybe<Scalars['String']>;
  costPricePerPack: Scalars['Float'];
  expiryDate?: InputMaybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId: Scalars['String'];
  locationId?: InputMaybe<Scalars['String']>;
  numberOfPacks: Scalars['Int'];
  packSize: Scalars['Int'];
  sellPricePerPack: Scalars['Float'];
  tax?: InputMaybe<Scalars['Float']>;
  totalAfterTax: Scalars['Float'];
  totalBeforeTax: Scalars['Float'];
};

export type InsertInboundShipmentLineResponse = InsertInboundShipmentLineError | InvoiceLineNode | NodeError;

export type InsertInboundShipmentLineResponseWithId = {
  __typename?: 'InsertInboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: InsertInboundShipmentLineResponse;
};

export type InsertInboundShipmentResponse = InsertInboundShipmentError | InvoiceNode | NodeError;

export type InsertInboundShipmentResponseWithId = {
  __typename?: 'InsertInboundShipmentResponseWithId';
  id: Scalars['String'];
  response: InsertInboundShipmentResponse;
};

export type InsertLocationError = {
  __typename?: 'InsertLocationError';
  error: InsertLocationErrorInterface;
};

export type InsertLocationErrorInterface = {
  description: Scalars['String'];
};

export type InsertLocationInput = {
  code: Scalars['String'];
  id: Scalars['String'];
  name?: InputMaybe<Scalars['String']>;
  onHold?: InputMaybe<Scalars['Boolean']>;
};

export type InsertLocationResponse = InsertLocationError | LocationNode;

export type InsertOutboundShipmentError = {
  __typename?: 'InsertOutboundShipmentError';
  error: InsertErrorInterface;
};

export type InsertOutboundShipmentInput = {
  colour?: InputMaybe<Scalars['String']>;
  comment?: InputMaybe<Scalars['String']>;
  /** The new invoice id provided by the client */
  id: Scalars['String'];
  onHold?: InputMaybe<Scalars['Boolean']>;
  /** The other party must be an customer of the current store */
  otherPartyId: Scalars['String'];
  status?: InputMaybe<InvoiceNodeStatus>;
  theirReference?: InputMaybe<Scalars['String']>;
};

export type InsertOutboundShipmentLineError = {
  __typename?: 'InsertOutboundShipmentLineError';
  error: InsertOutboundShipmentLineErrorInterface;
};

export type InsertOutboundShipmentLineErrorInterface = {
  description: Scalars['String'];
};

export type InsertOutboundShipmentLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId: Scalars['String'];
  numberOfPacks: Scalars['Int'];
  stockLineId: Scalars['String'];
  tax?: InputMaybe<Scalars['Float']>;
  totalAfterTax: Scalars['Float'];
  totalBeforeTax: Scalars['Float'];
};

export type InsertOutboundShipmentLineResponse = InsertOutboundShipmentLineError | InvoiceLineNode | NodeError;

export type InsertOutboundShipmentLineResponseWithId = {
  __typename?: 'InsertOutboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: InsertOutboundShipmentLineResponse;
};

export type InsertOutboundShipmentResponse = InsertOutboundShipmentError | InvoiceNode | NodeError;

export type InsertOutboundShipmentResponseWithId = {
  __typename?: 'InsertOutboundShipmentResponseWithId';
  id: Scalars['String'];
  response: InsertOutboundShipmentResponse;
};

export type InsertOutboundShipmentServiceLineError = {
  __typename?: 'InsertOutboundShipmentServiceLineError';
  error: InsertOutboundShipmentServiceLineErrorInterface;
};

export type InsertOutboundShipmentServiceLineErrorInterface = {
  description: Scalars['String'];
};

export type InsertOutboundShipmentServiceLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId: Scalars['String'];
  name?: InputMaybe<Scalars['String']>;
  note?: InputMaybe<Scalars['String']>;
  tax?: InputMaybe<Scalars['Float']>;
  totalAfterTax: Scalars['Float'];
  totalBeforeTax: Scalars['Float'];
};

export type InsertOutboundShipmentServiceLineResponse = InsertOutboundShipmentServiceLineError | InvoiceLineNode;

export type InsertOutboundShipmentServiceLineResponseWithId = {
  __typename?: 'InsertOutboundShipmentServiceLineResponseWithId';
  id: Scalars['String'];
  response: InsertOutboundShipmentServiceLineResponse;
};

export type InsertOutboundShipmentUnallocatedLineError = {
  __typename?: 'InsertOutboundShipmentUnallocatedLineError';
  error: InsertOutboundShipmentUnallocatedLineErrorInterface;
};

export type InsertOutboundShipmentUnallocatedLineErrorInterface = {
  description: Scalars['String'];
};

export type InsertOutboundShipmentUnallocatedLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId: Scalars['String'];
  quantity: Scalars['Int'];
};

export type InsertOutboundShipmentUnallocatedLineResponse = InsertOutboundShipmentUnallocatedLineError | InvoiceLineNode;

export type InsertOutboundShipmentUnallocatedLineResponseWithId = {
  __typename?: 'InsertOutboundShipmentUnallocatedLineResponseWithId';
  id: Scalars['String'];
  response: InsertOutboundShipmentUnallocatedLineResponse;
};

export type InsertRequestRequisitionError = {
  __typename?: 'InsertRequestRequisitionError';
  error: InsertRequestRequisitionErrorInterface;
};

export type InsertRequestRequisitionErrorInterface = {
  description: Scalars['String'];
};

export type InsertRequestRequisitionInput = {
  colour?: InputMaybe<Scalars['String']>;
  comment?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  maxMonthsOfStock: Scalars['Float'];
  minMonthsOfStock: Scalars['Float'];
  otherPartyId: Scalars['String'];
  theirReference?: InputMaybe<Scalars['String']>;
};

export type InsertRequestRequisitionLineError = {
  __typename?: 'InsertRequestRequisitionLineError';
  error: InsertRequestRequisitionLineErrorInterface;
};

export type InsertRequestRequisitionLineErrorInterface = {
  description: Scalars['String'];
};

export type InsertRequestRequisitionLineInput = {
  id: Scalars['String'];
  itemId: Scalars['String'];
  requestedQuantity?: InputMaybe<Scalars['Int']>;
  requisitionId: Scalars['String'];
};

export type InsertRequestRequisitionLineResponse = InsertRequestRequisitionLineError | RequisitionLineNode;

export type InsertRequestRequisitionResponse = InsertRequestRequisitionError | RequisitionNode;

export type InsertStocktakeInput = {
  comment?: InputMaybe<Scalars['String']>;
  createdDatetime: Scalars['NaiveDateTime'];
  description?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
};

export type InsertStocktakeLineInput = {
  batch?: InputMaybe<Scalars['String']>;
  comment?: InputMaybe<Scalars['String']>;
  costPricePerPack?: InputMaybe<Scalars['Float']>;
  countedNumberOfPacks?: InputMaybe<Scalars['Int']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  itemId?: InputMaybe<Scalars['String']>;
  locationId?: InputMaybe<Scalars['String']>;
  note?: InputMaybe<Scalars['String']>;
  packSize?: InputMaybe<Scalars['Int']>;
  sellPricePerPack?: InputMaybe<Scalars['Float']>;
  stockLineId?: InputMaybe<Scalars['String']>;
  stocktakeId: Scalars['String'];
};

export type InsertStocktakeLineResponse = StocktakeLineNode;

export type InsertStocktakeLineResponseWithId = {
  __typename?: 'InsertStocktakeLineResponseWithId';
  id: Scalars['String'];
  response: InsertStocktakeLineResponse;
};

export type InsertStocktakeResponse = StocktakeNode;

export type InsertStocktakeResponseWithId = {
  __typename?: 'InsertStocktakeResponseWithId';
  id: Scalars['String'];
  response: InsertStocktakeResponse;
};

export type InternalError = AuthTokenErrorInterface & InsertLocationErrorInterface & InsertOutboundShipmentServiceLineErrorInterface & LogoutErrorInterface & RefreshTokenErrorInterface & UpdateLocationErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & UserRegisterErrorInterface & {
  __typename?: 'InternalError';
  description: Scalars['String'];
  fullError: Scalars['String'];
};

export type InvalidCredentials = AuthTokenErrorInterface & {
  __typename?: 'InvalidCredentials';
  description: Scalars['String'];
};

export type InvalidToken = RefreshTokenErrorInterface & {
  __typename?: 'InvalidToken';
  description: Scalars['String'];
};

export type InvoiceConnector = {
  __typename?: 'InvoiceConnector';
  nodes: Array<InvoiceNode>;
  totalCount: Scalars['Int'];
};

export type InvoiceCounts = {
  __typename?: 'InvoiceCounts';
  inbound: InboundInvoiceCounts;
  outbound: OutboundInvoiceCounts;
};

export type InvoiceCountsSummary = {
  __typename?: 'InvoiceCountsSummary';
  thisWeek: Scalars['Int'];
  today: Scalars['Int'];
};

export type InvoiceDoesNotBelongToCurrentStore = DeleteErrorInterface & DeleteInboundShipmentErrorInterface & DeleteInboundShipmentLineErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & InsertInboundShipmentLineErrorInterface & InsertOutboundShipmentLineErrorInterface & UpdateInboundShipmentErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename?: 'InvoiceDoesNotBelongToCurrentStore';
  description: Scalars['String'];
};

export type InvoiceFilterInput = {
  allocatedDatetime?: InputMaybe<DatetimeFilterInput>;
  comment?: InputMaybe<SimpleStringFilterInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  deliveredDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  invoiceNumber?: InputMaybe<EqualFilterBigNumberInput>;
  linkedInvoiceId?: InputMaybe<EqualFilterStringInput>;
  nameId?: InputMaybe<EqualFilterStringInput>;
  pickedDatetime?: InputMaybe<DatetimeFilterInput>;
  requisitionId?: InputMaybe<EqualFilterStringInput>;
  shippedDatetime?: InputMaybe<DatetimeFilterInput>;
  status?: InputMaybe<EqualFilterInvoiceStatusInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
  theirReference?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterInvoiceTypeInput>;
  verifiedDatetime?: InputMaybe<DatetimeFilterInput>;
};

export type InvoiceIsNotEditable = UpdateErrorInterface & {
  __typename?: 'InvoiceIsNotEditable';
  description: Scalars['String'];
};

export type InvoiceLineBelongsToAnotherInvoice = DeleteInboundShipmentLineErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & {
  __typename?: 'InvoiceLineBelongsToAnotherInvoice';
  description: Scalars['String'];
  invoice: InvoiceResponse;
};

export type InvoiceLineConnector = {
  __typename?: 'InvoiceLineConnector';
  nodes: Array<InvoiceLineNode>;
  totalCount: Scalars['Int'];
};

export type InvoiceLineHasNoStockLineError = UpdateErrorInterface & {
  __typename?: 'InvoiceLineHasNoStockLineError';
  description: Scalars['String'];
  invoiceLineId: Scalars['String'];
};

export type InvoiceLineNode = {
  __typename?: 'InvoiceLineNode';
  batch?: Maybe<Scalars['String']>;
  costPricePerPack: Scalars['Float'];
  expiryDate?: Maybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  item: ItemNode;
  itemCode: Scalars['String'];
  itemId: Scalars['String'];
  itemName: Scalars['String'];
  location?: Maybe<LocationResponse>;
  locationId?: Maybe<Scalars['String']>;
  locationName?: Maybe<Scalars['String']>;
  note?: Maybe<Scalars['String']>;
  numberOfPacks: Scalars['Int'];
  packSize: Scalars['Int'];
  sellPricePerPack: Scalars['Float'];
  stockLine?: Maybe<StockLineResponse>;
  type: InvoiceLineNodeType;
};

export enum InvoiceLineNodeType {
  Service = 'SERVICE',
  StockIn = 'STOCK_IN',
  StockOut = 'STOCK_OUT',
  UnallocatedStock = 'UNALLOCATED_STOCK'
}

export type InvoiceLineResponse = InvoiceLineNode | NodeError;

export type InvoiceNode = {
  __typename?: 'InvoiceNode';
  allocatedDatetime?: Maybe<Scalars['DateTime']>;
  colour?: Maybe<Scalars['String']>;
  comment?: Maybe<Scalars['String']>;
  createdDatetime: Scalars['DateTime'];
  deliveredDatetime?: Maybe<Scalars['DateTime']>;
  id: Scalars['String'];
  invoiceNumber: Scalars['Int'];
  lines: InvoiceLineConnector;
  /** Inbound Shipment <-> Outbound Shipment, where Inbound Shipment originated from Outbound Shipment */
  linkedShipment?: Maybe<InvoiceNode>;
  onHold: Scalars['Boolean'];
  otherParty: NameResponse;
  otherPartyId: Scalars['String'];
  otherPartyName: Scalars['String'];
  otherPartyStore?: Maybe<StoreNode>;
  pickedDatetime?: Maybe<Scalars['DateTime']>;
  pricing: InvoicePriceResponse;
  /**
   * Response Requisition that is the origin of this Outbound Shipment
   * Or Request Requisition for Inbound Shipment that Originated from Outbound Shipment (linked through Response Requisition)
   */
  requisition?: Maybe<RequisitionNode>;
  shippedDatetime?: Maybe<Scalars['DateTime']>;
  status: InvoiceNodeStatus;
  theirReference?: Maybe<Scalars['String']>;
  type: InvoiceNodeType;
  verifiedDatetime?: Maybe<Scalars['DateTime']>;
};

export enum InvoiceNodeStatus {
  /**
   * General description: Outbound Shipment is ready for picking (all unallocated lines need to be fullfilled)
   * Outbound Shipment: Invoice can only be turned to allocated status when
   * all unallocated lines are fullfilled
   * Inbound Shipment: not applicable
   */
  Allocated = 'ALLOCATED',
  /**
   * General description: Inbound Shipment was received
   * Outbound Shipment: Status is updated based on corresponding inbound Shipment
   * Inbound Shipment: Stock is introduced and can be issued
   */
  Delivered = 'DELIVERED',
  /**
   * Outbound Shipment: available_number_of_packs in a stock line gets
   * updated when items are added to the invoice.
   * Inbound Shipment: No stock changes in this status, only manually entered
   * inbound Shipments have new status
   */
  New = 'NEW',
  /**
   * General description: Outbound Shipment was picked from shelf and ready for Shipment
   * Outbound Shipment: available_number_of_packs and
   * total_number_of_packs get updated when items are added to the invoice
   * Inbound Shipment: For inter store stock transfers an inbound Shipment
   * is created when corresponding outbound Shipment is picked and ready for
   * Shipment, inbound Shipment is not editable in this status
   */
  Picked = 'PICKED',
  /**
   * General description: Outbound Shipment is sent out for delivery
   * Outbound Shipment: Becomes not editable
   * Inbound Shipment: For inter store stock transfers an inbound Shipment
   * becomes editable when this status is set as a result of corresponding
   * outbound Shipment being chagned to shipped (this is similar to New status)
   */
  Shipped = 'SHIPPED',
  /**
   * General description: Received inbound Shipment was counted and verified
   * Outbound Shipment: Status is updated based on corresponding inbound Shipment
   * Inbound Shipment: Becomes not editable
   */
  Verified = 'VERIFIED'
}

export enum InvoiceNodeType {
  InboundShipment = 'INBOUND_SHIPMENT',
  InventoryAdjustment = 'INVENTORY_ADJUSTMENT',
  OutboundShipment = 'OUTBOUND_SHIPMENT'
}

export type InvoicePriceResponse = InvoicePricingNode | NodeError;

export type InvoicePricingNode = {
  __typename?: 'InvoicePricingNode';
  serviceTotalAfterTax: Scalars['Float'];
  serviceTotalBeforeTax: Scalars['Float'];
  stockTotalAfterTax: Scalars['Float'];
  stockTotalBeforeTax: Scalars['Float'];
  totalAfterTax: Scalars['Float'];
  totalBeforeTax: Scalars['Float'];
};

export type InvoiceResponse = InvoiceNode | NodeError;

export enum InvoiceSortFieldInput {
  AllocatedDatetime = 'allocatedDatetime',
  Comment = 'comment',
  CreatedDatetime = 'createdDatetime',
  DeliveredDatetime = 'deliveredDatetime',
  InvoiceNumber = 'invoiceNumber',
  OtherPartyName = 'otherPartyName',
  PickedDatetime = 'pickedDatetime',
  ShippedDatetime = 'shippedDatetime',
  Status = 'status',
  Type = 'type',
  VerifiedDatetime = 'verifiedDatetime'
}

export type InvoiceSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: InvoiceSortFieldInput;
};

export type InvoicesResponse = InvoiceConnector;

export type ItemConnector = {
  __typename?: 'ItemConnector';
  nodes: Array<ItemNode>;
  totalCount: Scalars['Int'];
};

export type ItemDoesNotMatchStockLine = InsertOutboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename?: 'ItemDoesNotMatchStockLine';
  description: Scalars['String'];
};

export type ItemFilterInput = {
  code?: InputMaybe<SimpleStringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  isVisible?: InputMaybe<EqualFilterBooleanInput>;
  name?: InputMaybe<SimpleStringFilterInput>;
};

export type ItemNode = {
  __typename?: 'ItemNode';
  availableBatches: StockLineConnector;
  code: Scalars['String'];
  id: Scalars['String'];
  isVisible: Scalars['Boolean'];
  name: Scalars['String'];
  stats: ItemStatsNode;
  unitName?: Maybe<Scalars['String']>;
};


export type ItemNodeAvailableBatchesArgs = {
  storeId: Scalars['String'];
};


export type ItemNodeStatsArgs = {
  lookBackDatetime?: InputMaybe<Scalars['NaiveDateTime']>;
  storeId: Scalars['String'];
};

export enum ItemSortFieldInput {
  Code = 'code',
  Name = 'name'
}

export type ItemSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: ItemSortFieldInput;
};

export type ItemStatsNode = {
  __typename?: 'ItemStatsNode';
  availableMonthsOfStockOnHand: Scalars['Float'];
  availableStockOnHand: Scalars['Int'];
  averageMonthlyConsumption: Scalars['Int'];
};

export type ItemsResponse = ItemConnector;

export type LineDoesNotReferenceStockLine = UpdateOutboundShipmentLineErrorInterface & {
  __typename?: 'LineDoesNotReferenceStockLine';
  description: Scalars['String'];
};

export type LocationConnector = {
  __typename?: 'LocationConnector';
  nodes: Array<LocationNode>;
  totalCount: Scalars['Int'];
};

export type LocationFilterInput = {
  code?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<EqualFilterStringInput>;
};

export type LocationInUse = DeleteLocationErrorInterface & {
  __typename?: 'LocationInUse';
  description: Scalars['String'];
  invoiceLines: InvoiceLineConnector;
  stockLines: StockLineConnector;
};

export type LocationIsOnHold = InsertOutboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename?: 'LocationIsOnHold';
  description: Scalars['String'];
};

export type LocationNode = {
  __typename?: 'LocationNode';
  code: Scalars['String'];
  id: Scalars['String'];
  name: Scalars['String'];
  onHold: Scalars['Boolean'];
  stock: StockLineConnector;
};

export type LocationNotFound = InsertOutboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename?: 'LocationNotFound';
  description: Scalars['String'];
};

export type LocationResponse = LocationNode | NodeError;

export enum LocationSortFieldInput {
  Code = 'code',
  Name = 'name'
}

export type LocationSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: LocationSortFieldInput;
};

export type LocationsResponse = LocationConnector;

export type Logout = {
  __typename?: 'Logout';
  /** User id of the logged out user */
  userId: Scalars['String'];
};

export type LogoutError = {
  __typename?: 'LogoutError';
  error: LogoutErrorInterface;
};

export type LogoutErrorInterface = {
  description: Scalars['String'];
};

export type LogoutResponse = Logout | LogoutError;

export type MasterListConnector = {
  __typename?: 'MasterListConnector';
  nodes: Array<MasterListNode>;
  totalCount: Scalars['Int'];
};

export type MasterListFilterInput = {
  code?: InputMaybe<SimpleStringFilterInput>;
  description?: InputMaybe<SimpleStringFilterInput>;
  existsForName?: InputMaybe<SimpleStringFilterInput>;
  existsForNameId?: InputMaybe<EqualFilterStringInput>;
  existsForStoreId?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<SimpleStringFilterInput>;
};

export type MasterListLineConnector = {
  __typename?: 'MasterListLineConnector';
  nodes: Array<MasterListLineNode>;
  totalCount: Scalars['Int'];
};

export type MasterListLineNode = {
  __typename?: 'MasterListLineNode';
  id: Scalars['String'];
  item: ItemNode;
  itemId: Scalars['String'];
};

export type MasterListNode = {
  __typename?: 'MasterListNode';
  code: Scalars['String'];
  description: Scalars['String'];
  id: Scalars['String'];
  lines: MasterListLineConnector;
  name: Scalars['String'];
};

export type MasterListNotFoundForThisStore = AddFromMasterListErrorInterface & {
  __typename?: 'MasterListNotFoundForThisStore';
  description: Scalars['String'];
};

export enum MasterListSortFieldInput {
  Code = 'code',
  Description = 'description',
  Name = 'name'
}

export type MasterListSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: MasterListSortFieldInput;
};

export type MasterListsResponse = MasterListConnector;

export type Mutations = {
  __typename?: 'Mutations';
  /** Add requisition lines from master item master list */
  addFromMasterList: AddFromMasterListResponse;
  batchInboundShipment: BatchInboundShipmentResponse;
  batchOutboundShipment: BatchOutboundShipmentResponse;
  batchStocktake: BatchStocktakeResponse;
  /**
   * Create shipment for response requisition
   * Will create Outbound Shipment with placeholder lines for each requisition line
   * placeholder line quantity will be set to requisitionLine.supply - all linked outbound shipments
   * lines quantity (placeholder and filled) for requisitionLine.item
   */
  createRequisitionShipment: CreateRequisitionShipmentResponse;
  deleteInboundShipment: DeleteInboundShipmentResponse;
  deleteInboundShipmentLine: DeleteInboundShipmentLineResponse;
  deleteLocation: DeleteLocationResponse;
  deleteOutboundShipment: DeleteOutboundShipmentResponse;
  deleteOutboundShipmentLine: DeleteOutboundShipmentLineResponse;
  deleteOutboundShipmentServiceLine: DeleteOutboundShipmentServiceLineResponse;
  deleteOutboundShipmentUnallocatedLine: DeleteOutboundShipmentUnallocatedLineResponse;
  deleteRequestRequisition: DeleteRequestRequisitionResponse;
  deleteRequestRequisitionLine: DeleteRequestRequisitionLineResponse;
  deleteStocktake: DeleteStocktakeResponse;
  deleteStocktakeLine: DeleteStocktakeLineResponse;
  insertInboundShipment: InsertInboundShipmentResponse;
  insertInboundShipmentLine: InsertInboundShipmentLineResponse;
  insertLocation: InsertLocationResponse;
  insertOutboundShipment: InsertOutboundShipmentResponse;
  insertOutboundShipmentLine: InsertOutboundShipmentLineResponse;
  insertOutboundShipmentServiceLine: InsertOutboundShipmentServiceLineResponse;
  insertOutboundShipmentUnallocatedLine: InsertOutboundShipmentUnallocatedLineResponse;
  insertRequestRequisition: InsertRequestRequisitionResponse;
  insertRequestRequisitionLine: InsertRequestRequisitionLineResponse;
  insertStocktake: InsertStocktakeResponse;
  insertStocktakeLine: InsertStocktakeLineResponse;
  registerUser: UserRegisterResponse;
  /** Set supply quantity to requested quantity */
  supplyRequestedQuantity: SupplyRequestedQuantityResponse;
  updateInboundShipment: UpdateInboundShipmentResponse;
  updateInboundShipmentLine: UpdateInboundShipmentLineResponse;
  updateLocation: UpdateLocationResponse;
  updateOutboundShipment: UpdateOutboundShipmentResponse;
  updateOutboundShipmentLine: UpdateOutboundShipmentLineResponse;
  updateOutboundShipmentServiceLine: UpdateOutboundShipmentServiceLineResponse;
  updateOutboundShipmentUnallocatedLine: UpdateOutboundShipmentUnallocatedLineResponse;
  updateRequestRequisition: UpdateRequestRequisitionResponse;
  updateRequestRequisitionLine: UpdateRequestRequisitionLineResponse;
  updateResponseRequisition: UpdateResponseRequisitionResponse;
  updateResponseRequisitionLine: UpdateResponseRequisitionLineResponse;
  updateStocktake: UpdateStocktakeResponse;
  updateStocktakeLine: UpdateStocktakeLineResponse;
  /** Set requested for each line in request requisition to calculated */
  useSuggestedQuantity: UseSuggestedQuantityResponse;
};


export type MutationsAddFromMasterListArgs = {
  input: AddFromMasterListInput;
  storeId: Scalars['String'];
};


export type MutationsBatchInboundShipmentArgs = {
  input: BatchInboundShipmentInput;
  storeId: Scalars['String'];
};


export type MutationsBatchOutboundShipmentArgs = {
  input: BatchOutboundShipmentInput;
  storeId: Scalars['String'];
};


export type MutationsBatchStocktakeArgs = {
  input: BatchStocktakeInput;
  storeId: Scalars['String'];
};


export type MutationsCreateRequisitionShipmentArgs = {
  input: CreateRequisitionShipmentInput;
  storeId: Scalars['String'];
};


export type MutationsDeleteInboundShipmentArgs = {
  input: DeleteInboundShipmentInput;
};


export type MutationsDeleteInboundShipmentLineArgs = {
  input: DeleteInboundShipmentLineInput;
};


export type MutationsDeleteLocationArgs = {
  input: DeleteLocationInput;
  storeId: Scalars['String'];
};


export type MutationsDeleteOutboundShipmentArgs = {
  id: Scalars['String'];
};


export type MutationsDeleteOutboundShipmentLineArgs = {
  input: DeleteOutboundShipmentLineInput;
};


export type MutationsDeleteOutboundShipmentServiceLineArgs = {
  input: DeleteOutboundShipmentServiceLineInput;
};


export type MutationsDeleteOutboundShipmentUnallocatedLineArgs = {
  input: DeleteOutboundShipmentUnallocatedLineInput;
};


export type MutationsDeleteRequestRequisitionArgs = {
  input: DeleteRequestRequisitionInput;
  storeId: Scalars['String'];
};


export type MutationsDeleteRequestRequisitionLineArgs = {
  input: DeleteRequestRequisitionLineInput;
  storeId: Scalars['String'];
};


export type MutationsDeleteStocktakeArgs = {
  input: DeleteStocktakeInput;
  storeId: Scalars['String'];
};


export type MutationsDeleteStocktakeLineArgs = {
  input: DeleteStocktakeLineInput;
  storeId: Scalars['String'];
};


export type MutationsInsertInboundShipmentArgs = {
  input: InsertInboundShipmentInput;
  storeId: Scalars['String'];
};


export type MutationsInsertInboundShipmentLineArgs = {
  input: InsertInboundShipmentLineInput;
};


export type MutationsInsertLocationArgs = {
  input: InsertLocationInput;
  storeId: Scalars['String'];
};


export type MutationsInsertOutboundShipmentArgs = {
  input: InsertOutboundShipmentInput;
  storeId: Scalars['String'];
};


export type MutationsInsertOutboundShipmentLineArgs = {
  input: InsertOutboundShipmentLineInput;
};


export type MutationsInsertOutboundShipmentServiceLineArgs = {
  input: InsertOutboundShipmentServiceLineInput;
};


export type MutationsInsertOutboundShipmentUnallocatedLineArgs = {
  input: InsertOutboundShipmentUnallocatedLineInput;
};


export type MutationsInsertRequestRequisitionArgs = {
  input: InsertRequestRequisitionInput;
  storeId: Scalars['String'];
};


export type MutationsInsertRequestRequisitionLineArgs = {
  input: InsertRequestRequisitionLineInput;
  storeId: Scalars['String'];
};


export type MutationsInsertStocktakeArgs = {
  input: InsertStocktakeInput;
  storeId: Scalars['String'];
};


export type MutationsInsertStocktakeLineArgs = {
  input: InsertStocktakeLineInput;
  storeId: Scalars['String'];
};


export type MutationsRegisterUserArgs = {
  input: UserRegisterInput;
};


export type MutationsSupplyRequestedQuantityArgs = {
  input: SupplyRequestedQuantityInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateInboundShipmentArgs = {
  input: UpdateInboundShipmentInput;
};


export type MutationsUpdateInboundShipmentLineArgs = {
  input: UpdateInboundShipmentLineInput;
};


export type MutationsUpdateLocationArgs = {
  input: UpdateLocationInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateOutboundShipmentArgs = {
  input: UpdateOutboundShipmentInput;
};


export type MutationsUpdateOutboundShipmentLineArgs = {
  input: UpdateOutboundShipmentLineInput;
};


export type MutationsUpdateOutboundShipmentServiceLineArgs = {
  input: UpdateOutboundShipmentServiceLineInput;
};


export type MutationsUpdateOutboundShipmentUnallocatedLineArgs = {
  input: UpdateOutboundShipmentUnallocatedLineInput;
};


export type MutationsUpdateRequestRequisitionArgs = {
  input: UpdateRequestRequisitionInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateRequestRequisitionLineArgs = {
  input: UpdateRequestRequisitionLineInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateResponseRequisitionArgs = {
  input: UpdateResponseRequisitionInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateResponseRequisitionLineArgs = {
  input: UpdateResponseRequisitionLineInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateStocktakeArgs = {
  input: UpdateStocktakeInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateStocktakeLineArgs = {
  input: UpdateStocktakeLineInput;
  storeId: Scalars['String'];
};


export type MutationsUseSuggestedQuantityArgs = {
  input: UseSuggestedQuantityInput;
  storeId: Scalars['String'];
};

export type NameConnector = {
  __typename?: 'NameConnector';
  nodes: Array<NameNode>;
  totalCount: Scalars['Int'];
};

export type NameFilterInput = {
  /** Filter by code */
  code?: InputMaybe<SimpleStringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  /** Filter by customer property */
  isCustomer?: InputMaybe<Scalars['Boolean']>;
  /** Filter by supplier property */
  isSupplier?: InputMaybe<Scalars['Boolean']>;
  /** Filter by name */
  name?: InputMaybe<SimpleStringFilterInput>;
};

export type NameNode = {
  __typename?: 'NameNode';
  code: Scalars['String'];
  id: Scalars['String'];
  isCustomer: Scalars['Boolean'];
  isSupplier: Scalars['Boolean'];
  name: Scalars['String'];
  store?: Maybe<StoreNode>;
};

export type NameResponse = NameNode | NodeError;

export enum NameSortFieldInput {
  Code = 'code',
  Name = 'name'
}

export type NameSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: NameSortFieldInput;
};

export type NamesResponse = NameConnector;

export type NoRefreshTokenProvided = RefreshTokenErrorInterface & {
  __typename?: 'NoRefreshTokenProvided';
  description: Scalars['String'];
};

/** Generic Error Wrapper */
export type NodeError = {
  __typename?: 'NodeError';
  error: NodeErrorInterface;
};

export type NodeErrorInterface = {
  description: Scalars['String'];
};

export type NotARefreshToken = RefreshTokenErrorInterface & {
  __typename?: 'NotARefreshToken';
  description: Scalars['String'];
};

export type NotAServiceItem = DeleteOutboundShipmentServiceLineErrorInterface & InsertOutboundShipmentServiceLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & {
  __typename?: 'NotAServiceItem';
  description: Scalars['String'];
};

export type NotAnInboundShipment = DeleteInboundShipmentErrorInterface & DeleteInboundShipmentLineErrorInterface & InsertInboundShipmentLineErrorInterface & UpdateInboundShipmentErrorInterface & UpdateInboundShipmentLineErrorInterface & {
  __typename?: 'NotAnInboundShipment';
  description: Scalars['String'];
};

export type NotAnOutboundShipment = DeleteErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & InsertOutboundShipmentLineErrorInterface & InsertOutboundShipmentServiceLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & {
  __typename?: 'NotAnOutboundShipment';
  description: Scalars['String'];
};

export type NotAnOutboundShipmentError = UpdateErrorInterface & {
  __typename?: 'NotAnOutboundShipmentError';
  description: Scalars['String'];
};

export type NotEnoughStockForReduction = InsertOutboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename?: 'NotEnoughStockForReduction';
  batch: StockLineResponse;
  description: Scalars['String'];
  line?: Maybe<InvoiceLineResponse>;
};

export type NothingRemainingToSupply = CreateRequisitionShipmentErrorInterface & {
  __typename?: 'NothingRemainingToSupply';
  description: Scalars['String'];
};

export type OtherPartyCannotBeThisStoreError = InsertErrorInterface & UpdateErrorInterface & {
  __typename?: 'OtherPartyCannotBeThisStoreError';
  description: Scalars['String'];
};

export type OtherPartyNotACustomerError = InsertErrorInterface & UpdateErrorInterface & {
  __typename?: 'OtherPartyNotACustomerError';
  description: Scalars['String'];
  otherParty: NameNode;
};

export type OtherPartyNotASupplier = InsertInboundShipmentErrorInterface & InsertRequestRequisitionErrorInterface & UpdateInboundShipmentErrorInterface & {
  __typename?: 'OtherPartyNotASupplier';
  description: Scalars['String'];
  otherParty: NameNode;
};

export type OutboundInvoiceCounts = {
  __typename?: 'OutboundInvoiceCounts';
  created: InvoiceCountsSummary;
  /** Number of outbound shipments ready to be picked */
  toBePicked: Scalars['Int'];
};

/**
 * Pagination input.
 *
 * Option to limit the number of returned items and/or queries large lists in "pages".
 */
export type PaginationInput = {
  /** Max number of returned items */
  first?: InputMaybe<Scalars['Int']>;
  /** First returned item is at the `offset` position in the full list */
  offset?: InputMaybe<Scalars['Int']>;
};

export type Queries = {
  __typename?: 'Queries';
  apiVersion: Scalars['String'];
  /**
   * Retrieves a new auth bearer and refresh token
   * The refresh token is returned as a cookie
   */
  authToken: AuthTokenResponse;
  invoice: InvoiceResponse;
  invoiceByNumber: InvoiceResponse;
  invoiceCounts: InvoiceCounts;
  invoices: InvoicesResponse;
  /** Query omSupply "item" entries */
  items: ItemsResponse;
  /** Query omSupply "locations" entries */
  locations: LocationsResponse;
  logout: LogoutResponse;
  /** Query omSupply "master_lists" entries */
  masterLists: MasterListsResponse;
  me: UserResponse;
  /** Query omSupply "name" entries */
  names: NamesResponse;
  /**
   * Retrieves a new auth bearer and refresh token
   * The refresh token is returned as a cookie
   */
  refreshToken: RefreshTokenResponse;
  requisition: RequisitionResponse;
  requisitionByNumber: RequisitionResponse;
  requisitions: RequisitionsResponse;
  stockCounts: StockCounts;
  stocktake: StocktakeResponse;
  stocktakeByNumber: StocktakeResponse;
  stocktakes: StocktakesResponse;
  stores: StoresResponse;
};


export type QueriesAuthTokenArgs = {
  password: Scalars['String'];
  username: Scalars['String'];
};


export type QueriesInvoiceArgs = {
  id: Scalars['String'];
  storeId: Scalars['String'];
};


export type QueriesInvoiceByNumberArgs = {
  invoiceNumber: Scalars['Int'];
  storeId: Scalars['String'];
  type: InvoiceNodeType;
};


export type QueriesInvoiceCountsArgs = {
  timezoneOffset?: InputMaybe<Scalars['Int']>;
};


export type QueriesInvoicesArgs = {
  filter?: InputMaybe<InvoiceFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<InvoiceSortInput>>;
  storeId: Scalars['String'];
};


export type QueriesItemsArgs = {
  filter?: InputMaybe<ItemFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<ItemSortInput>>;
};


export type QueriesLocationsArgs = {
  filter?: InputMaybe<LocationFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<LocationSortInput>>;
};


export type QueriesMasterListsArgs = {
  filter?: InputMaybe<MasterListFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<MasterListSortInput>>;
};


export type QueriesNamesArgs = {
  filter?: InputMaybe<NameFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<NameSortInput>>;
};


export type QueriesRequisitionArgs = {
  id: Scalars['String'];
  storeId: Scalars['String'];
};


export type QueriesRequisitionByNumberArgs = {
  requisitionNumber: Scalars['Int'];
  storeId: Scalars['String'];
  type: RequisitionNodeType;
};


export type QueriesRequisitionsArgs = {
  filter?: InputMaybe<RequisitionFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<RequisitionSortInput>>;
  storeId: Scalars['String'];
};


export type QueriesStockCountsArgs = {
  daysTillExpired?: InputMaybe<Scalars['Int']>;
  timezoneOffset?: InputMaybe<Scalars['Int']>;
};


export type QueriesStocktakeArgs = {
  id: Scalars['String'];
  storeId: Scalars['String'];
};


export type QueriesStocktakeByNumberArgs = {
  stocktakeNumber: Scalars['Int'];
  storeId: Scalars['String'];
};


export type QueriesStocktakesArgs = {
  filter?: InputMaybe<StocktakeFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<StocktakeSortInput>>;
  storeId: Scalars['String'];
};


export type QueriesStoresArgs = {
  filter?: InputMaybe<StoreFilterInput>;
  page?: InputMaybe<PaginationInput>;
};

export type RangeError = InsertInboundShipmentLineErrorInterface & InsertOutboundShipmentLineErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename?: 'RangeError';
  description: Scalars['String'];
  field: RangeField;
  max?: Maybe<Scalars['Int']>;
  min?: Maybe<Scalars['Int']>;
};

export enum RangeField {
  First = 'first',
  NumberOfPacks = 'numberOfPacks',
  PackSize = 'packSize'
}

export type RecordAlreadyExist = InsertErrorInterface & InsertInboundShipmentErrorInterface & InsertInboundShipmentLineErrorInterface & InsertLocationErrorInterface & InsertOutboundShipmentLineErrorInterface & InsertOutboundShipmentServiceLineErrorInterface & UserRegisterErrorInterface & {
  __typename?: 'RecordAlreadyExist';
  description: Scalars['String'];
};

export type RecordBelongsToAnotherStore = DeleteLocationErrorInterface & UpdateLocationErrorInterface & {
  __typename?: 'RecordBelongsToAnotherStore';
  description: Scalars['String'];
};

export type RecordDoesNotExist = AddFromMasterListErrorInterface & CreateRequisitionShipmentErrorInterface & DeleteOutboundShipmentUnallocatedLineErrorInterface & DeleteRequestRequisitionErrorInterface & DeleteRequestRequisitionLineErrorInterface & SupplyRequestedQuantityErrorInterface & UpdateOutboundShipmentUnallocatedLineErrorInterface & UpdateRequestRequisitionErrorInterface & UpdateRequestRequisitionLineErrorInterface & UpdateResponseRequisitionErrorInterface & UpdateResponseRequisitionLineErrorInterface & UseSuggestedQuantityErrorInterface & {
  __typename?: 'RecordDoesNotExist';
  description: Scalars['String'];
};

export type RecordNotFound = DeleteErrorInterface & DeleteInboundShipmentErrorInterface & DeleteInboundShipmentLineErrorInterface & DeleteLocationErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & NodeErrorInterface & UpdateErrorInterface & UpdateInboundShipmentErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateLocationErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & {
  __typename?: 'RecordNotFound';
  description: Scalars['String'];
};

export type RefreshToken = {
  __typename?: 'RefreshToken';
  /** New Bearer token */
  token: Scalars['String'];
};

export type RefreshTokenError = {
  __typename?: 'RefreshTokenError';
  error: RefreshTokenErrorInterface;
};

export type RefreshTokenErrorInterface = {
  description: Scalars['String'];
};

export type RefreshTokenResponse = RefreshToken | RefreshTokenError;

export type RegisteredUser = {
  __typename?: 'RegisteredUser';
  email?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  username: Scalars['String'];
};

export type RequisitionConnector = {
  __typename?: 'RequisitionConnector';
  nodes: Array<RequisitionNode>;
  totalCount: Scalars['Int'];
};

export type RequisitionFilterInput = {
  colour?: InputMaybe<EqualFilterStringInput>;
  comment?: InputMaybe<SimpleStringFilterInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  finalisedDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  otherPartyId?: InputMaybe<EqualFilterStringInput>;
  otherPartyName?: InputMaybe<SimpleStringFilterInput>;
  requisitionNumber?: InputMaybe<EqualFilterBigNumberInput>;
  sentDatetime?: InputMaybe<DatetimeFilterInput>;
  status?: InputMaybe<EqualFilterRequisitionStatusInput>;
  theirReference?: InputMaybe<SimpleStringFilterInput>;
  type?: InputMaybe<EqualFilterRequisitionTypeInput>;
};

export type RequisitionLineConnector = {
  __typename?: 'RequisitionLineConnector';
  nodes: Array<RequisitionLineNode>;
  totalCount: Scalars['Int'];
};

export type RequisitionLineNode = {
  __typename?: 'RequisitionLineNode';
  id: Scalars['String'];
  /** InboundShipment lines linked to requisitions line */
  inboundShipmentLines: InvoiceLineConnector;
  item: ItemNode;
  itemId: Scalars['String'];
  /** Snapshot Stats (when requisition was created) */
  itemStats: ItemStatsNode;
  linkedRequisitionLine?: Maybe<RequisitionLineNode>;
  /** OutboundShipment lines linked to requisitions line */
  outboundShipmentLines: InvoiceLineConnector;
  /** Quantity requested */
  requestedQuantity: Scalars['Int'];
  /**
   * Calculated quantity
   * When months_of_stock < requisition.min_months_of_stock, calculated = average_monthy_consumption * requisition.max_months_of_stock - months_of_stock
   */
  suggestedQuantity: Scalars['Int'];
  /** Quantity to be supplied in the next shipment, only used in response requisition */
  supplyQuantity: Scalars['Int'];
};

export type RequisitionLineWithItemIdExists = InsertRequestRequisitionLineErrorInterface & {
  __typename?: 'RequisitionLineWithItemIdExists';
  description: Scalars['String'];
};

export type RequisitionNode = {
  __typename?: 'RequisitionNode';
  colour?: Maybe<Scalars['String']>;
  comment?: Maybe<Scalars['String']>;
  createdDatetime: Scalars['DateTime'];
  finalisedDatetime?: Maybe<Scalars['DateTime']>;
  id: Scalars['String'];
  lines: RequisitionLineConnector;
  /** Maximum calculated quantity, used to deduce calculated quantity for each line, see calculated in requisition line */
  maxMonthsOfStock: Scalars['Float'];
  /** Minimum quantity to have for stock to be ordered, used to deduce calculated quantity for each line, see calculated in requisition line */
  minMonthsOfStock: Scalars['Float'];
  /**
   * Request Requisition: Supplying store (store that is supplying stock)
   * Response Requisition: Customer store (store that is ordering stock)
   */
  otherParty: NameNode;
  otherPartyId: Scalars['String'];
  otherPartyName: Scalars['String'];
  /** Link to request requisition */
  requestRequisition?: Maybe<RequisitionNode>;
  requisitionNumber: Scalars['Int'];
  /** Applicable to request requisition only */
  sentDatetime?: Maybe<Scalars['DateTime']>;
  /**
   * Response Requisition: Outbound Shipments linked requisition
   * Request Requisition: Inbound Shipments linked to requisition
   */
  shipments: InvoiceConnector;
  status: RequisitionNodeStatus;
  theirReference?: Maybe<Scalars['String']>;
  type: RequisitionNodeType;
};

export enum RequisitionNodeStatus {
  /** New requisition when manually created */
  Draft = 'DRAFT',
  /**
   * Response requisition: When supplier finished fulfilling requisition, locked for future editing
   * Request requisition: When response requisition is finalised
   */
  Finalised = 'FINALISED',
  /** New requisition when automatically created, only applicable to response requisition when it's duplicated in supplying store from request requisition */
  New = 'NEW',
  /** Request requisition is sent and locked for future editing, only applicable to request requisition */
  Sent = 'SENT'
}

export enum RequisitionNodeType {
  /** Requisition created by store that is ordering stock */
  Request = 'REQUEST',
  /** Supplying store requisition in response to request requisition */
  Response = 'RESPONSE'
}

export type RequisitionResponse = RecordNotFound | RequisitionNode;

export enum RequisitionSortFieldInput {
  CreatedDatetime = 'createdDatetime',
  FinalisedDatetime = 'finalisedDatetime',
  OtherPartyName = 'otherPartyName',
  RequisitionNumber = 'requisitionNumber',
  SentDatetime = 'sentDatetime',
  Status = 'status',
  Type = 'type'
}

export type RequisitionSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: RequisitionSortFieldInput;
};

export type RequisitionsResponse = RequisitionConnector;

export type SimpleStringFilterInput = {
  /** Search term must be an exact match (case sensitive) */
  equalTo?: InputMaybe<Scalars['String']>;
  /** Search term must be included in search candidate (case insensitive) */
  like?: InputMaybe<Scalars['String']>;
};

export type SnapshotCountCurrentCountMismatch = UpdateStocktakeErrorInterface & {
  __typename?: 'SnapshotCountCurrentCountMismatch';
  description: Scalars['String'];
  lines: StocktakeLineConnector;
};

export type StockCounts = {
  __typename?: 'StockCounts';
  expired: Scalars['Int'];
  expiringSoon: Scalars['Int'];
};

export type StockLineAlreadyExistsInInvoice = InsertOutboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename?: 'StockLineAlreadyExistsInInvoice';
  description: Scalars['String'];
  line: InvoiceLineResponse;
};

export type StockLineConnector = {
  __typename?: 'StockLineConnector';
  nodes: Array<StockLineNode>;
  totalCount: Scalars['Int'];
};

export type StockLineDoesNotBelongToCurrentStore = InsertOutboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename?: 'StockLineDoesNotBelongToCurrentStore';
  description: Scalars['String'];
};

export type StockLineIsOnHold = InsertOutboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename?: 'StockLineIsOnHold';
  description: Scalars['String'];
};

export type StockLineNode = {
  __typename?: 'StockLineNode';
  availableNumberOfPacks: Scalars['Int'];
  batch?: Maybe<Scalars['String']>;
  costPricePerPack: Scalars['Float'];
  expiryDate?: Maybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  itemId: Scalars['String'];
  location?: Maybe<LocationResponse>;
  locationId?: Maybe<Scalars['String']>;
  locationName?: Maybe<Scalars['String']>;
  note?: Maybe<Scalars['String']>;
  onHold: Scalars['Boolean'];
  packSize: Scalars['Int'];
  sellPricePerPack: Scalars['Float'];
  storeId: Scalars['String'];
  totalNumberOfPacks: Scalars['Int'];
};

export type StockLineResponse = NodeError | StockLineNode;

export type StocktakeConnector = {
  __typename?: 'StocktakeConnector';
  nodes: Array<StocktakeNode>;
  totalCount: Scalars['Int'];
};

export type StocktakeFilterInput = {
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  finalisedDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  status?: InputMaybe<EqualFilterStocktakeStatusInput>;
  stocktakeNumber?: InputMaybe<EqualFilterBigNumberInput>;
};

export type StocktakeLineConnector = {
  __typename?: 'StocktakeLineConnector';
  nodes: Array<StocktakeLineNode>;
  totalCount: Scalars['Int'];
};

export type StocktakeLineNode = {
  __typename?: 'StocktakeLineNode';
  batch?: Maybe<Scalars['String']>;
  comment?: Maybe<Scalars['String']>;
  costPricePerPack?: Maybe<Scalars['Float']>;
  countedNumberOfPacks?: Maybe<Scalars['Int']>;
  expiryDate?: Maybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  item: ItemNode;
  itemId: Scalars['String'];
  location?: Maybe<LocationNode>;
  note?: Maybe<Scalars['String']>;
  packSize?: Maybe<Scalars['Int']>;
  sellPricePerPack?: Maybe<Scalars['Float']>;
  snapshotNumberOfPacks: Scalars['Int'];
  stockLine?: Maybe<StockLineNode>;
  stocktakeId: Scalars['String'];
};

export type StocktakeNode = {
  __typename?: 'StocktakeNode';
  comment?: Maybe<Scalars['String']>;
  createdDatetime: Scalars['NaiveDateTime'];
  description?: Maybe<Scalars['String']>;
  finalisedDatetime?: Maybe<Scalars['NaiveDateTime']>;
  id: Scalars['String'];
  inventoryAdjustment?: Maybe<InvoiceNode>;
  inventoryAdjustmentId?: Maybe<Scalars['String']>;
  lines: StocktakeLineConnector;
  status: StocktakeNodeStatus;
  stocktakeNumber: Scalars['Int'];
  storeId: Scalars['String'];
};

export enum StocktakeNodeStatus {
  Finalised = 'FINALISED',
  New = 'NEW'
}

export type StocktakeResponse = NodeError | StocktakeNode;

export enum StocktakeSortFieldInput {
  CreatedDatetime = 'createdDatetime',
  FinalisedDatetime = 'finalisedDatetime',
  Status = 'status'
}

export type StocktakeSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: StocktakeSortFieldInput;
};

export type StocktakesResponse = StocktakeConnector;

export type StoreConnector = {
  __typename?: 'StoreConnector';
  nodes: Array<StoreNode>;
  totalCount: Scalars['Int'];
};

export type StoreFilterInput = {
  id?: InputMaybe<SimpleStringFilterInput>;
};

export type StoreNode = {
  __typename?: 'StoreNode';
  code: Scalars['String'];
  id: Scalars['String'];
};

export type StoresResponse = StoreConnector;

export type SupplyRequestedQuantityError = {
  __typename?: 'SupplyRequestedQuantityError';
  error: SupplyRequestedQuantityErrorInterface;
};

export type SupplyRequestedQuantityErrorInterface = {
  description: Scalars['String'];
};

export type SupplyRequestedQuantityInput = {
  responseRequisitionId: Scalars['String'];
};

export type SupplyRequestedQuantityResponse = RequisitionLineConnector | SupplyRequestedQuantityError;

export type TaxUpdate = {
  /** Set or unset the tax value (in percentage) */
  percentage?: InputMaybe<Scalars['Float']>;
};

export type TokenExpired = RefreshTokenErrorInterface & {
  __typename?: 'TokenExpired';
  description: Scalars['String'];
};

export type UnallocatedLineForItemAlreadyExists = InsertOutboundShipmentUnallocatedLineErrorInterface & {
  __typename?: 'UnallocatedLineForItemAlreadyExists';
  description: Scalars['String'];
};

export type UnallocatedLinesOnlyEditableInNewInvoice = InsertOutboundShipmentUnallocatedLineErrorInterface & {
  __typename?: 'UnallocatedLinesOnlyEditableInNewInvoice';
  description: Scalars['String'];
};

export enum UniqueValueKey {
  Code = 'code'
}

export type UniqueValueViolation = InsertLocationErrorInterface & UpdateLocationErrorInterface & {
  __typename?: 'UniqueValueViolation';
  description: Scalars['String'];
  field: UniqueValueKey;
};

export type UpdateErrorInterface = {
  description: Scalars['String'];
};

export type UpdateInboundShipmentError = {
  __typename?: 'UpdateInboundShipmentError';
  error: UpdateInboundShipmentErrorInterface;
};

export type UpdateInboundShipmentErrorInterface = {
  description: Scalars['String'];
};

export type UpdateInboundShipmentInput = {
  colour?: InputMaybe<Scalars['String']>;
  comment?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  onHold?: InputMaybe<Scalars['Boolean']>;
  otherPartyId?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<UpdateInboundShipmentStatusInput>;
  theirReference?: InputMaybe<Scalars['String']>;
};

export type UpdateInboundShipmentLineError = {
  __typename?: 'UpdateInboundShipmentLineError';
  error: UpdateInboundShipmentLineErrorInterface;
};

export type UpdateInboundShipmentLineErrorInterface = {
  description: Scalars['String'];
};

export type UpdateInboundShipmentLineInput = {
  batch?: InputMaybe<Scalars['String']>;
  costPricePerPack?: InputMaybe<Scalars['Float']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId?: InputMaybe<Scalars['String']>;
  locationId?: InputMaybe<Scalars['String']>;
  numberOfPacks?: InputMaybe<Scalars['Int']>;
  packSize?: InputMaybe<Scalars['Int']>;
  sellPricePerPack?: InputMaybe<Scalars['Float']>;
};

export type UpdateInboundShipmentLineResponse = InvoiceLineNode | NodeError | UpdateInboundShipmentLineError;

export type UpdateInboundShipmentLineResponseWithId = {
  __typename?: 'UpdateInboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: UpdateInboundShipmentLineResponse;
};

export type UpdateInboundShipmentResponse = InvoiceNode | NodeError | UpdateInboundShipmentError;

export type UpdateInboundShipmentResponseWithId = {
  __typename?: 'UpdateInboundShipmentResponseWithId';
  id: Scalars['String'];
  response: UpdateInboundShipmentResponse;
};

export enum UpdateInboundShipmentStatusInput {
  Delivered = 'DELIVERED',
  Verified = 'VERIFIED'
}

export type UpdateLocationError = {
  __typename?: 'UpdateLocationError';
  error: UpdateLocationErrorInterface;
};

export type UpdateLocationErrorInterface = {
  description: Scalars['String'];
};

export type UpdateLocationInput = {
  code?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  name?: InputMaybe<Scalars['String']>;
  onHold?: InputMaybe<Scalars['Boolean']>;
};

export type UpdateLocationResponse = LocationNode | UpdateLocationError;

export type UpdateOutboundShipmentError = {
  __typename?: 'UpdateOutboundShipmentError';
  error: UpdateErrorInterface;
};

export type UpdateOutboundShipmentInput = {
  colour?: InputMaybe<Scalars['String']>;
  comment?: InputMaybe<Scalars['String']>;
  /** The new invoice id provided by the client */
  id: Scalars['String'];
  onHold?: InputMaybe<Scalars['Boolean']>;
  /**
   * The other party must be a customer of the current store.
   * This field can be used to change the other_party of an invoice
   */
  otherPartyId?: InputMaybe<Scalars['String']>;
  /**
   * When changing the status from DRAFT to CONFIRMED or FINALISED the total_number_of_packs for
   * existing invoice items gets updated.
   */
  status?: InputMaybe<UpdateOutboundShipmentStatusInput>;
  /** External invoice reference, e.g. purchase or shipment number */
  theirReference?: InputMaybe<Scalars['String']>;
};

export type UpdateOutboundShipmentLineError = {
  __typename?: 'UpdateOutboundShipmentLineError';
  error: UpdateOutboundShipmentLineErrorInterface;
};

export type UpdateOutboundShipmentLineErrorInterface = {
  description: Scalars['String'];
};

export type UpdateOutboundShipmentLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId?: InputMaybe<Scalars['String']>;
  numberOfPacks?: InputMaybe<Scalars['Int']>;
  stockLineId?: InputMaybe<Scalars['String']>;
  tax?: InputMaybe<TaxUpdate>;
  totalAfterTax?: InputMaybe<Scalars['Float']>;
  totalBeforeTax?: InputMaybe<Scalars['Float']>;
};

export type UpdateOutboundShipmentLineResponse = InvoiceLineNode | NodeError | UpdateOutboundShipmentLineError;

export type UpdateOutboundShipmentLineResponseWithId = {
  __typename?: 'UpdateOutboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: UpdateOutboundShipmentLineResponse;
};

export type UpdateOutboundShipmentResponse = InvoiceNode | NodeError | UpdateOutboundShipmentError;

export type UpdateOutboundShipmentResponseWithId = {
  __typename?: 'UpdateOutboundShipmentResponseWithId';
  id: Scalars['String'];
  response: UpdateOutboundShipmentResponse;
};

export type UpdateOutboundShipmentServiceLineError = {
  __typename?: 'UpdateOutboundShipmentServiceLineError';
  error: UpdateOutboundShipmentServiceLineErrorInterface;
};

export type UpdateOutboundShipmentServiceLineErrorInterface = {
  description: Scalars['String'];
};

export type UpdateOutboundShipmentServiceLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  note?: InputMaybe<Scalars['String']>;
  tax?: InputMaybe<TaxUpdate>;
  totalAfterTax?: InputMaybe<Scalars['Float']>;
  totalBeforeTax?: InputMaybe<Scalars['Float']>;
};

export type UpdateOutboundShipmentServiceLineResponse = InvoiceLineNode | UpdateOutboundShipmentServiceLineError;

export type UpdateOutboundShipmentServiceLineResponseWithId = {
  __typename?: 'UpdateOutboundShipmentServiceLineResponseWithId';
  id: Scalars['String'];
  response: UpdateOutboundShipmentServiceLineResponse;
};

export enum UpdateOutboundShipmentStatusInput {
  Allocated = 'ALLOCATED',
  Picked = 'PICKED',
  Shipped = 'SHIPPED'
}

export type UpdateOutboundShipmentUnallocatedLineError = {
  __typename?: 'UpdateOutboundShipmentUnallocatedLineError';
  error: UpdateOutboundShipmentUnallocatedLineErrorInterface;
};

export type UpdateOutboundShipmentUnallocatedLineErrorInterface = {
  description: Scalars['String'];
};

export type UpdateOutboundShipmentUnallocatedLineInput = {
  id: Scalars['String'];
  quantity: Scalars['Int'];
};

export type UpdateOutboundShipmentUnallocatedLineResponse = InvoiceLineNode | UpdateOutboundShipmentUnallocatedLineError;

export type UpdateOutboundShipmentUnallocatedLineResponseWithId = {
  __typename?: 'UpdateOutboundShipmentUnallocatedLineResponseWithId';
  id: Scalars['String'];
  response: UpdateOutboundShipmentUnallocatedLineResponse;
};

export type UpdateRequestRequisitionError = {
  __typename?: 'UpdateRequestRequisitionError';
  error: UpdateRequestRequisitionErrorInterface;
};

export type UpdateRequestRequisitionErrorInterface = {
  description: Scalars['String'];
};

export type UpdateRequestRequisitionInput = {
  colour?: InputMaybe<Scalars['String']>;
  comment?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  maxMonthsOfStock?: InputMaybe<Scalars['Float']>;
  minMonthsOfStock?: InputMaybe<Scalars['Float']>;
  status?: InputMaybe<UpdateRequestRequisitionStatusInput>;
  theirReference?: InputMaybe<Scalars['String']>;
};

export type UpdateRequestRequisitionLineError = {
  __typename?: 'UpdateRequestRequisitionLineError';
  error: UpdateRequestRequisitionLineErrorInterface;
};

export type UpdateRequestRequisitionLineErrorInterface = {
  description: Scalars['String'];
};

export type UpdateRequestRequisitionLineInput = {
  id: Scalars['String'];
  requestedQuantity?: InputMaybe<Scalars['Int']>;
};

export type UpdateRequestRequisitionLineResponse = RequisitionLineNode | UpdateRequestRequisitionLineError;

export type UpdateRequestRequisitionResponse = RequisitionNode | UpdateRequestRequisitionError;

export enum UpdateRequestRequisitionStatusInput {
  Sent = 'SENT'
}

export type UpdateResponseRequisitionError = {
  __typename?: 'UpdateResponseRequisitionError';
  error: UpdateResponseRequisitionErrorInterface;
};

export type UpdateResponseRequisitionErrorInterface = {
  description: Scalars['String'];
};

export type UpdateResponseRequisitionInput = {
  colour?: InputMaybe<Scalars['String']>;
  comment?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  status?: InputMaybe<UpdateResponseRequisitionStatusInput>;
  theirReference?: InputMaybe<Scalars['String']>;
};

export type UpdateResponseRequisitionLineError = {
  __typename?: 'UpdateResponseRequisitionLineError';
  error: UpdateResponseRequisitionLineErrorInterface;
};

export type UpdateResponseRequisitionLineErrorInterface = {
  description: Scalars['String'];
};

export type UpdateResponseRequisitionLineInput = {
  id: Scalars['String'];
  supplyQuantity?: InputMaybe<Scalars['Int']>;
};

export type UpdateResponseRequisitionLineResponse = RequisitionLineNode | UpdateResponseRequisitionLineError;

export type UpdateResponseRequisitionResponse = RequisitionNode | UpdateResponseRequisitionError;

export enum UpdateResponseRequisitionStatusInput {
  Finalised = 'FINALISED'
}

export type UpdateStocktakeError = {
  __typename?: 'UpdateStocktakeError';
  error: UpdateStocktakeErrorInterface;
};

export type UpdateStocktakeErrorInterface = {
  description: Scalars['String'];
};

export type UpdateStocktakeInput = {
  comment?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  status?: InputMaybe<StocktakeNodeStatus>;
};

export type UpdateStocktakeLineInput = {
  batch?: InputMaybe<Scalars['String']>;
  comment?: InputMaybe<Scalars['String']>;
  costPricePerPack?: InputMaybe<Scalars['Float']>;
  countedNumberOfPacks?: InputMaybe<Scalars['Int']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  locationId?: InputMaybe<Scalars['String']>;
  note?: InputMaybe<Scalars['String']>;
  packSize?: InputMaybe<Scalars['Int']>;
  sellPricePerPack?: InputMaybe<Scalars['Float']>;
  snapshotNumberOfPacks?: InputMaybe<Scalars['Int']>;
};

export type UpdateStocktakeLineResponse = StocktakeLineNode;

export type UpdateStocktakeLineResponseWithId = {
  __typename?: 'UpdateStocktakeLineResponseWithId';
  id: Scalars['String'];
  response: UpdateStocktakeLineResponse;
};

export type UpdateStocktakeResponse = StocktakeNode | UpdateStocktakeError;

export type UpdateStocktakeResponseWithId = {
  __typename?: 'UpdateStocktakeResponseWithId';
  id: Scalars['String'];
  response: UpdateStocktakeResponse;
};

export type UseSuggestedQuantityError = {
  __typename?: 'UseSuggestedQuantityError';
  error: UseSuggestedQuantityErrorInterface;
};

export type UseSuggestedQuantityErrorInterface = {
  description: Scalars['String'];
};

export type UseSuggestedQuantityInput = {
  requestRequisitionId: Scalars['String'];
};

export type UseSuggestedQuantityResponse = RequisitionLineConnector | UseSuggestedQuantityError;

export type User = {
  __typename?: 'User';
  /** The user's email address */
  email?: Maybe<Scalars['String']>;
  /** Internal user id */
  userId: Scalars['String'];
};

export type UserNameDoesNotExist = AuthTokenErrorInterface & {
  __typename?: 'UserNameDoesNotExist';
  description: Scalars['String'];
};

export type UserRegisterError = {
  __typename?: 'UserRegisterError';
  error: UserRegisterErrorInterface;
};

export type UserRegisterErrorInterface = {
  description: Scalars['String'];
};

export type UserRegisterInput = {
  email?: InputMaybe<Scalars['String']>;
  password: Scalars['String'];
  username: Scalars['String'];
};

export type UserRegisterResponse = RegisteredUser | UserRegisterError;

export type UserResponse = User;

export type ItemsWithStockLinesQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  key: ItemSortFieldInput;
  desc?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<ItemFilterInput>;
  storeId: Scalars['String'];
}>;


export type ItemsWithStockLinesQuery = { __typename?: 'Queries', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', code: string, id: string, isVisible: boolean, name: string, unitName?: string | null, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, totalNumberOfPacks: number, onHold: boolean, note?: string | null, storeId: string, locationName?: string | null }> } }> } };

export type NamesQueryVariables = Exact<{
  key: NameSortFieldInput;
  desc?: InputMaybe<Scalars['Boolean']>;
  first?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  filter?: InputMaybe<NameFilterInput>;
}>;


export type NamesQuery = { __typename?: 'Queries', names: { __typename: 'NameConnector', totalCount: number, nodes: Array<{ __typename?: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, name: string, store?: { __typename?: 'StoreNode', id: string, code: string } | null }> } };

export type StockCountsQueryVariables = Exact<{
  daysTillExpired?: InputMaybe<Scalars['Int']>;
  timezoneOffset?: InputMaybe<Scalars['Int']>;
}>;


export type StockCountsQuery = { __typename?: 'Queries', stockCounts: { __typename?: 'StockCounts', expired: number, expiringSoon: number } };

export type LocationsQueryVariables = Exact<{
  sort?: InputMaybe<Array<LocationSortInput> | LocationSortInput>;
}>;


export type LocationsQuery = { __typename?: 'Queries', locations: { __typename: 'LocationConnector', totalCount: number, nodes: Array<{ __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string }> } };

export type InsertLocationMutationVariables = Exact<{
  input: InsertLocationInput;
  storeId: Scalars['String'];
}>;


export type InsertLocationMutation = { __typename?: 'Mutations', insertLocation: { __typename: 'InsertLocationError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'InternalError', description: string, fullError: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', description: string, field: UniqueValueKey } } | { __typename?: 'LocationNode', id: string, name: string, code: string, onHold: boolean } };

export type UpdateLocationMutationVariables = Exact<{
  input: UpdateLocationInput;
  storeId: Scalars['String'];
}>;


export type UpdateLocationMutation = { __typename?: 'Mutations', updateLocation: { __typename?: 'LocationNode', id: string, name: string, onHold: boolean, code: string } | { __typename: 'UpdateLocationError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'InternalError', description: string, fullError: string } | { __typename: 'RecordBelongsToAnotherStore', description: string } | { __typename: 'RecordNotFound', description: string } | { __typename: 'UniqueValueViolation', description: string, field: UniqueValueKey } } };

export type DeleteLocationMutationVariables = Exact<{
  storeId: Scalars['String'];
  input: DeleteLocationInput;
}>;


export type DeleteLocationMutation = { __typename?: 'Mutations', deleteLocation: { __typename: 'DeleteLocationError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'LocationInUse', description: string, stockLines: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', id: string, itemId: string }> }, invoiceLines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string }> } } | { __typename: 'RecordBelongsToAnotherStore', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } };

export type StoresQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  filter?: InputMaybe<StoreFilterInput>;
}>;


export type StoresQuery = { __typename?: 'Queries', stores: { __typename: 'StoreConnector', totalCount: number, nodes: Array<{ __typename?: 'StoreNode', code: string, id: string }> } };

export type AuthTokenQueryVariables = Exact<{
  username: Scalars['String'];
  password: Scalars['String'];
}>;


export type AuthTokenQuery = { __typename?: 'Queries', authToken: { __typename: 'AuthToken', token: string } | { __typename: 'AuthTokenError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'InternalError', description: string, fullError: string } | { __typename: 'InvalidCredentials', description: string } | { __typename: 'UserNameDoesNotExist', description: string } } };

export type MasterListsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  key: MasterListSortFieldInput;
  desc?: InputMaybe<Scalars['Boolean']>;
  filter?: InputMaybe<MasterListFilterInput>;
  storeId: Scalars['String'];
}>;


export type MasterListsQuery = { __typename?: 'Queries', masterLists: { __typename: 'MasterListConnector', totalCount: number, nodes: Array<{ __typename?: 'MasterListNode', name: string, code: string, description: string, id: string, lines: { __typename?: 'MasterListLineConnector', totalCount: number, nodes: Array<{ __typename?: 'MasterListLineNode', id: string, itemId: string, item: { __typename?: 'ItemNode', code: string, id: string, unitName?: string | null, name: string, isVisible: boolean, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, itemId: string, id: string, totalNumberOfPacks: number, storeId: string, sellPricePerPack: number, packSize: number, onHold: boolean, note?: string | null, locationName?: string | null }> } } }> } }> } };


export const ItemsWithStockLinesDocument = gql`
    query itemsWithStockLines($first: Int, $offset: Int, $key: ItemSortFieldInput!, $desc: Boolean, $filter: ItemFilterInput, $storeId: String!) {
  items(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    __typename
    ... on ItemConnector {
      __typename
      nodes {
        __typename
        availableBatches(storeId: $storeId) {
          __typename
          ... on StockLineConnector {
            __typename
            nodes {
              __typename
              availableNumberOfPacks
              batch
              costPricePerPack
              expiryDate
              id
              itemId
              packSize
              sellPricePerPack
              totalNumberOfPacks
              onHold
              note
              storeId
              locationName
            }
            totalCount
          }
        }
        code
        id
        isVisible
        name
        unitName
      }
      totalCount
    }
  }
}
    `;
export const NamesDocument = gql`
    query names($key: NameSortFieldInput!, $desc: Boolean, $first: Int, $offset: Int, $filter: NameFilterInput) {
  names(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on NameConnector {
      __typename
      nodes {
        code
        id
        isCustomer
        isSupplier
        name
        store {
          id
          code
        }
      }
      totalCount
    }
  }
}
    `;
export const StockCountsDocument = gql`
    query stockCounts($daysTillExpired: Int, $timezoneOffset: Int) {
  stockCounts(daysTillExpired: $daysTillExpired, timezoneOffset: $timezoneOffset) {
    expired
    expiringSoon
  }
}
    `;
export const LocationsDocument = gql`
    query locations($sort: [LocationSortInput!]) {
  locations(sort: $sort) {
    __typename
    ... on LocationConnector {
      __typename
      nodes {
        __typename
        id
        name
        onHold
        code
      }
      totalCount
    }
  }
}
    `;
export const InsertLocationDocument = gql`
    mutation insertLocation($input: InsertLocationInput!, $storeId: String!) {
  insertLocation(input: $input, storeId: $storeId) {
    ... on InsertLocationError {
      __typename
      error {
        description
        ... on InternalError {
          __typename
          description
          fullError
        }
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on RecordAlreadyExist {
          __typename
          description
        }
        ... on UniqueValueViolation {
          __typename
          description
          field
        }
      }
    }
    ... on LocationNode {
      id
      name
      code
      onHold
    }
  }
}
    `;
export const UpdateLocationDocument = gql`
    mutation updateLocation($input: UpdateLocationInput!, $storeId: String!) {
  updateLocation(input: $input, storeId: $storeId) {
    ... on UpdateLocationError {
      __typename
      error {
        description
        ... on InternalError {
          __typename
          description
          fullError
        }
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on RecordBelongsToAnotherStore {
          __typename
          description
        }
        ... on RecordNotFound {
          __typename
          description
        }
        ... on UniqueValueViolation {
          __typename
          description
          field
        }
      }
    }
    ... on LocationNode {
      id
      name
      onHold
      code
    }
  }
}
    `;
export const DeleteLocationDocument = gql`
    mutation deleteLocation($storeId: String!, $input: DeleteLocationInput!) {
  deleteLocation(storeId: $storeId, input: $input) {
    ... on DeleteLocationError {
      __typename
      error {
        description
        ... on RecordNotFound {
          __typename
          description
        }
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on RecordBelongsToAnotherStore {
          __typename
          description
        }
        ... on LocationInUse {
          __typename
          description
          stockLines {
            ... on StockLineConnector {
              __typename
              nodes {
                __typename
                id
                itemId
              }
              totalCount
            }
          }
          invoiceLines {
            ... on InvoiceLineConnector {
              __typename
              nodes {
                __typename
                id
              }
            }
            totalCount
          }
        }
      }
    }
    ... on DeleteResponse {
      __typename
      id
    }
  }
}
    `;
export const StoresDocument = gql`
    query stores($first: Int, $offset: Int, $filter: StoreFilterInput) {
  stores(page: {first: $first, offset: $offset}, filter: $filter) {
    ... on StoreConnector {
      __typename
      nodes {
        code
        id
      }
      totalCount
    }
  }
}
    `;
export const AuthTokenDocument = gql`
    query authToken($username: String!, $password: String!) {
  authToken(password: $password, username: $username) {
    ... on AuthToken {
      __typename
      token
    }
    ... on AuthTokenError {
      __typename
      error {
        ... on UserNameDoesNotExist {
          __typename
          description
        }
        ... on InvalidCredentials {
          __typename
          description
        }
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on InternalError {
          __typename
          description
          fullError
        }
        description
      }
    }
  }
}
    `;
export const MasterListsDocument = gql`
    query masterLists($first: Int, $offset: Int, $key: MasterListSortFieldInput!, $desc: Boolean, $filter: MasterListFilterInput, $storeId: String!) {
  masterLists(
    filter: $filter
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
  ) {
    ... on MasterListConnector {
      __typename
      nodes {
        name
        code
        lines {
          nodes {
            id
            itemId
            item {
              code
              id
              unitName
              name
              isVisible
              availableBatches(storeId: $storeId) {
                ... on StockLineConnector {
                  __typename
                  nodes {
                    __typename
                    availableNumberOfPacks
                    batch
                    costPricePerPack
                    expiryDate
                    itemId
                    id
                    totalNumberOfPacks
                    storeId
                    sellPricePerPack
                    packSize
                    onHold
                    note
                    locationName
                  }
                  totalCount
                }
              }
            }
          }
          totalCount
        }
        code
        description
        id
      }
      totalCount
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    itemsWithStockLines(variables: ItemsWithStockLinesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ItemsWithStockLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemsWithStockLinesQuery>(ItemsWithStockLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemsWithStockLines');
    },
    names(variables: NamesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<NamesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<NamesQuery>(NamesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'names');
    },
    stockCounts(variables?: StockCountsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<StockCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StockCountsQuery>(StockCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stockCounts');
    },
    locations(variables?: LocationsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<LocationsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LocationsQuery>(LocationsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'locations');
    },
    insertLocation(variables: InsertLocationMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertLocationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertLocationMutation>(InsertLocationDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertLocation');
    },
    updateLocation(variables: UpdateLocationMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateLocationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateLocationMutation>(UpdateLocationDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateLocation');
    },
    deleteLocation(variables: DeleteLocationMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteLocationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteLocationMutation>(DeleteLocationDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteLocation');
    },
    stores(variables?: StoresQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<StoresQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StoresQuery>(StoresDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stores');
    },
    authToken(variables: AuthTokenQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<AuthTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AuthTokenQuery>(AuthTokenDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'authToken');
    },
    masterLists(variables: MasterListsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<MasterListsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MasterListsQuery>(MasterListsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'masterLists');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockItemsWithStockLinesQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ items })
 *   )
 * })
 */
export const mockItemsWithStockLinesQuery = (resolver: ResponseResolver<GraphQLRequest<ItemsWithStockLinesQueryVariables>, GraphQLContext<ItemsWithStockLinesQuery>, any>) =>
  graphql.query<ItemsWithStockLinesQuery, ItemsWithStockLinesQueryVariables>(
    'itemsWithStockLines',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockNamesQuery((req, res, ctx) => {
 *   const { key, desc, first, offset, filter } = req.variables;
 *   return res(
 *     ctx.data({ names })
 *   )
 * })
 */
export const mockNamesQuery = (resolver: ResponseResolver<GraphQLRequest<NamesQueryVariables>, GraphQLContext<NamesQuery>, any>) =>
  graphql.query<NamesQuery, NamesQueryVariables>(
    'names',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockStockCountsQuery((req, res, ctx) => {
 *   const { daysTillExpired, timezoneOffset } = req.variables;
 *   return res(
 *     ctx.data({ stockCounts })
 *   )
 * })
 */
export const mockStockCountsQuery = (resolver: ResponseResolver<GraphQLRequest<StockCountsQueryVariables>, GraphQLContext<StockCountsQuery>, any>) =>
  graphql.query<StockCountsQuery, StockCountsQueryVariables>(
    'stockCounts',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockLocationsQuery((req, res, ctx) => {
 *   const { sort } = req.variables;
 *   return res(
 *     ctx.data({ locations })
 *   )
 * })
 */
export const mockLocationsQuery = (resolver: ResponseResolver<GraphQLRequest<LocationsQueryVariables>, GraphQLContext<LocationsQuery>, any>) =>
  graphql.query<LocationsQuery, LocationsQueryVariables>(
    'locations',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertLocationMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ insertLocation })
 *   )
 * })
 */
export const mockInsertLocationMutation = (resolver: ResponseResolver<GraphQLRequest<InsertLocationMutationVariables>, GraphQLContext<InsertLocationMutation>, any>) =>
  graphql.mutation<InsertLocationMutation, InsertLocationMutationVariables>(
    'insertLocation',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateLocationMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ updateLocation })
 *   )
 * })
 */
export const mockUpdateLocationMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateLocationMutationVariables>, GraphQLContext<UpdateLocationMutation>, any>) =>
  graphql.mutation<UpdateLocationMutation, UpdateLocationMutationVariables>(
    'updateLocation',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteLocationMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ deleteLocation })
 *   )
 * })
 */
export const mockDeleteLocationMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteLocationMutationVariables>, GraphQLContext<DeleteLocationMutation>, any>) =>
  graphql.mutation<DeleteLocationMutation, DeleteLocationMutationVariables>(
    'deleteLocation',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockStoresQuery((req, res, ctx) => {
 *   const { first, offset, filter } = req.variables;
 *   return res(
 *     ctx.data({ stores })
 *   )
 * })
 */
export const mockStoresQuery = (resolver: ResponseResolver<GraphQLRequest<StoresQueryVariables>, GraphQLContext<StoresQuery>, any>) =>
  graphql.query<StoresQuery, StoresQueryVariables>(
    'stores',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAuthTokenQuery((req, res, ctx) => {
 *   const { username, password } = req.variables;
 *   return res(
 *     ctx.data({ authToken })
 *   )
 * })
 */
export const mockAuthTokenQuery = (resolver: ResponseResolver<GraphQLRequest<AuthTokenQueryVariables>, GraphQLContext<AuthTokenQuery>, any>) =>
  graphql.query<AuthTokenQuery, AuthTokenQueryVariables>(
    'authToken',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockMasterListsQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ masterLists })
 *   )
 * })
 */
export const mockMasterListsQuery = (resolver: ResponseResolver<GraphQLRequest<MasterListsQueryVariables>, GraphQLContext<MasterListsQuery>, any>) =>
  graphql.query<MasterListsQuery, MasterListsQueryVariables>(
    'masterLists',
    resolver
  )
