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
  NaiveDateTime: string;
};

export type AccessDenied = LogoutErrorInterface & {
  __typename: 'AccessDenied';
  description: Scalars['String'];
  fullError: Scalars['String'];
};

export type AddFromMasterListError = {
  __typename: 'AddFromMasterListError';
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

export type AllocateOutboundShipmentUnallocatedLineError = {
  __typename: 'AllocateOutboundShipmentUnallocatedLineError';
  error: AllocateOutboundShipmentUnallocatedLineErrorInterface;
};

export type AllocateOutboundShipmentUnallocatedLineErrorInterface = {
  description: Scalars['String'];
};

export type AllocateOutboundShipmentUnallocatedLineNode = {
  __typename: 'AllocateOutboundShipmentUnallocatedLineNode';
  deletes: Array<DeleteResponse>;
  inserts: InvoiceLineConnector;
  updates: InvoiceLineConnector;
};

export type AllocateOutboundShipmentUnallocatedLineResponse = AllocateOutboundShipmentUnallocatedLineError | AllocateOutboundShipmentUnallocatedLineNode;

export type AllocateOutboundShipmentUnallocatedLineResponseWithId = {
  __typename: 'AllocateOutboundShipmentUnallocatedLineResponseWithId';
  id: Scalars['String'];
  response: AllocateOutboundShipmentUnallocatedLineResponse;
};

export type AuthToken = {
  __typename: 'AuthToken';
  /** Bearer token */
  token: Scalars['String'];
};

export type AuthTokenError = {
  __typename: 'AuthTokenError';
  error: AuthTokenErrorInterface;
};

export type AuthTokenErrorInterface = {
  description: Scalars['String'];
};

export type AuthTokenResponse = AuthToken | AuthTokenError;

export type BatchInboundShipmentInput = {
  continueOnError?: InputMaybe<Scalars['Boolean']>;
  deleteInboundShipmentLines?: InputMaybe<Array<DeleteInboundShipmentLineInput>>;
  deleteInboundShipmentServiceLines?: InputMaybe<Array<DeleteInboundShipmentServiceLineInput>>;
  deleteInboundShipments?: InputMaybe<Array<DeleteInboundShipmentInput>>;
  insertInboundShipmentLines?: InputMaybe<Array<InsertInboundShipmentLineInput>>;
  insertInboundShipmentServiceLines?: InputMaybe<Array<InsertInboundShipmentServiceLineInput>>;
  insertInboundShipments?: InputMaybe<Array<InsertInboundShipmentInput>>;
  updateInboundShipmentLines?: InputMaybe<Array<UpdateInboundShipmentLineInput>>;
  updateInboundShipmentServiceLines?: InputMaybe<Array<UpdateInboundShipmentServiceLineInput>>;
  updateInboundShipments?: InputMaybe<Array<UpdateInboundShipmentInput>>;
};

export type BatchInboundShipmentResponse = {
  __typename: 'BatchInboundShipmentResponse';
  deleteInboundShipmentLines?: Maybe<Array<DeleteInboundShipmentLineResponseWithId>>;
  deleteInboundShipmentServiceLines?: Maybe<Array<DeleteInboundShipmentServiceLineResponseWithId>>;
  deleteInboundShipments?: Maybe<Array<DeleteInboundShipmentResponseWithId>>;
  insertInboundShipmentLines?: Maybe<Array<InsertInboundShipmentLineResponseWithId>>;
  insertInboundShipmentServiceLines?: Maybe<Array<InsertInboundShipmentServiceLineResponseWithId>>;
  insertInboundShipments?: Maybe<Array<InsertInboundShipmentResponseWithId>>;
  updateInboundShipmentLines?: Maybe<Array<UpdateInboundShipmentLineResponseWithId>>;
  updateInboundShipmentServiceLines?: Maybe<Array<UpdateInboundShipmentServiceLineResponseWithId>>;
  updateInboundShipments?: Maybe<Array<UpdateInboundShipmentResponseWithId>>;
};

export type BatchIsReserved = DeleteInboundShipmentLineErrorInterface & UpdateInboundShipmentLineErrorInterface & {
  __typename: 'BatchIsReserved';
  description: Scalars['String'];
};

export type BatchOutboundShipmentInput = {
  allocatedOutboundShipmentUnallocatedLines?: InputMaybe<Array<Scalars['String']>>;
  continueOnError?: InputMaybe<Scalars['Boolean']>;
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
  __typename: 'BatchOutboundShipmentResponse';
  allocateOutboundShipmentUnallocatedLines?: Maybe<Array<AllocateOutboundShipmentUnallocatedLineResponseWithId>>;
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

export type BatchRequestRequisitionInput = {
  continueOnError?: InputMaybe<Scalars['Boolean']>;
  deleteRequestRequisitionLines?: InputMaybe<Array<DeleteRequestRequisitionLineInput>>;
  deleteRequestRequisitions?: InputMaybe<Array<DeleteRequestRequisitionInput>>;
  insertRequestRequisitionLines?: InputMaybe<Array<InsertRequestRequisitionLineInput>>;
  insertRequestRequisitions?: InputMaybe<Array<InsertRequestRequisitionInput>>;
  updateRequestRequisitionLines?: InputMaybe<Array<UpdateRequestRequisitionLineInput>>;
  updateRequestRequisitions?: InputMaybe<Array<UpdateRequestRequisitionInput>>;
};

export type BatchRequestRequisitionResponse = {
  __typename: 'BatchRequestRequisitionResponse';
  deleteRequestRequisitionLines?: Maybe<Array<DeleteRequestRequisitionLineResponseWithId>>;
  deleteRequestRequisitions?: Maybe<Array<DeleteRequestRequisitionResponseWithId>>;
  insertRequestRequisitionLines?: Maybe<Array<InsertRequestRequisitionLineResponseWithId>>;
  insertRequestRequisitions?: Maybe<Array<InsertRequestRequisitionResponseWithId>>;
  updateRequestRequisitionLines?: Maybe<Array<UpdateRequestRequisitionLineResponseWithId>>;
  updateRequestRequisitions?: Maybe<Array<UpdateRequestRequisitionResponseWithId>>;
};

export type BatchStocktakeInput = {
  continueOnError?: InputMaybe<Scalars['Boolean']>;
  deleteStocktakeLines?: InputMaybe<Array<DeleteStocktakeLineInput>>;
  deleteStocktakes?: InputMaybe<Array<DeleteStocktakeInput>>;
  insertStocktakeLines?: InputMaybe<Array<InsertStocktakeLineInput>>;
  insertStocktakes?: InputMaybe<Array<InsertStocktakeInput>>;
  updateStocktakeLines?: InputMaybe<Array<UpdateStocktakeLineInput>>;
  updateStocktakes?: InputMaybe<Array<UpdateStocktakeInput>>;
};

export type BatchStocktakeResponse = {
  __typename: 'BatchStocktakeResponse';
  deleteStocktakeLines?: Maybe<Array<DeleteStocktakeLineResponseWithId>>;
  deleteStocktakes?: Maybe<Array<DeleteStocktakeResponseWithId>>;
  insertStocktakeLines?: Maybe<Array<InsertStocktakeLineResponseWithId>>;
  insertStocktakes?: Maybe<Array<InsertStocktakeResponseWithId>>;
  updateStocktakeLines?: Maybe<Array<UpdateStocktakeLineResponseWithId>>;
  updateStocktakes?: Maybe<Array<UpdateStocktakeResponseWithId>>;
};

export type CanOnlyChangeToAllocatedWhenNoUnallocatedLines = UpdateErrorInterface & {
  __typename: 'CanOnlyChangeToAllocatedWhenNoUnallocatedLines';
  description: Scalars['String'];
  invoiceLines: InvoiceLineConnector;
};

export type CannotChangeStatusOfInvoiceOnHold = UpdateErrorInterface & UpdateInboundShipmentErrorInterface & {
  __typename: 'CannotChangeStatusOfInvoiceOnHold';
  description: Scalars['String'];
};

export type CannotDeleteInvoiceWithLines = DeleteErrorInterface & DeleteInboundShipmentErrorInterface & {
  __typename: 'CannotDeleteInvoiceWithLines';
  description: Scalars['String'];
  lines: InvoiceLineConnector;
};

export type CannotDeleteRequisitionWithLines = DeleteRequestRequisitionErrorInterface & {
  __typename: 'CannotDeleteRequisitionWithLines';
  description: Scalars['String'];
};

export type CannotEditInvoice = DeleteErrorInterface & DeleteInboundShipmentErrorInterface & DeleteInboundShipmentLineErrorInterface & DeleteInboundShipmentServiceLineErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & InsertInboundShipmentLineErrorInterface & InsertInboundShipmentServiceLineErrorInterface & InsertOutboundShipmentLineErrorInterface & InsertOutboundShipmentServiceLineErrorInterface & UpdateInboundShipmentErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateInboundShipmentServiceLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & {
  __typename: 'CannotEditInvoice';
  description: Scalars['String'];
};

export type CannotEditRequisition = AddFromMasterListErrorInterface & CreateRequisitionShipmentErrorInterface & DeleteRequestRequisitionErrorInterface & DeleteRequestRequisitionLineErrorInterface & InsertRequestRequisitionLineErrorInterface & SupplyRequestedQuantityErrorInterface & UpdateRequestRequisitionErrorInterface & UpdateRequestRequisitionLineErrorInterface & UpdateResponseRequisitionErrorInterface & UpdateResponseRequisitionLineErrorInterface & UseSuggestedQuantityErrorInterface & {
  __typename: 'CannotEditRequisition';
  description: Scalars['String'];
};

export type CannotEditStocktake = DeleteStocktakeErrorInterface & DeleteStocktakeLineErrorInterface & InsertStocktakeLineErrorInterface & UpdateStocktakeErrorInterface & UpdateStocktakeLineErrorInterface & {
  __typename: 'CannotEditStocktake';
  description: Scalars['String'];
};

export type CannotReverseInvoiceStatus = UpdateErrorInterface & UpdateInboundShipmentErrorInterface & {
  __typename: 'CannotReverseInvoiceStatus';
  description: Scalars['String'];
};

export type ConsumptionHistoryConnector = {
  __typename: 'ConsumptionHistoryConnector';
  nodes: Array<ConsumptionHistoryNode>;
  totalCount: Scalars['Int'];
};

export type ConsumptionHistoryNode = {
  __typename: 'ConsumptionHistoryNode';
  amc: Scalars['Float'];
  consumption: Scalars['Int'];
  date: Scalars['NaiveDate'];
  isHistoric: Scalars['Boolean'];
};

export type CreateRequisitionShipmentError = {
  __typename: 'CreateRequisitionShipmentError';
  error: CreateRequisitionShipmentErrorInterface;
};

export type CreateRequisitionShipmentErrorInterface = {
  description: Scalars['String'];
};

export type CreateRequisitionShipmentInput = {
  responseRequisitionId: Scalars['String'];
};

export type CreateRequisitionShipmentResponse = CreateRequisitionShipmentError | InvoiceNode;

export type DatabaseError = AuthTokenErrorInterface & DeleteLocationErrorInterface & InsertLocationErrorInterface & NodeErrorInterface & RefreshTokenErrorInterface & UpdateLocationErrorInterface & UserRegisterErrorInterface & {
  __typename: 'DatabaseError';
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
  __typename: 'DeleteInboundShipmentError';
  error: DeleteInboundShipmentErrorInterface;
};

export type DeleteInboundShipmentErrorInterface = {
  description: Scalars['String'];
};

export type DeleteInboundShipmentInput = {
  id: Scalars['String'];
};

export type DeleteInboundShipmentLineError = {
  __typename: 'DeleteInboundShipmentLineError';
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
  __typename: 'DeleteInboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: DeleteInboundShipmentLineResponse;
};

export type DeleteInboundShipmentResponse = DeleteInboundShipmentError | DeleteResponse;

export type DeleteInboundShipmentResponseWithId = {
  __typename: 'DeleteInboundShipmentResponseWithId';
  id: Scalars['String'];
  response: DeleteInboundShipmentResponse;
};

export type DeleteInboundShipmentServiceLineError = {
  __typename: 'DeleteInboundShipmentServiceLineError';
  error: DeleteInboundShipmentServiceLineErrorInterface;
};

export type DeleteInboundShipmentServiceLineErrorInterface = {
  description: Scalars['String'];
};

export type DeleteInboundShipmentServiceLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
};

export type DeleteInboundShipmentServiceLineResponse = DeleteInboundShipmentServiceLineError | DeleteResponse;

export type DeleteInboundShipmentServiceLineResponseWithId = {
  __typename: 'DeleteInboundShipmentServiceLineResponseWithId';
  id: Scalars['String'];
  response: DeleteInboundShipmentServiceLineResponse;
};

export type DeleteLocationError = {
  __typename: 'DeleteLocationError';
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
  __typename: 'DeleteOutboundShipmentError';
  error: DeleteErrorInterface;
};

export type DeleteOutboundShipmentLineError = {
  __typename: 'DeleteOutboundShipmentLineError';
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
  __typename: 'DeleteOutboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: DeleteOutboundShipmentLineResponse;
};

export type DeleteOutboundShipmentResponse = DeleteOutboundShipmentError | DeleteResponse;

export type DeleteOutboundShipmentResponseWithId = {
  __typename: 'DeleteOutboundShipmentResponseWithId';
  id: Scalars['String'];
  response: DeleteOutboundShipmentResponse;
};

export type DeleteOutboundShipmentServiceLineError = {
  __typename: 'DeleteOutboundShipmentServiceLineError';
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
  __typename: 'DeleteOutboundShipmentServiceLineResponseWithId';
  id: Scalars['String'];
  response: DeleteOutboundShipmentServiceLineResponse;
};

export type DeleteOutboundShipmentUnallocatedLineError = {
  __typename: 'DeleteOutboundShipmentUnallocatedLineError';
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
  __typename: 'DeleteOutboundShipmentUnallocatedLineResponseWithId';
  id: Scalars['String'];
  response: DeleteOutboundShipmentUnallocatedLineResponse;
};

export type DeleteRequestRequisitionError = {
  __typename: 'DeleteRequestRequisitionError';
  error: DeleteRequestRequisitionErrorInterface;
};

export type DeleteRequestRequisitionErrorInterface = {
  description: Scalars['String'];
};

export type DeleteRequestRequisitionInput = {
  id: Scalars['String'];
};

export type DeleteRequestRequisitionLineError = {
  __typename: 'DeleteRequestRequisitionLineError';
  error: DeleteRequestRequisitionLineErrorInterface;
};

export type DeleteRequestRequisitionLineErrorInterface = {
  description: Scalars['String'];
};

export type DeleteRequestRequisitionLineInput = {
  id: Scalars['String'];
};

export type DeleteRequestRequisitionLineResponse = DeleteRequestRequisitionLineError | DeleteResponse;

export type DeleteRequestRequisitionLineResponseWithId = {
  __typename: 'DeleteRequestRequisitionLineResponseWithId';
  id: Scalars['String'];
  response: DeleteRequestRequisitionLineResponse;
};

export type DeleteRequestRequisitionResponse = DeleteRequestRequisitionError | DeleteResponse;

export type DeleteRequestRequisitionResponseWithId = {
  __typename: 'DeleteRequestRequisitionResponseWithId';
  id: Scalars['String'];
  response: DeleteRequestRequisitionResponse;
};

export type DeleteResponse = {
  __typename: 'DeleteResponse';
  id: Scalars['String'];
};

export type DeleteStocktakeError = {
  __typename: 'DeleteStocktakeError';
  error: DeleteStocktakeErrorInterface;
};

export type DeleteStocktakeErrorInterface = {
  description: Scalars['String'];
};

export type DeleteStocktakeInput = {
  id: Scalars['String'];
};

export type DeleteStocktakeLineError = {
  __typename: 'DeleteStocktakeLineError';
  error: DeleteStocktakeLineErrorInterface;
};

export type DeleteStocktakeLineErrorInterface = {
  description: Scalars['String'];
};

export type DeleteStocktakeLineInput = {
  id: Scalars['String'];
};

export type DeleteStocktakeLineResponse = DeleteResponse | DeleteStocktakeLineError;

export type DeleteStocktakeLineResponseWithId = {
  __typename: 'DeleteStocktakeLineResponseWithId';
  id: Scalars['String'];
  response: DeleteStocktakeLineResponse;
};

export type DeleteStocktakeResponse = DeleteResponse | DeleteStocktakeError;

export type DeleteStocktakeResponseWithId = {
  __typename: 'DeleteStocktakeResponseWithId';
  id: Scalars['String'];
  response: DeleteStocktakeResponse;
};

export type EqualFilterBigNumberInput = {
  equalAny?: InputMaybe<Array<Scalars['Int']>>;
  equalTo?: InputMaybe<Scalars['Int']>;
  notEqualTo?: InputMaybe<Scalars['Int']>;
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

export type EqualFilterItemTypeInput = {
  equalAny?: InputMaybe<Array<ItemNodeType>>;
  equalTo?: InputMaybe<ItemNodeType>;
  notEqualTo?: InputMaybe<ItemNodeType>;
};

export type EqualFilterReportCategoryInput = {
  equalAny?: InputMaybe<Array<ReportCategory>>;
  equalTo?: InputMaybe<ReportCategory>;
  notEqualTo?: InputMaybe<ReportCategory>;
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

export type FailedToFetchReportData = PrintReportErrorInterface & {
  __typename: 'FailedToFetchReportData';
  description: Scalars['String'];
};

export enum ForeignKey {
  InvoiceId = 'invoiceId',
  ItemId = 'itemId',
  LocationId = 'locationId',
  OtherPartyId = 'otherPartyId',
  RequisitionId = 'requisitionId',
  StockLineId = 'stockLineId'
}

export type ForeignKeyError = DeleteInboundShipmentLineErrorInterface & DeleteInboundShipmentServiceLineErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & InsertInboundShipmentLineErrorInterface & InsertInboundShipmentServiceLineErrorInterface & InsertOutboundShipmentLineErrorInterface & InsertOutboundShipmentServiceLineErrorInterface & InsertOutboundShipmentUnallocatedLineErrorInterface & InsertRequestRequisitionLineErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateInboundShipmentServiceLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & UpdateRequestRequisitionLineErrorInterface & UpdateResponseRequisitionLineErrorInterface & {
  __typename: 'ForeignKeyError';
  description: Scalars['String'];
  key: ForeignKey;
};

export type FullMutation = {
  __typename: 'FullMutation';
  /** Add requisition lines from master item master list */
  addFromMasterList: AddFromMasterListResponse;
  allocateOutboundShipmentUnallocatedLine: AllocateOutboundShipmentUnallocatedLineResponse;
  batchInboundShipment: BatchInboundShipmentResponse;
  batchOutboundShipment: BatchOutboundShipmentResponse;
  batchRequestRequisition: BatchRequestRequisitionResponse;
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
  deleteInboundShipmentServiceLine: DeleteInboundShipmentServiceLineResponse;
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
  insertInboundShipmentServiceLine: InsertInboundShipmentServiceLineResponse;
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
  updateInboundShipmentServiceLine: UpdateInboundShipmentServiceLineResponse;
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


export type FullMutationAddFromMasterListArgs = {
  input: AddFromMasterListInput;
  storeId: Scalars['String'];
};


export type FullMutationAllocateOutboundShipmentUnallocatedLineArgs = {
  lineId: Scalars['String'];
  storeId: Scalars['String'];
};


export type FullMutationBatchInboundShipmentArgs = {
  input: BatchInboundShipmentInput;
  storeId: Scalars['String'];
};


export type FullMutationBatchOutboundShipmentArgs = {
  input: BatchOutboundShipmentInput;
  storeId: Scalars['String'];
};


export type FullMutationBatchRequestRequisitionArgs = {
  input: BatchRequestRequisitionInput;
  storeId: Scalars['String'];
};


export type FullMutationBatchStocktakeArgs = {
  input: BatchStocktakeInput;
  storeId: Scalars['String'];
};


export type FullMutationCreateRequisitionShipmentArgs = {
  input: CreateRequisitionShipmentInput;
  storeId: Scalars['String'];
};


export type FullMutationDeleteInboundShipmentArgs = {
  input: DeleteInboundShipmentInput;
  storeId: Scalars['String'];
};


export type FullMutationDeleteInboundShipmentLineArgs = {
  input: DeleteInboundShipmentLineInput;
  storeId: Scalars['String'];
};


export type FullMutationDeleteInboundShipmentServiceLineArgs = {
  input: DeleteInboundShipmentServiceLineInput;
  storeId: Scalars['String'];
};


export type FullMutationDeleteLocationArgs = {
  input: DeleteLocationInput;
  storeId: Scalars['String'];
};


export type FullMutationDeleteOutboundShipmentArgs = {
  id: Scalars['String'];
  storeId: Scalars['String'];
};


export type FullMutationDeleteOutboundShipmentLineArgs = {
  input: DeleteOutboundShipmentLineInput;
  storeId: Scalars['String'];
};


export type FullMutationDeleteOutboundShipmentServiceLineArgs = {
  input: DeleteOutboundShipmentServiceLineInput;
  storeId: Scalars['String'];
};


export type FullMutationDeleteOutboundShipmentUnallocatedLineArgs = {
  input: DeleteOutboundShipmentUnallocatedLineInput;
  storeId: Scalars['String'];
};


export type FullMutationDeleteRequestRequisitionArgs = {
  input: DeleteRequestRequisitionInput;
  storeId: Scalars['String'];
};


export type FullMutationDeleteRequestRequisitionLineArgs = {
  input: DeleteRequestRequisitionLineInput;
  storeId: Scalars['String'];
};


export type FullMutationDeleteStocktakeArgs = {
  input: DeleteStocktakeInput;
  storeId: Scalars['String'];
};


export type FullMutationDeleteStocktakeLineArgs = {
  input: DeleteStocktakeLineInput;
  storeId: Scalars['String'];
};


export type FullMutationInsertInboundShipmentArgs = {
  input: InsertInboundShipmentInput;
  storeId: Scalars['String'];
};


export type FullMutationInsertInboundShipmentLineArgs = {
  input: InsertInboundShipmentLineInput;
  storeId: Scalars['String'];
};


export type FullMutationInsertInboundShipmentServiceLineArgs = {
  input: InsertInboundShipmentServiceLineInput;
  storeId: Scalars['String'];
};


export type FullMutationInsertLocationArgs = {
  input: InsertLocationInput;
  storeId: Scalars['String'];
};


export type FullMutationInsertOutboundShipmentArgs = {
  input: InsertOutboundShipmentInput;
  storeId: Scalars['String'];
};


export type FullMutationInsertOutboundShipmentLineArgs = {
  input: InsertOutboundShipmentLineInput;
  storeId: Scalars['String'];
};


export type FullMutationInsertOutboundShipmentServiceLineArgs = {
  input: InsertOutboundShipmentServiceLineInput;
  storeId: Scalars['String'];
};


export type FullMutationInsertOutboundShipmentUnallocatedLineArgs = {
  input: InsertOutboundShipmentUnallocatedLineInput;
  storeId: Scalars['String'];
};


export type FullMutationInsertRequestRequisitionArgs = {
  input: InsertRequestRequisitionInput;
  storeId: Scalars['String'];
};


export type FullMutationInsertRequestRequisitionLineArgs = {
  input: InsertRequestRequisitionLineInput;
  storeId: Scalars['String'];
};


export type FullMutationInsertStocktakeArgs = {
  input: InsertStocktakeInput;
  storeId: Scalars['String'];
};


export type FullMutationInsertStocktakeLineArgs = {
  input: InsertStocktakeLineInput;
  storeId: Scalars['String'];
};


export type FullMutationRegisterUserArgs = {
  input: UserRegisterInput;
};


export type FullMutationSupplyRequestedQuantityArgs = {
  input: SupplyRequestedQuantityInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateInboundShipmentArgs = {
  input: UpdateInboundShipmentInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateInboundShipmentLineArgs = {
  input: UpdateInboundShipmentLineInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateInboundShipmentServiceLineArgs = {
  input: UpdateInboundShipmentServiceLineInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateLocationArgs = {
  input: UpdateLocationInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateOutboundShipmentArgs = {
  input: UpdateOutboundShipmentInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateOutboundShipmentLineArgs = {
  input: UpdateOutboundShipmentLineInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateOutboundShipmentServiceLineArgs = {
  input: UpdateOutboundShipmentServiceLineInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateOutboundShipmentUnallocatedLineArgs = {
  input: UpdateOutboundShipmentUnallocatedLineInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateRequestRequisitionArgs = {
  input: UpdateRequestRequisitionInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateRequestRequisitionLineArgs = {
  input: UpdateRequestRequisitionLineInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateResponseRequisitionArgs = {
  input: UpdateResponseRequisitionInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateResponseRequisitionLineArgs = {
  input: UpdateResponseRequisitionLineInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateStocktakeArgs = {
  input: UpdateStocktakeInput;
  storeId: Scalars['String'];
};


export type FullMutationUpdateStocktakeLineArgs = {
  input: UpdateStocktakeLineInput;
  storeId: Scalars['String'];
};


export type FullMutationUseSuggestedQuantityArgs = {
  input: UseSuggestedQuantityInput;
  storeId: Scalars['String'];
};

export type FullQuery = {
  __typename: 'FullQuery';
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
   * Creates a printed report.
   *
   * All details about the report, e.g. the output format, are specified in the report definition
   * which is referred to by the report_id.
   * The printed report can be retrieved from the `/files` endpoint using the returned file id.
   */
  printReport: PrintReportResponse;
  /**
   * Retrieves a new auth bearer and refresh token
   * The refresh token is returned as a cookie
   */
  refreshToken: RefreshTokenResponse;
  /** Queries a list of available reports */
  reports: ReportsResponse;
  requisition: RequisitionResponse;
  requisitionByNumber: RequisitionResponse;
  requisitions: RequisitionsResponse;
  stockCounts: StockCounts;
  stocktake: StocktakeResponse;
  stocktakeByNumber: StocktakeResponse;
  stocktakes: StocktakesResponse;
  stores: StoresResponse;
};


export type FullQueryAuthTokenArgs = {
  password: Scalars['String'];
  username: Scalars['String'];
};


export type FullQueryInvoiceArgs = {
  id: Scalars['String'];
  storeId: Scalars['String'];
};


export type FullQueryInvoiceByNumberArgs = {
  invoiceNumber: Scalars['Int'];
  storeId: Scalars['String'];
  type: InvoiceNodeType;
};


export type FullQueryInvoiceCountsArgs = {
  storeId: Scalars['String'];
  timezoneOffset?: InputMaybe<Scalars['Int']>;
};


export type FullQueryInvoicesArgs = {
  filter?: InputMaybe<InvoiceFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<InvoiceSortInput>>;
  storeId: Scalars['String'];
};


export type FullQueryItemsArgs = {
  filter?: InputMaybe<ItemFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<ItemSortInput>>;
  storeId: Scalars['String'];
};


export type FullQueryLocationsArgs = {
  filter?: InputMaybe<LocationFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<LocationSortInput>>;
  storeId: Scalars['String'];
};


export type FullQueryMasterListsArgs = {
  filter?: InputMaybe<MasterListFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<MasterListSortInput>>;
  storeId: Scalars['String'];
};


export type FullQueryNamesArgs = {
  filter?: InputMaybe<NameFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<NameSortInput>>;
  storeId: Scalars['String'];
};


export type FullQueryPrintReportArgs = {
  dataId: Scalars['String'];
  reportId: Scalars['String'];
  storeId: Scalars['String'];
};


export type FullQueryReportsArgs = {
  filter?: InputMaybe<ReportFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<ReportSortInput>>;
  storeId: Scalars['String'];
};


export type FullQueryRequisitionArgs = {
  id: Scalars['String'];
  storeId: Scalars['String'];
};


export type FullQueryRequisitionByNumberArgs = {
  requisitionNumber: Scalars['Int'];
  storeId: Scalars['String'];
  type: RequisitionNodeType;
};


export type FullQueryRequisitionsArgs = {
  filter?: InputMaybe<RequisitionFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<RequisitionSortInput>>;
  storeId: Scalars['String'];
};


export type FullQueryStockCountsArgs = {
  daysTillExpired?: InputMaybe<Scalars['Int']>;
  storeId: Scalars['String'];
  timezoneOffset?: InputMaybe<Scalars['Int']>;
};


export type FullQueryStocktakeArgs = {
  id: Scalars['String'];
  storeId: Scalars['String'];
};


export type FullQueryStocktakeByNumberArgs = {
  stocktakeNumber: Scalars['Int'];
  storeId: Scalars['String'];
};


export type FullQueryStocktakesArgs = {
  filter?: InputMaybe<StocktakeFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<StocktakeSortInput>>;
  storeId: Scalars['String'];
};


export type FullQueryStoresArgs = {
  filter?: InputMaybe<StoreFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<StoreSortInput>>;
};

export type InboundInvoiceCounts = {
  __typename: 'InboundInvoiceCounts';
  created: InvoiceCountsSummary;
};

export type InsertErrorInterface = {
  description: Scalars['String'];
};

export type InsertInboundShipmentError = {
  __typename: 'InsertInboundShipmentError';
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
  __typename: 'InsertInboundShipmentLineError';
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
  tax?: InputMaybe<TaxUpdate>;
  totalAfterTax: Scalars['Float'];
  totalBeforeTax: Scalars['Float'];
};

export type InsertInboundShipmentLineResponse = InsertInboundShipmentLineError | InvoiceLineNode;

export type InsertInboundShipmentLineResponseWithId = {
  __typename: 'InsertInboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: InsertInboundShipmentLineResponse;
};

export type InsertInboundShipmentResponse = InsertInboundShipmentError | InvoiceNode;

export type InsertInboundShipmentResponseWithId = {
  __typename: 'InsertInboundShipmentResponseWithId';
  id: Scalars['String'];
  response: InsertInboundShipmentResponse;
};

export type InsertInboundShipmentServiceLineError = {
  __typename: 'InsertInboundShipmentServiceLineError';
  error: InsertInboundShipmentServiceLineErrorInterface;
};

export type InsertInboundShipmentServiceLineErrorInterface = {
  description: Scalars['String'];
};

export type InsertInboundShipmentServiceLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  note?: InputMaybe<Scalars['String']>;
  tax?: InputMaybe<TaxUpdate>;
  totalAfterTax: Scalars['Float'];
  totalBeforeTax: Scalars['Float'];
};

export type InsertInboundShipmentServiceLineResponse = InsertInboundShipmentServiceLineError | InvoiceLineNode;

export type InsertInboundShipmentServiceLineResponseWithId = {
  __typename: 'InsertInboundShipmentServiceLineResponseWithId';
  id: Scalars['String'];
  response: InsertInboundShipmentServiceLineResponse;
};

export type InsertLocationError = {
  __typename: 'InsertLocationError';
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
  __typename: 'InsertOutboundShipmentError';
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
  theirReference?: InputMaybe<Scalars['String']>;
};

export type InsertOutboundShipmentLineError = {
  __typename: 'InsertOutboundShipmentLineError';
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
  tax?: InputMaybe<TaxUpdate>;
  totalAfterTax: Scalars['Float'];
  totalBeforeTax: Scalars['Float'];
};

export type InsertOutboundShipmentLineResponse = InsertOutboundShipmentLineError | InvoiceLineNode;

export type InsertOutboundShipmentLineResponseWithId = {
  __typename: 'InsertOutboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: InsertOutboundShipmentLineResponse;
};

export type InsertOutboundShipmentResponse = InsertOutboundShipmentError | InvoiceNode | NodeError;

export type InsertOutboundShipmentResponseWithId = {
  __typename: 'InsertOutboundShipmentResponseWithId';
  id: Scalars['String'];
  response: InsertOutboundShipmentResponse;
};

export type InsertOutboundShipmentServiceLineError = {
  __typename: 'InsertOutboundShipmentServiceLineError';
  error: InsertOutboundShipmentServiceLineErrorInterface;
};

export type InsertOutboundShipmentServiceLineErrorInterface = {
  description: Scalars['String'];
};

export type InsertOutboundShipmentServiceLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  note?: InputMaybe<Scalars['String']>;
  tax?: InputMaybe<TaxUpdate>;
  totalAfterTax: Scalars['Float'];
  totalBeforeTax: Scalars['Float'];
};

export type InsertOutboundShipmentServiceLineResponse = InsertOutboundShipmentServiceLineError | InvoiceLineNode;

export type InsertOutboundShipmentServiceLineResponseWithId = {
  __typename: 'InsertOutboundShipmentServiceLineResponseWithId';
  id: Scalars['String'];
  response: InsertOutboundShipmentServiceLineResponse;
};

export type InsertOutboundShipmentUnallocatedLineError = {
  __typename: 'InsertOutboundShipmentUnallocatedLineError';
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
  __typename: 'InsertOutboundShipmentUnallocatedLineResponseWithId';
  id: Scalars['String'];
  response: InsertOutboundShipmentUnallocatedLineResponse;
};

export type InsertRequestRequisitionError = {
  __typename: 'InsertRequestRequisitionError';
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
  __typename: 'InsertRequestRequisitionLineError';
  error: InsertRequestRequisitionLineErrorInterface;
};

export type InsertRequestRequisitionLineErrorInterface = {
  description: Scalars['String'];
};

export type InsertRequestRequisitionLineInput = {
  comment?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  itemId: Scalars['String'];
  requestedQuantity?: InputMaybe<Scalars['Int']>;
  requisitionId: Scalars['String'];
};

export type InsertRequestRequisitionLineResponse = InsertRequestRequisitionLineError | RequisitionLineNode;

export type InsertRequestRequisitionLineResponseWithId = {
  __typename: 'InsertRequestRequisitionLineResponseWithId';
  id: Scalars['String'];
  response: InsertRequestRequisitionLineResponse;
};

export type InsertRequestRequisitionResponse = InsertRequestRequisitionError | RequisitionNode;

export type InsertRequestRequisitionResponseWithId = {
  __typename: 'InsertRequestRequisitionResponseWithId';
  id: Scalars['String'];
  response: InsertRequestRequisitionResponse;
};

export type InsertStocktakeInput = {
  comment?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  isLocked?: InputMaybe<Scalars['Boolean']>;
  stocktakeDate?: InputMaybe<Scalars['NaiveDate']>;
};

export type InsertStocktakeLineError = {
  __typename: 'InsertStocktakeLineError';
  error: InsertStocktakeLineErrorInterface;
};

export type InsertStocktakeLineErrorInterface = {
  description: Scalars['String'];
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

export type InsertStocktakeLineResponse = InsertStocktakeLineError | StocktakeLineNode;

export type InsertStocktakeLineResponseWithId = {
  __typename: 'InsertStocktakeLineResponseWithId';
  id: Scalars['String'];
  response: InsertStocktakeLineResponse;
};

export type InsertStocktakeResponse = StocktakeNode;

export type InsertStocktakeResponseWithId = {
  __typename: 'InsertStocktakeResponseWithId';
  id: Scalars['String'];
  response: InsertStocktakeResponse;
};

export type InternalError = AuthTokenErrorInterface & InsertLocationErrorInterface & LogoutErrorInterface & RefreshTokenErrorInterface & UpdateLocationErrorInterface & UserRegisterErrorInterface & {
  __typename: 'InternalError';
  description: Scalars['String'];
  fullError: Scalars['String'];
};

export type InvalidCredentials = AuthTokenErrorInterface & {
  __typename: 'InvalidCredentials';
  description: Scalars['String'];
};

export type InvalidReport = PrintReportErrorInterface & {
  __typename: 'InvalidReport';
  description: Scalars['String'];
};

export type InvalidToken = RefreshTokenErrorInterface & {
  __typename: 'InvalidToken';
  description: Scalars['String'];
};

export type InvoiceConnector = {
  __typename: 'InvoiceConnector';
  nodes: Array<InvoiceNode>;
  totalCount: Scalars['Int'];
};

export type InvoiceCounts = {
  __typename: 'InvoiceCounts';
  inbound: InboundInvoiceCounts;
  outbound: OutboundInvoiceCounts;
};

export type InvoiceCountsSummary = {
  __typename: 'InvoiceCountsSummary';
  thisWeek: Scalars['Int'];
  today: Scalars['Int'];
};

export type InvoiceFilterInput = {
  allocatedDatetime?: InputMaybe<DatetimeFilterInput>;
  comment?: InputMaybe<SimpleStringFilterInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  deliveredDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  invoiceNumber?: InputMaybe<EqualFilterBigNumberInput>;
  linkedInvoiceId?: InputMaybe<EqualFilterStringInput>;
  otherPartyId?: InputMaybe<EqualFilterStringInput>;
  otherPartyName?: InputMaybe<SimpleStringFilterInput>;
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
  __typename: 'InvoiceIsNotEditable';
  description: Scalars['String'];
};

export type InvoiceLineConnector = {
  __typename: 'InvoiceLineConnector';
  nodes: Array<InvoiceLineNode>;
  totalCount: Scalars['Int'];
};

export type InvoiceLineNode = {
  __typename: 'InvoiceLineNode';
  batch?: Maybe<Scalars['String']>;
  costPricePerPack: Scalars['Float'];
  expiryDate?: Maybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  item: ItemNode;
  itemCode: Scalars['String'];
  itemId: Scalars['String'];
  itemName: Scalars['String'];
  location?: Maybe<LocationNode>;
  locationId?: Maybe<Scalars['String']>;
  locationName?: Maybe<Scalars['String']>;
  note?: Maybe<Scalars['String']>;
  numberOfPacks: Scalars['Int'];
  packSize: Scalars['Int'];
  pricing: PricingNode;
  sellPricePerPack: Scalars['Float'];
  stockLine?: Maybe<StockLineNode>;
  taxPercentage?: Maybe<Scalars['Float']>;
  totalAfterTax: Scalars['Float'];
  totalBeforeTax: Scalars['Float'];
  type: InvoiceLineNodeType;
};

export enum InvoiceLineNodeType {
  Service = 'SERVICE',
  StockIn = 'STOCK_IN',
  StockOut = 'STOCK_OUT',
  UnallocatedStock = 'UNALLOCATED_STOCK'
}

export type InvoiceNode = {
  __typename: 'InvoiceNode';
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
  otherParty: NameNode;
  otherPartyId: Scalars['String'];
  otherPartyName: Scalars['String'];
  otherPartyStore?: Maybe<StoreNode>;
  pickedDatetime?: Maybe<Scalars['DateTime']>;
  pricing: PricingNode;
  /**
   * Response Requisition that is the origin of this Outbound Shipment
   * Or Request Requisition for Inbound Shipment that Originated from Outbound Shipment (linked through Response Requisition)
   */
  requisition?: Maybe<RequisitionNode>;
  shippedDatetime?: Maybe<Scalars['DateTime']>;
  status: InvoiceNodeStatus;
  theirReference?: Maybe<Scalars['String']>;
  transportReference?: Maybe<Scalars['String']>;
  type: InvoiceNodeType;
  /**
   * User that last edited invoice, if user is not found in system default unknown user is returned
   * Null is returned for transfers, where inbound has not been edited yet
   * Null is also returned for system created invoices like inventory adjustments
   */
  user?: Maybe<UserNode>;
  verifiedDatetime?: Maybe<Scalars['DateTime']>;
};


export type InvoiceNodeOtherPartyArgs = {
  storeId: Scalars['String'];
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

export type ItemChartDataNode = {
  __typename: 'ItemChartDataNode';
  consumptionHistory: ConsumptionHistoryConnector;
  stockEvolution: StockEvolutionConnector;
  suggestedQuantityCalculation: SuggestedQuantityCalculationNode;
};

export type ItemConnector = {
  __typename: 'ItemConnector';
  nodes: Array<ItemNode>;
  totalCount: Scalars['Int'];
};

export type ItemFilterInput = {
  code?: InputMaybe<SimpleStringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  isVisible?: InputMaybe<Scalars['Boolean']>;
  name?: InputMaybe<SimpleStringFilterInput>;
  type?: InputMaybe<EqualFilterItemTypeInput>;
};

export type ItemNode = {
  __typename: 'ItemNode';
  availableBatches: StockLineConnector;
  code: Scalars['String'];
  id: Scalars['String'];
  isVisible: Scalars['Boolean'];
  name: Scalars['String'];
  stats: ItemStatsNode;
  type: ItemNodeType;
  unitName?: Maybe<Scalars['String']>;
};


export type ItemNodeAvailableBatchesArgs = {
  storeId: Scalars['String'];
};


export type ItemNodeStatsArgs = {
  lookBackDatetime?: InputMaybe<Scalars['NaiveDateTime']>;
  storeId: Scalars['String'];
};

export enum ItemNodeType {
  NonStock = 'NON_STOCK',
  Service = 'SERVICE',
  Stock = 'STOCK'
}

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
  __typename: 'ItemStatsNode';
  availableMonthsOfStockOnHand: Scalars['Float'];
  availableStockOnHand: Scalars['Int'];
  averageMonthlyConsumption: Scalars['Int'];
};

export type ItemsResponse = ItemConnector;

export type LocationConnector = {
  __typename: 'LocationConnector';
  nodes: Array<LocationNode>;
  totalCount: Scalars['Int'];
};

export type LocationFilterInput = {
  code?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<EqualFilterStringInput>;
};

export type LocationInUse = DeleteLocationErrorInterface & {
  __typename: 'LocationInUse';
  description: Scalars['String'];
  invoiceLines: InvoiceLineConnector;
  stockLines: StockLineConnector;
};

export type LocationIsOnHold = InsertOutboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename: 'LocationIsOnHold';
  description: Scalars['String'];
};

export type LocationNode = {
  __typename: 'LocationNode';
  code: Scalars['String'];
  id: Scalars['String'];
  name: Scalars['String'];
  onHold: Scalars['Boolean'];
  stock: StockLineConnector;
};

export type LocationNotFound = InsertOutboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename: 'LocationNotFound';
  description: Scalars['String'];
};

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
  __typename: 'Logout';
  /** User id of the logged out user */
  userId: Scalars['String'];
};

export type LogoutError = {
  __typename: 'LogoutError';
  error: LogoutErrorInterface;
};

export type LogoutErrorInterface = {
  description: Scalars['String'];
};

export type LogoutResponse = Logout | LogoutError;

export type MasterListConnector = {
  __typename: 'MasterListConnector';
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
  __typename: 'MasterListLineConnector';
  nodes: Array<MasterListLineNode>;
  totalCount: Scalars['Int'];
};

export type MasterListLineNode = {
  __typename: 'MasterListLineNode';
  id: Scalars['String'];
  item: ItemNode;
  itemId: Scalars['String'];
};

export type MasterListNode = {
  __typename: 'MasterListNode';
  code: Scalars['String'];
  description: Scalars['String'];
  id: Scalars['String'];
  lines: MasterListLineConnector;
  name: Scalars['String'];
};

export type MasterListNotFoundForThisStore = AddFromMasterListErrorInterface & {
  __typename: 'MasterListNotFoundForThisStore';
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

export type NameConnector = {
  __typename: 'NameConnector';
  nodes: Array<NameNode>;
  totalCount: Scalars['Int'];
};

export type NameFilterInput = {
  /** Filter by code */
  code?: InputMaybe<SimpleStringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  /** Filter by customer property */
  isCustomer?: InputMaybe<Scalars['Boolean']>;
  /** Is this name a store */
  isStore?: InputMaybe<Scalars['Boolean']>;
  /** Filter by supplier property */
  isSupplier?: InputMaybe<Scalars['Boolean']>;
  /**
   * Show system names (defaults to false)
   * System names don't have name_store_join thus if queried with true filter, is_visible filter should also be true or null
   * if is_visible is set to true and is_system_name is also true no system names will be returned
   */
  isSystemName?: InputMaybe<Scalars['Boolean']>;
  /** Visibility in current store (based on store_id parameter and existance of name_store_join record) */
  isVisible?: InputMaybe<Scalars['Boolean']>;
  /** Filter by name */
  name?: InputMaybe<SimpleStringFilterInput>;
  /** Code of the store if store is linked to name */
  storeCode?: InputMaybe<SimpleStringFilterInput>;
};

export type NameNode = {
  __typename: 'NameNode';
  code: Scalars['String'];
  id: Scalars['String'];
  isCustomer: Scalars['Boolean'];
  isSupplier: Scalars['Boolean'];
  isSystemName: Scalars['Boolean'];
  isVisible: Scalars['Boolean'];
  name: Scalars['String'];
  store?: Maybe<StoreNode>;
};

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
  __typename: 'NoRefreshTokenProvided';
  description: Scalars['String'];
};

/** Generic Error Wrapper */
export type NodeError = {
  __typename: 'NodeError';
  error: NodeErrorInterface;
};

export type NodeErrorInterface = {
  description: Scalars['String'];
};

export type NotARefreshToken = RefreshTokenErrorInterface & {
  __typename: 'NotARefreshToken';
  description: Scalars['String'];
};

export type NotAnInboundShipment = UpdateInboundShipmentLineErrorInterface & {
  __typename: 'NotAnInboundShipment';
  description: Scalars['String'];
};

export type NotAnOutboundShipmentError = UpdateErrorInterface & {
  __typename: 'NotAnOutboundShipmentError';
  description: Scalars['String'];
};

export type NotEnoughStockForReduction = InsertOutboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename: 'NotEnoughStockForReduction';
  batch: StockLineResponse;
  description: Scalars['String'];
  line?: Maybe<InvoiceLineNode>;
};

export type NothingRemainingToSupply = CreateRequisitionShipmentErrorInterface & {
  __typename: 'NothingRemainingToSupply';
  description: Scalars['String'];
};

export type OtherPartyNotACustomer = InsertErrorInterface & UpdateErrorInterface & {
  __typename: 'OtherPartyNotACustomer';
  description: Scalars['String'];
};

export type OtherPartyNotASupplier = InsertInboundShipmentErrorInterface & InsertRequestRequisitionErrorInterface & UpdateInboundShipmentErrorInterface & UpdateRequestRequisitionErrorInterface & {
  __typename: 'OtherPartyNotASupplier';
  description: Scalars['String'];
};

export type OtherPartyNotVisible = InsertErrorInterface & InsertInboundShipmentErrorInterface & InsertRequestRequisitionErrorInterface & UpdateErrorInterface & UpdateInboundShipmentErrorInterface & UpdateRequestRequisitionErrorInterface & {
  __typename: 'OtherPartyNotVisible';
  description: Scalars['String'];
};

export type OutboundInvoiceCounts = {
  __typename: 'OutboundInvoiceCounts';
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

export type PricingNode = {
  __typename: 'PricingNode';
  serviceTotalAfterTax: Scalars['Float'];
  serviceTotalBeforeTax: Scalars['Float'];
  stockTotalAfterTax: Scalars['Float'];
  stockTotalBeforeTax: Scalars['Float'];
  taxPercentage?: Maybe<Scalars['Float']>;
  totalAfterTax: Scalars['Float'];
  totalBeforeTax: Scalars['Float'];
};

export type PrintReportError = {
  __typename: 'PrintReportError';
  error: PrintReportErrorInterface;
};

export type PrintReportErrorInterface = {
  description: Scalars['String'];
};

export type PrintReportNode = {
  __typename: 'PrintReportNode';
  /**
   * Return the file id of the printed report.
   * The file can be fetched using the /files?id={id} endpoint
   */
  fileId: Scalars['String'];
};

export type PrintReportResponse = PrintReportError | PrintReportNode;

export type RecordAlreadyExist = InsertLocationErrorInterface & UserRegisterErrorInterface & {
  __typename: 'RecordAlreadyExist';
  description: Scalars['String'];
};

export type RecordBelongsToAnotherStore = DeleteLocationErrorInterface & UpdateLocationErrorInterface & {
  __typename: 'RecordBelongsToAnotherStore';
  description: Scalars['String'];
};

export type RecordNotFound = AddFromMasterListErrorInterface & AllocateOutboundShipmentUnallocatedLineErrorInterface & CreateRequisitionShipmentErrorInterface & DeleteErrorInterface & DeleteInboundShipmentErrorInterface & DeleteInboundShipmentLineErrorInterface & DeleteInboundShipmentServiceLineErrorInterface & DeleteLocationErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & DeleteOutboundShipmentUnallocatedLineErrorInterface & DeleteRequestRequisitionErrorInterface & DeleteRequestRequisitionLineErrorInterface & NodeErrorInterface & PrintReportErrorInterface & SupplyRequestedQuantityErrorInterface & UpdateErrorInterface & UpdateInboundShipmentErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateInboundShipmentServiceLineErrorInterface & UpdateLocationErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & UpdateOutboundShipmentUnallocatedLineErrorInterface & UpdateRequestRequisitionErrorInterface & UpdateRequestRequisitionLineErrorInterface & UpdateResponseRequisitionErrorInterface & UpdateResponseRequisitionLineErrorInterface & UseSuggestedQuantityErrorInterface & {
  __typename: 'RecordNotFound';
  description: Scalars['String'];
};

export type RefreshToken = {
  __typename: 'RefreshToken';
  /** New Bearer token */
  token: Scalars['String'];
};

export type RefreshTokenError = {
  __typename: 'RefreshTokenError';
  error: RefreshTokenErrorInterface;
};

export type RefreshTokenErrorInterface = {
  description: Scalars['String'];
};

export type RefreshTokenResponse = RefreshToken | RefreshTokenError;

export type RegisteredUser = {
  __typename: 'RegisteredUser';
  email?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  username: Scalars['String'];
};

export enum ReportCategory {
  InboundShipment = 'INBOUND_SHIPMENT',
  OutboundShipment = 'OUTBOUND_SHIPMENT',
  Requisition = 'REQUISITION',
  Stocktake = 'STOCKTAKE'
}

export type ReportConnector = {
  __typename: 'ReportConnector';
  nodes: Array<ReportNode>;
  totalCount: Scalars['Int'];
};

export type ReportFilterInput = {
  category?: InputMaybe<EqualFilterReportCategoryInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<SimpleStringFilterInput>;
};

export type ReportNode = {
  __typename: 'ReportNode';
  category: ReportCategory;
  id: Scalars['String'];
  /** Human readable name of the report */
  name: Scalars['String'];
};

export enum ReportSortFieldInput {
  Category = 'category',
  Name = 'name'
}

export type ReportSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: ReportSortFieldInput;
};

export type ReportsResponse = ReportConnector;

export type RequisitionConnector = {
  __typename: 'RequisitionConnector';
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
  __typename: 'RequisitionLineConnector';
  nodes: Array<RequisitionLineNode>;
  totalCount: Scalars['Int'];
};

export type RequisitionLineNode = {
  __typename: 'RequisitionLineNode';
  chartData: ItemChartDataNode;
  comment?: Maybe<Scalars['String']>;
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
  /**
   * Quantity remaining to supply
   * supplyQuantity minus all (including unallocated) linked invoice lines numberOfPacks * packSize
   * Only available in response requisition, request requistion returns 0
   */
  remainingQuantityToSupply: Scalars['Int'];
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
  __typename: 'RequisitionLineWithItemIdExists';
  description: Scalars['String'];
};

export type RequisitionNode = {
  __typename: 'RequisitionNode';
  colour?: Maybe<Scalars['String']>;
  comment?: Maybe<Scalars['String']>;
  createdDatetime: Scalars['DateTime'];
  finalisedDatetime?: Maybe<Scalars['DateTime']>;
  id: Scalars['String'];
  lines: RequisitionLineConnector;
  /**
   * All lines that have not been supplied
   * based on same logic as RequisitionLineNode.remainingQuantityToSupply
   * only applicable to Response requisition, Request requisition will empty connector
   */
  linesRemainingToSupply: RequisitionLineConnector;
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
  /**
   * User that last edited requisition, if user is not found in system default unknown user is returned
   * Null is returned for transfers, where response requisition has not been edited yet
   */
  user?: Maybe<UserNode>;
};


export type RequisitionNodeOtherPartyArgs = {
  storeId: Scalars['String'];
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
  Comment = 'comment',
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
  __typename: 'SnapshotCountCurrentCountMismatch';
  description: Scalars['String'];
  lines: StocktakeLineConnector;
};

export type StockCounts = {
  __typename: 'StockCounts';
  expired: Scalars['Int'];
  expiringSoon: Scalars['Int'];
};

export type StockEvolutionConnector = {
  __typename: 'StockEvolutionConnector';
  nodes: Array<StockEvolutionNode>;
  totalCount: Scalars['Int'];
};

export type StockEvolutionNode = {
  __typename: 'StockEvolutionNode';
  date: Scalars['NaiveDate'];
  isHistoric: Scalars['Boolean'];
  max: Scalars['Int'];
  min: Scalars['Int'];
  stockOnHand: Scalars['Int'];
};

export type StockLineAlreadyExistsInInvoice = InsertOutboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename: 'StockLineAlreadyExistsInInvoice';
  description: Scalars['String'];
  line: InvoiceLineNode;
};

export type StockLineConnector = {
  __typename: 'StockLineConnector';
  nodes: Array<StockLineNode>;
  totalCount: Scalars['Int'];
};

export type StockLineIsOnHold = InsertOutboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename: 'StockLineIsOnHold';
  description: Scalars['String'];
};

export type StockLineNode = {
  __typename: 'StockLineNode';
  availableNumberOfPacks: Scalars['Int'];
  batch?: Maybe<Scalars['String']>;
  costPricePerPack: Scalars['Float'];
  expiryDate?: Maybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  item: ItemNode;
  itemId: Scalars['String'];
  location?: Maybe<LocationNode>;
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
  __typename: 'StocktakeConnector';
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

export type StocktakeIsLocked = UpdateStocktakeErrorInterface & {
  __typename: 'StocktakeIsLocked';
  description: Scalars['String'];
};

export type StocktakeLineConnector = {
  __typename: 'StocktakeLineConnector';
  nodes: Array<StocktakeLineNode>;
  totalCount: Scalars['Int'];
};

export type StocktakeLineNode = {
  __typename: 'StocktakeLineNode';
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
  __typename: 'StocktakeNode';
  comment?: Maybe<Scalars['String']>;
  createdDatetime: Scalars['NaiveDateTime'];
  description?: Maybe<Scalars['String']>;
  finalisedDatetime?: Maybe<Scalars['NaiveDateTime']>;
  id: Scalars['String'];
  inventoryAdjustment?: Maybe<InvoiceNode>;
  inventoryAdjustmentId?: Maybe<Scalars['String']>;
  isLocked: Scalars['Boolean'];
  lines: StocktakeLineConnector;
  status: StocktakeNodeStatus;
  stocktakeDate?: Maybe<Scalars['NaiveDate']>;
  stocktakeNumber: Scalars['Int'];
  storeId: Scalars['String'];
  /** User that created stocktake, if user is not found in system default unknown user is returned */
  user: UserNode;
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
  __typename: 'StoreConnector';
  nodes: Array<StoreNode>;
  totalCount: Scalars['Int'];
};

export type StoreFilterInput = {
  code?: InputMaybe<SimpleStringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<SimpleStringFilterInput>;
  nameCode?: InputMaybe<SimpleStringFilterInput>;
};

export type StoreNode = {
  __typename: 'StoreNode';
  code: Scalars['String'];
  id: Scalars['String'];
  name: NameNode;
};


export type StoreNodeNameArgs = {
  storeId: Scalars['String'];
};

export enum StoreSortFieldInput {
  Code = 'code',
  Name = 'name',
  NameCode = 'nameCode'
}

export type StoreSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: StoreSortFieldInput;
};

export type StoresResponse = StoreConnector;

export type SuggestedQuantityCalculationNode = {
  __typename: 'SuggestedQuantityCalculationNode';
  averageMonthlyConsumption: Scalars['Float'];
  /** Target */
  maximumStockOnHand: Scalars['Int'];
  /** If stock on hand > minimum stock on hand, suggested will be 0 */
  minimumStockOnHand: Scalars['Int'];
  stockOnHand: Scalars['Int'];
  suggested: Scalars['Int'];
};

export type SupplyRequestedQuantityError = {
  __typename: 'SupplyRequestedQuantityError';
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
  __typename: 'TokenExpired';
  description: Scalars['String'];
};

export type UnallocatedLineForItemAlreadyExists = InsertOutboundShipmentUnallocatedLineErrorInterface & {
  __typename: 'UnallocatedLineForItemAlreadyExists';
  description: Scalars['String'];
};

export type UnallocatedLinesOnlyEditableInNewInvoice = InsertOutboundShipmentUnallocatedLineErrorInterface & {
  __typename: 'UnallocatedLinesOnlyEditableInNewInvoice';
  description: Scalars['String'];
};

export enum UniqueValueKey {
  Code = 'code'
}

export type UniqueValueViolation = InsertLocationErrorInterface & UpdateLocationErrorInterface & {
  __typename: 'UniqueValueViolation';
  description: Scalars['String'];
  field: UniqueValueKey;
};

export type UpdateErrorInterface = {
  description: Scalars['String'];
};

export type UpdateInboundShipmentError = {
  __typename: 'UpdateInboundShipmentError';
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
  __typename: 'UpdateInboundShipmentLineError';
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

export type UpdateInboundShipmentLineResponse = InvoiceLineNode | UpdateInboundShipmentLineError;

export type UpdateInboundShipmentLineResponseWithId = {
  __typename: 'UpdateInboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: UpdateInboundShipmentLineResponse;
};

export type UpdateInboundShipmentResponse = InvoiceNode | UpdateInboundShipmentError;

export type UpdateInboundShipmentResponseWithId = {
  __typename: 'UpdateInboundShipmentResponseWithId';
  id: Scalars['String'];
  response: UpdateInboundShipmentResponse;
};

export type UpdateInboundShipmentServiceLineError = {
  __typename: 'UpdateInboundShipmentServiceLineError';
  error: UpdateInboundShipmentServiceLineErrorInterface;
};

export type UpdateInboundShipmentServiceLineErrorInterface = {
  description: Scalars['String'];
};

export type UpdateInboundShipmentServiceLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  note?: InputMaybe<Scalars['String']>;
  tax?: InputMaybe<TaxUpdate>;
  totalAfterTax?: InputMaybe<Scalars['Float']>;
  totalBeforeTax?: InputMaybe<Scalars['Float']>;
};

export type UpdateInboundShipmentServiceLineResponse = InvoiceLineNode | UpdateInboundShipmentServiceLineError;

export type UpdateInboundShipmentServiceLineResponseWithId = {
  __typename: 'UpdateInboundShipmentServiceLineResponseWithId';
  id: Scalars['String'];
  response: UpdateInboundShipmentServiceLineResponse;
};

export enum UpdateInboundShipmentStatusInput {
  Delivered = 'DELIVERED',
  Verified = 'VERIFIED'
}

export type UpdateLocationError = {
  __typename: 'UpdateLocationError';
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
  __typename: 'UpdateOutboundShipmentError';
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
  transportReference?: InputMaybe<Scalars['String']>;
};

export type UpdateOutboundShipmentLineError = {
  __typename: 'UpdateOutboundShipmentLineError';
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

export type UpdateOutboundShipmentLineResponse = InvoiceLineNode | UpdateOutboundShipmentLineError;

export type UpdateOutboundShipmentLineResponseWithId = {
  __typename: 'UpdateOutboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: UpdateOutboundShipmentLineResponse;
};

export type UpdateOutboundShipmentResponse = InvoiceNode | NodeError | UpdateOutboundShipmentError;

export type UpdateOutboundShipmentResponseWithId = {
  __typename: 'UpdateOutboundShipmentResponseWithId';
  id: Scalars['String'];
  response: UpdateOutboundShipmentResponse;
};

export type UpdateOutboundShipmentServiceLineError = {
  __typename: 'UpdateOutboundShipmentServiceLineError';
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
  __typename: 'UpdateOutboundShipmentServiceLineResponseWithId';
  id: Scalars['String'];
  response: UpdateOutboundShipmentServiceLineResponse;
};

export enum UpdateOutboundShipmentStatusInput {
  Allocated = 'ALLOCATED',
  Picked = 'PICKED',
  Shipped = 'SHIPPED'
}

export type UpdateOutboundShipmentUnallocatedLineError = {
  __typename: 'UpdateOutboundShipmentUnallocatedLineError';
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
  __typename: 'UpdateOutboundShipmentUnallocatedLineResponseWithId';
  id: Scalars['String'];
  response: UpdateOutboundShipmentUnallocatedLineResponse;
};

export type UpdateRequestRequisitionError = {
  __typename: 'UpdateRequestRequisitionError';
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
  otherPartyId?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<UpdateRequestRequisitionStatusInput>;
  theirReference?: InputMaybe<Scalars['String']>;
};

export type UpdateRequestRequisitionLineError = {
  __typename: 'UpdateRequestRequisitionLineError';
  error: UpdateRequestRequisitionLineErrorInterface;
};

export type UpdateRequestRequisitionLineErrorInterface = {
  description: Scalars['String'];
};

export type UpdateRequestRequisitionLineInput = {
  comment?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  requestedQuantity?: InputMaybe<Scalars['Int']>;
};

export type UpdateRequestRequisitionLineResponse = RequisitionLineNode | UpdateRequestRequisitionLineError;

export type UpdateRequestRequisitionLineResponseWithId = {
  __typename: 'UpdateRequestRequisitionLineResponseWithId';
  id: Scalars['String'];
  response: UpdateRequestRequisitionLineResponse;
};

export type UpdateRequestRequisitionResponse = RequisitionNode | UpdateRequestRequisitionError;

export type UpdateRequestRequisitionResponseWithId = {
  __typename: 'UpdateRequestRequisitionResponseWithId';
  id: Scalars['String'];
  response: UpdateRequestRequisitionResponse;
};

export enum UpdateRequestRequisitionStatusInput {
  Sent = 'SENT'
}

export type UpdateResponseRequisitionError = {
  __typename: 'UpdateResponseRequisitionError';
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
  __typename: 'UpdateResponseRequisitionLineError';
  error: UpdateResponseRequisitionLineErrorInterface;
};

export type UpdateResponseRequisitionLineErrorInterface = {
  description: Scalars['String'];
};

export type UpdateResponseRequisitionLineInput = {
  comment?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  supplyQuantity?: InputMaybe<Scalars['Int']>;
};

export type UpdateResponseRequisitionLineResponse = RequisitionLineNode | UpdateResponseRequisitionLineError;

export type UpdateResponseRequisitionResponse = RequisitionNode | UpdateResponseRequisitionError;

export enum UpdateResponseRequisitionStatusInput {
  Finalised = 'FINALISED'
}

export type UpdateStocktakeError = {
  __typename: 'UpdateStocktakeError';
  error: UpdateStocktakeErrorInterface;
};

export type UpdateStocktakeErrorInterface = {
  description: Scalars['String'];
};

export type UpdateStocktakeInput = {
  comment?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  isLocked?: InputMaybe<Scalars['Boolean']>;
  status?: InputMaybe<StocktakeNodeStatus>;
  stocktakeDate?: InputMaybe<Scalars['NaiveDate']>;
};

export type UpdateStocktakeLineError = {
  __typename: 'UpdateStocktakeLineError';
  error: UpdateStocktakeLineErrorInterface;
};

export type UpdateStocktakeLineErrorInterface = {
  description: Scalars['String'];
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

export type UpdateStocktakeLineResponse = StocktakeLineNode | UpdateStocktakeLineError;

export type UpdateStocktakeLineResponseWithId = {
  __typename: 'UpdateStocktakeLineResponseWithId';
  id: Scalars['String'];
  response: UpdateStocktakeLineResponse;
};

export type UpdateStocktakeResponse = StocktakeNode | UpdateStocktakeError;

export type UpdateStocktakeResponseWithId = {
  __typename: 'UpdateStocktakeResponseWithId';
  id: Scalars['String'];
  response: UpdateStocktakeResponse;
};

export type UseSuggestedQuantityError = {
  __typename: 'UseSuggestedQuantityError';
  error: UseSuggestedQuantityErrorInterface;
};

export type UseSuggestedQuantityErrorInterface = {
  description: Scalars['String'];
};

export type UseSuggestedQuantityInput = {
  requestRequisitionId: Scalars['String'];
};

export type UseSuggestedQuantityResponse = RequisitionLineConnector | UseSuggestedQuantityError;

export type UserNameDoesNotExist = AuthTokenErrorInterface & {
  __typename: 'UserNameDoesNotExist';
  description: Scalars['String'];
};

export type UserNode = {
  __typename: 'UserNode';
  /** The user's email address */
  email?: Maybe<Scalars['String']>;
  /** Internal user id */
  userId: Scalars['String'];
  username: Scalars['String'];
};

export type UserRegisterError = {
  __typename: 'UserRegisterError';
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

export type UserResponse = UserNode;
