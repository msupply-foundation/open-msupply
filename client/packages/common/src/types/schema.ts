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
  /** A scalar that can represent any JSON value. */
  JSON: any;
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
};

export type ActivityLogConnector = {
  __typename: 'ActivityLogConnector';
  nodes: Array<ActivityLogNode>;
  totalCount: Scalars['Int'];
};

export type ActivityLogFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  recordId?: InputMaybe<EqualFilterStringInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterActivityLogTypeInput>;
  userId?: InputMaybe<EqualFilterStringInput>;
};

export type ActivityLogNode = {
  __typename: 'ActivityLogNode';
  datetime: Scalars['DateTime'];
  event?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  recordId?: Maybe<Scalars['String']>;
  store?: Maybe<StoreNode>;
  storeId?: Maybe<Scalars['String']>;
  type: ActivityLogNodeType;
  user?: Maybe<UserNode>;
};

export enum ActivityLogNodeType {
  InvoiceCreated = 'INVOICE_CREATED',
  InvoiceDeleted = 'INVOICE_DELETED',
  InvoiceStatusAllocated = 'INVOICE_STATUS_ALLOCATED',
  InvoiceStatusDelivered = 'INVOICE_STATUS_DELIVERED',
  InvoiceStatusPicked = 'INVOICE_STATUS_PICKED',
  InvoiceStatusShipped = 'INVOICE_STATUS_SHIPPED',
  InvoiceStatusVerified = 'INVOICE_STATUS_VERIFIED',
  RequisitionCreated = 'REQUISITION_CREATED',
  RequisitionDeleted = 'REQUISITION_DELETED',
  RequisitionStatusFinalised = 'REQUISITION_STATUS_FINALISED',
  RequisitionStatusSent = 'REQUISITION_STATUS_SENT',
  StocktakeCreated = 'STOCKTAKE_CREATED',
  StocktakeDeleted = 'STOCKTAKE_DELETED',
  StocktakeStatusFinalised = 'STOCKTAKE_STATUS_FINALISED',
  StockBatchChange = 'STOCK_BATCH_CHANGE',
  StockCostPriceChange = 'STOCK_COST_PRICE_CHANGE',
  StockExpiryDateChange = 'STOCK_EXPIRY_DATE_CHANGE',
  StockLocationChange = 'STOCK_LOCATION_CHANGE',
  StockOffHold = 'STOCK_OFF_HOLD',
  StockOnHold = 'STOCK_ON_HOLD',
  StockSellPriceChange = 'STOCK_SELL_PRICE_CHANGE',
  UserLoggedIn = 'USER_LOGGED_IN'
}

export type ActivityLogResponse = ActivityLogConnector;

export enum ActivityLogSortFieldInput {
  ActivityLogType = 'activityLogType',
  Id = 'id',
  RecordId = 'recordId',
  UserId = 'userId'
}

export type ActivityLogSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: ActivityLogSortFieldInput;
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

export type AddToInboundShipmentFromMasterListError = {
  __typename: 'AddToInboundShipmentFromMasterListError';
  error: AddToInboundShipmentFromMasterListErrorInterface;
};

export type AddToInboundShipmentFromMasterListErrorInterface = {
  description: Scalars['String'];
};

export type AddToInboundShipmentFromMasterListResponse = AddToInboundShipmentFromMasterListError | InvoiceLineConnector;

export type AddToOutboundShipmentFromMasterListError = {
  __typename: 'AddToOutboundShipmentFromMasterListError';
  error: AddToOutboundShipmentFromMasterListErrorInterface;
};

export type AddToOutboundShipmentFromMasterListErrorInterface = {
  description: Scalars['String'];
};

export type AddToOutboundShipmentFromMasterListResponse = AddToOutboundShipmentFromMasterListError | InvoiceLineConnector;

export type AddToShipmentFromMasterListInput = {
  masterListId: Scalars['String'];
  shipmentId: Scalars['String'];
};

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
  issuedExpiringSoonStockLines: StockLineConnector;
  skippedExpiredStockLines: StockLineConnector;
  skippedOnHoldStockLines: StockLineConnector;
  updates: InvoiceLineConnector;
};

export type AllocateOutboundShipmentUnallocatedLineResponse = AllocateOutboundShipmentUnallocatedLineError | AllocateOutboundShipmentUnallocatedLineNode;

export type AllocateOutboundShipmentUnallocatedLineResponseWithId = {
  __typename: 'AllocateOutboundShipmentUnallocatedLineResponseWithId';
  id: Scalars['String'];
  response: AllocateOutboundShipmentUnallocatedLineResponse;
};

export type AllocateProgramNumberInput = {
  numberName: Scalars['String'];
};

export type AllocateProgramNumberResponse = NumberNode;

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

export type CannotEditInvoice = AddToInboundShipmentFromMasterListErrorInterface & AddToOutboundShipmentFromMasterListErrorInterface & DeleteErrorInterface & DeleteInboundShipmentErrorInterface & DeleteInboundShipmentLineErrorInterface & DeleteInboundShipmentServiceLineErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & InsertInboundShipmentLineErrorInterface & InsertInboundShipmentServiceLineErrorInterface & InsertOutboundShipmentLineErrorInterface & InsertOutboundShipmentServiceLineErrorInterface & UpdateInboundShipmentErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateInboundShipmentServiceLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & {
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
  averageMonthlyConsumption: Scalars['Int'];
  consumption: Scalars['Int'];
  date: Scalars['NaiveDate'];
  isCurrent: Scalars['Boolean'];
  isHistoric: Scalars['Boolean'];
};

export type ConsumptionOptionsInput = {
  /** Defaults to 3 months */
  amcLookbackMonths?: InputMaybe<Scalars['Int']>;
  /** Defaults to 12 */
  numberOfDataPoints?: InputMaybe<Scalars['Int']>;
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

export type DatabaseError = DeleteLocationErrorInterface & InsertLocationErrorInterface & NodeErrorInterface & RefreshTokenErrorInterface & UpdateLocationErrorInterface & {
  __typename: 'DatabaseError';
  description: Scalars['String'];
  fullError: Scalars['String'];
};

export type DateFilterInput = {
  afterOrEqualTo?: InputMaybe<Scalars['NaiveDate']>;
  beforeOrEqualTo?: InputMaybe<Scalars['NaiveDate']>;
  equalTo?: InputMaybe<Scalars['NaiveDate']>;
};

export type DatetimeFilterInput = {
  afterOrEqualTo?: InputMaybe<Scalars['DateTime']>;
  beforeOrEqualTo?: InputMaybe<Scalars['DateTime']>;
  equalTo?: InputMaybe<Scalars['DateTime']>;
};

export type DeleteDocumentInput = {
  comment?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
};

export type DeleteDocumentResponse = DeleteResponse;

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

export type DisplaySettingNode = {
  __typename: 'DisplaySettingNode';
  hash: Scalars['String'];
  value: Scalars['String'];
};

export type DisplaySettingsHash = {
  logo: Scalars['String'];
  theme: Scalars['String'];
};

export type DisplaySettingsInput = {
  customLogo?: InputMaybe<Scalars['String']>;
  customTheme?: InputMaybe<Scalars['String']>;
};

export type DisplaySettingsNode = {
  __typename: 'DisplaySettingsNode';
  customLogo?: Maybe<DisplaySettingNode>;
  customTheme?: Maybe<DisplaySettingNode>;
};

export type DocumentConnector = {
  __typename: 'DocumentConnector';
  nodes: Array<DocumentNode>;
  totalCount: Scalars['Int'];
};

export type DocumentFilterInput = {
  context?: InputMaybe<EqualFilterStringInput>;
  /**
   * 	This filter makes it possible to search the raw text json data.
   * Be beware of potential performance issues.
   */
  data?: InputMaybe<SimpleStringFilterInput>;
  datetime?: InputMaybe<DatetimeFilterInput>;
  name?: InputMaybe<EqualFilterStringInput>;
  owner?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export type DocumentHistoryResponse = DocumentConnector;

export type DocumentNode = {
  __typename: 'DocumentNode';
  author: Scalars['String'];
  data: Scalars['JSON'];
  documentRegistry?: Maybe<DocumentRegistryNode>;
  id: Scalars['String'];
  name: Scalars['String'];
  parents: Array<Scalars['String']>;
  schema?: Maybe<JsonschemaNode>;
  timestamp: Scalars['DateTime'];
  type: Scalars['String'];
};

export type DocumentRegistryConnector = {
  __typename: 'DocumentRegistryConnector';
  nodes: Array<DocumentRegistryNode>;
  totalCount: Scalars['Int'];
};

export type DocumentRegistryFilterInput = {
  context?: InputMaybe<EqualFilterDocumentRegistryContextInput>;
  documentType?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  parentId?: InputMaybe<EqualFilterStringInput>;
};

export type DocumentRegistryNode = {
  __typename: 'DocumentRegistryNode';
  children: Array<DocumentRegistryNode>;
  context: DocumentRegistryNodeContext;
  documentType: Scalars['String'];
  formSchemaId: Scalars['String'];
  id: Scalars['String'];
  jsonSchema: Scalars['JSON'];
  name?: Maybe<Scalars['String']>;
  parentId?: Maybe<Scalars['String']>;
  uiSchema: Scalars['JSON'];
  uiSchemaType: Scalars['String'];
};

export enum DocumentRegistryNodeContext {
  Custom = 'CUSTOM',
  Encounter = 'ENCOUNTER',
  Patient = 'PATIENT',
  Program = 'PROGRAM'
}

export type DocumentRegistryResponse = DocumentRegistryConnector;

export enum DocumentRegistrySortFieldInput {
  Context = 'context',
  DocumentType = 'documentType'
}

export type DocumentRegistrySortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: DocumentRegistrySortFieldInput;
};

export type DocumentResponse = DocumentConnector;

export enum DocumentSortFieldInput {
  Context = 'context',
  Datetime = 'datetime',
  Name = 'name',
  Owner = 'owner',
  Type = 'type'
}

export type DocumentSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: DocumentSortFieldInput;
};

export type EncounterConnector = {
  __typename: 'EncounterConnector';
  nodes: Array<EncounterNode>;
  totalCount: Scalars['Int'];
};

export type EncounterFieldsConnector = {
  __typename: 'EncounterFieldsConnector';
  nodes: Array<EncounterFieldsNode>;
  totalCount: Scalars['Int'];
};

export type EncounterFieldsInput = {
  fields: Array<Scalars['String']>;
};

export type EncounterFieldsNode = {
  __typename: 'EncounterFieldsNode';
  encounter: EncounterNode;
  fields: Array<Scalars['JSON']>;
};

export type EncounterFieldsResponse = EncounterFieldsConnector;

export type EncounterFilterInput = {
  endDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<EqualFilterStringInput>;
  patientId?: InputMaybe<EqualFilterStringInput>;
  program?: InputMaybe<EqualFilterStringInput>;
  startDatetime?: InputMaybe<DatetimeFilterInput>;
  status?: InputMaybe<EqualFilterEncounterStatusInput>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export type EncounterNode = {
  __typename: 'EncounterNode';
  /** The encounter document */
  document: DocumentNode;
  endDatetime?: Maybe<Scalars['DateTime']>;
  events: Array<ProgramEventNode>;
  id: Scalars['String'];
  name: Scalars['String'];
  patient: NameNode;
  patientId: Scalars['String'];
  program: Scalars['String'];
  startDatetime: Scalars['DateTime'];
  status?: Maybe<EncounterNodeStatus>;
  type: Scalars['String'];
};


export type EncounterNodeEventsArgs = {
  at?: InputMaybe<Scalars['DateTime']>;
  filter?: InputMaybe<ProgramEventFilterInput>;
};

export enum EncounterNodeStatus {
  Cancelled = 'CANCELLED',
  Done = 'DONE',
  Scheduled = 'SCHEDULED'
}

export type EncounterResponse = EncounterConnector;

export enum EncounterSortFieldInput {
  EndDatetime = 'endDatetime',
  PatientId = 'patientId',
  Program = 'program',
  StartDatetime = 'startDatetime',
  Status = 'status',
  Type = 'type'
}

export type EncounterSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: EncounterSortFieldInput;
};

export type EqualFilterActivityLogTypeInput = {
  equalAny?: InputMaybe<Array<ActivityLogNodeType>>;
  equalTo?: InputMaybe<ActivityLogNodeType>;
  notEqualTo?: InputMaybe<ActivityLogNodeType>;
};

export type EqualFilterBigNumberInput = {
  equalAny?: InputMaybe<Array<Scalars['Int']>>;
  equalTo?: InputMaybe<Scalars['Int']>;
  notEqualTo?: InputMaybe<Scalars['Int']>;
};

export type EqualFilterDocumentRegistryContextInput = {
  equalAny?: InputMaybe<Array<DocumentRegistryNodeContext>>;
  equalTo?: InputMaybe<DocumentRegistryNodeContext>;
  notEqualTo?: InputMaybe<DocumentRegistryNodeContext>;
};

export type EqualFilterEncounterStatusInput = {
  equalAny?: InputMaybe<Array<EncounterNodeStatus>>;
  equalTo?: InputMaybe<EncounterNodeStatus>;
  notEqualTo?: InputMaybe<EncounterNodeStatus>;
};

export type EqualFilterGenderInput = {
  equalAny?: InputMaybe<Array<GenderInput>>;
  equalTo?: InputMaybe<GenderInput>;
  notEqualTo?: InputMaybe<GenderInput>;
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

export type EqualFilterNumberInput = {
  equalAny?: InputMaybe<Array<Scalars['Int']>>;
  equalTo?: InputMaybe<Scalars['Int']>;
  notEqualTo?: InputMaybe<Scalars['Int']>;
};

export type EqualFilterReportContextInput = {
  equalAny?: InputMaybe<Array<ReportContext>>;
  equalTo?: InputMaybe<ReportContext>;
  notEqualTo?: InputMaybe<ReportContext>;
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

export type EqualFilterTypeInput = {
  equalAny?: InputMaybe<Array<NameNodeType>>;
  equalTo?: InputMaybe<NameNodeType>;
  notEqualTo?: InputMaybe<NameNodeType>;
};

export type FailedToFetchReportData = PrintReportErrorInterface & {
  __typename: 'FailedToFetchReportData';
  description: Scalars['String'];
  errors: Scalars['JSON'];
};

export enum ForeignKey {
  InvoiceId = 'invoiceId',
  ItemId = 'itemId',
  LocationId = 'locationId',
  OtherPartyId = 'otherPartyId',
  RequisitionId = 'requisitionId',
  StockLineId = 'stockLineId'
}

export type ForeignKeyError = DeleteInboundShipmentLineErrorInterface & DeleteInboundShipmentServiceLineErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & DeleteOutboundShipmentUnallocatedLineErrorInterface & InsertInboundShipmentLineErrorInterface & InsertInboundShipmentServiceLineErrorInterface & InsertOutboundShipmentLineErrorInterface & InsertOutboundShipmentServiceLineErrorInterface & InsertOutboundShipmentUnallocatedLineErrorInterface & InsertRequestRequisitionLineErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateInboundShipmentServiceLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & UpdateOutboundShipmentUnallocatedLineErrorInterface & UpdateRequestRequisitionLineErrorInterface & UpdateResponseRequisitionLineErrorInterface & {
  __typename: 'ForeignKeyError';
  description: Scalars['String'];
  key: ForeignKey;
};

export type FormSchemaNode = {
  __typename: 'FormSchemaNode';
  id: Scalars['String'];
  jsonSchema: Scalars['JSON'];
  type: Scalars['String'];
  uiSchema: Scalars['JSON'];
};

export type FullSyncStatusNode = {
  __typename: 'FullSyncStatusNode';
  error?: Maybe<SyncErrorNode>;
  integration?: Maybe<SyncStatusNode>;
  isSyncing: Scalars['Boolean'];
  prepareInitial?: Maybe<SyncStatusNode>;
  pullCentral?: Maybe<SyncStatusWithProgressNode>;
  pullRemote?: Maybe<SyncStatusWithProgressNode>;
  push?: Maybe<SyncStatusWithProgressNode>;
  summary: SyncStatusNode;
};

export enum GenderInput {
  Female = 'FEMALE',
  Male = 'MALE',
  NonBinary = 'NON_BINARY',
  TransgenderFemale = 'TRANSGENDER_FEMALE',
  TransgenderFemaleHormone = 'TRANSGENDER_FEMALE_HORMONE',
  TransgenderFemaleSurgical = 'TRANSGENDER_FEMALE_SURGICAL',
  TransgenderMale = 'TRANSGENDER_MALE',
  TransgenderMaleHormone = 'TRANSGENDER_MALE_HORMONE',
  TransgenderMaleSurgical = 'TRANSGENDER_MALE_SURGICAL',
  Unknown = 'UNKNOWN'
}

export enum GenderType {
  Female = 'FEMALE',
  Male = 'MALE',
  NonBinary = 'NON_BINARY',
  Transgender = 'TRANSGENDER',
  TransgenderFemale = 'TRANSGENDER_FEMALE',
  TransgenderFemaleHormone = 'TRANSGENDER_FEMALE_HORMONE',
  TransgenderFemaleSurgical = 'TRANSGENDER_FEMALE_SURGICAL',
  TransgenderMale = 'TRANSGENDER_MALE',
  TransgenderMaleHormone = 'TRANSGENDER_MALE_HORMONE',
  TransgenderMaleSurgical = 'TRANSGENDER_MALE_SURGICAL',
  Unknown = 'UNKNOWN'
}

export type InboundInvoiceCounts = {
  __typename: 'InboundInvoiceCounts';
  created: InvoiceCountsSummary;
};

export type InitialisationStatusNode = {
  __typename: 'InitialisationStatusNode';
  siteName?: Maybe<Scalars['String']>;
  status: InitialisationStatusType;
};

export enum InitialisationStatusType {
  Initialised = 'INITIALISED',
  Initialising = 'INITIALISING',
  PreInitialisation = 'PRE_INITIALISATION'
}

export type InitialiseSiteResponse = SyncErrorNode | SyncSettingsNode;

export type InsertDocumentRegistryInput = {
  context: DocumentRegistryNodeContext;
  documentType: Scalars['String'];
  formSchemaId: Scalars['String'];
  id: Scalars['String'];
  name?: InputMaybe<Scalars['String']>;
  parentId?: InputMaybe<Scalars['String']>;
};

export type InsertDocumentResponse = DocumentRegistryNode;

export type InsertEncounterInput = {
  /** Encounter document data */
  data: Scalars['JSON'];
  patientId: Scalars['String'];
  /** The program type */
  programType: Scalars['String'];
  /** The schema id used for the encounter data */
  schemaId: Scalars['String'];
  /** The encounter type */
  type: Scalars['String'];
};

export type InsertEncounterResponse = EncounterNode;

export type InsertErrorInterface = {
  description: Scalars['String'];
};

export type InsertFormSchemaInput = {
  id: Scalars['String'];
  jsonSchema: Scalars['JSON'];
  type: Scalars['String'];
  uiSchema: Scalars['JSON'];
};

export type InsertFormSchemaResponse = FormSchemaNode;

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
  numberOfPacks: Scalars['Float'];
  packSize: Scalars['Int'];
  sellPricePerPack: Scalars['Float'];
  tax?: InputMaybe<Scalars['Float']>;
  totalBeforeTax?: InputMaybe<Scalars['Float']>;
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
  tax?: InputMaybe<Scalars['Float']>;
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
  numberOfPacks: Scalars['Float'];
  stockLineId: Scalars['String'];
  tax?: InputMaybe<Scalars['Float']>;
  totalBeforeTax?: InputMaybe<Scalars['Float']>;
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
  tax?: InputMaybe<Scalars['Float']>;
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

export type InsertPatientInput = {
  /** Patient document data */
  data: Scalars['JSON'];
  /** The schema id used for the patient data */
  schemaId: Scalars['String'];
};

export type InsertPatientResponse = PatientNode;

export type InsertProgramEnrolmentInput = {
  /** Program document data */
  data: Scalars['JSON'];
  patientId: Scalars['String'];
  /** The schema id used for the program data */
  schemaId: Scalars['String'];
  /** The program type */
  type: Scalars['String'];
};

export type InsertProgramEnrolmentResponse = ProgramEnrolmentNode;

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
  /** Defaults to 2 weeks from now */
  expectedDeliveryDate?: InputMaybe<Scalars['NaiveDate']>;
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
  countedNumberOfPacks?: InputMaybe<Scalars['Float']>;
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

export type InternalError = InsertLocationErrorInterface & RefreshTokenErrorInterface & UpdateLocationErrorInterface & {
  __typename: 'InternalError';
  description: Scalars['String'];
  fullError: Scalars['String'];
};

export type InvalidCredentials = AuthTokenErrorInterface & {
  __typename: 'InvalidCredentials';
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
  colour?: InputMaybe<EqualFilterStringInput>;
  comment?: InputMaybe<SimpleStringFilterInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  deliveredDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  invoiceNumber?: InputMaybe<EqualFilterBigNumberInput>;
  linkedInvoiceId?: InputMaybe<EqualFilterStringInput>;
  nameId?: InputMaybe<EqualFilterStringInput>;
  onHold?: InputMaybe<Scalars['Boolean']>;
  otherPartyId?: InputMaybe<EqualFilterStringInput>;
  otherPartyName?: InputMaybe<SimpleStringFilterInput>;
  pickedDatetime?: InputMaybe<DatetimeFilterInput>;
  requisitionId?: InputMaybe<EqualFilterStringInput>;
  shippedDatetime?: InputMaybe<DatetimeFilterInput>;
  status?: InputMaybe<EqualFilterInvoiceStatusInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
  theirReference?: InputMaybe<EqualFilterStringInput>;
  transportReference?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterInvoiceTypeInput>;
  userId?: InputMaybe<EqualFilterStringInput>;
  verifiedDatetime?: InputMaybe<DatetimeFilterInput>;
};

export type InvoiceIsNotEditable = UpdateErrorInterface & UpdateNameErrorInterface & {
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
  numberOfPacks: Scalars['Float'];
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
  taxPercentage?: Maybe<Scalars['Float']>;
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
  Allocated = 'ALLOCATED',
  Delivered = 'DELIVERED',
  New = 'NEW',
  Picked = 'PICKED',
  Shipped = 'SHIPPED',
  Verified = 'VERIFIED'
}

export enum InvoiceNodeType {
  InboundShipment = 'INBOUND_SHIPMENT',
  InventoryAddition = 'INVENTORY_ADDITION',
  InventoryReduction = 'INVENTORY_REDUCTION',
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
  TheirReference = 'theirReference',
  TransportReference = 'transportReference',
  Type = 'type',
  VerifiedDatetime = 'verifiedDatetime'
}

export type InvoiceSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: InvoiceSortFieldInput;
};

export type InvoicesResponse = InvoiceConnector;

export type ItemChartNode = {
  __typename: 'ItemChartNode';
  calculationDate?: Maybe<Scalars['NaiveDate']>;
  consumptionHistory?: Maybe<ConsumptionHistoryConnector>;
  stockEvolution?: Maybe<StockEvolutionConnector>;
  suggestedQuantityCalculation: SuggestedQuantityCalculationNode;
};

export type ItemConnector = {
  __typename: 'ItemConnector';
  nodes: Array<ItemNode>;
  totalCount: Scalars['Int'];
};

export type ItemFilterInput = {
  code?: InputMaybe<SimpleStringFilterInput>;
  codeOrName?: InputMaybe<SimpleStringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  isVisible?: InputMaybe<Scalars['Boolean']>;
  name?: InputMaybe<SimpleStringFilterInput>;
  type?: InputMaybe<EqualFilterItemTypeInput>;
};

export type ItemNode = {
  __typename: 'ItemNode';
  atcCategory: Scalars['String'];
  availableBatches: StockLineConnector;
  code: Scalars['String'];
  ddd: Scalars['String'];
  defaultPackSize: Scalars['Int'];
  doses: Scalars['Int'];
  id: Scalars['String'];
  isVaccine: Scalars['Boolean'];
  isVisible: Scalars['Boolean'];
  margin: Scalars['Float'];
  msupplyUniversalCode: Scalars['String'];
  msupplyUniversalName: Scalars['String'];
  name: Scalars['String'];
  outerPackSize: Scalars['Int'];
  stats: ItemStatsNode;
  strength: Scalars['String'];
  type: ItemNodeType;
  unitName?: Maybe<Scalars['String']>;
  volumePerOuterPack: Scalars['Float'];
  volumePerPack: Scalars['Float'];
  weight: Scalars['Float'];
};


export type ItemNodeAvailableBatchesArgs = {
  storeId: Scalars['String'];
};


export type ItemNodeStatsArgs = {
  amcLookbackMonths?: InputMaybe<Scalars['Int']>;
  storeId: Scalars['String'];
};

export enum ItemNodeType {
  NonStock = 'NON_STOCK',
  Service = 'SERVICE',
  Stock = 'STOCK'
}

export enum ItemSortFieldInput {
  Code = 'code',
  Name = 'name',
  Type = 'type'
}

export type ItemSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: ItemSortFieldInput;
};

export type ItemStatsNode = {
  __typename: 'ItemStatsNode';
  availableMonthsOfStockOnHand?: Maybe<Scalars['Float']>;
  availableStockOnHand: Scalars['Int'];
  averageMonthlyConsumption: Scalars['Float'];
};

export type ItemsResponse = ItemConnector;

export type JsonschemaNode = {
  __typename: 'JsonschemaNode';
  id: Scalars['String'];
  jsonSchema: Scalars['JSON'];
};

export enum LanguageType {
  English = 'ENGLISH',
  French = 'FRENCH',
  Khmer = 'KHMER',
  Laos = 'LAOS',
  Portuguese = 'PORTUGUESE',
  Russian = 'RUSSIAN',
  Spanish = 'SPANISH'
}

export type LocationConnector = {
  __typename: 'LocationConnector';
  nodes: Array<LocationNode>;
  totalCount: Scalars['Int'];
};

export type LocationFilterInput = {
  code?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<EqualFilterStringInput>;
  onHold?: InputMaybe<Scalars['Boolean']>;
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
   * 	Sort query result is sorted descending or ascending (if not provided the default is
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

export type LogoutResponse = Logout;

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

export type MasterListNotFoundForThisName = AddToOutboundShipmentFromMasterListErrorInterface & {
  __typename: 'MasterListNotFoundForThisName';
  description: Scalars['String'];
};

export type MasterListNotFoundForThisStore = AddFromMasterListErrorInterface & AddToInboundShipmentFromMasterListErrorInterface & {
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
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: MasterListSortFieldInput;
};

export type MasterListsResponse = MasterListConnector;

export type MergeRequiredError = UpdateDocumentErrorInterface & {
  __typename: 'MergeRequiredError';
  autoMerge?: Maybe<RawDocumentNode>;
  description: Scalars['String'];
};

export type Mutations = {
  __typename: 'Mutations';
  /** Add requisition lines from master item master list */
  addFromMasterList: AddFromMasterListResponse;
  addToInboundShipmentFromMasterList: AddToInboundShipmentFromMasterListResponse;
  /** Add invoice lines from master item master list */
  addToOutboundShipmentFromMasterList: AddToOutboundShipmentFromMasterListResponse;
  allocateOutboundShipmentUnallocatedLine: AllocateOutboundShipmentUnallocatedLineResponse;
  allocateProgramNumber: AllocateProgramNumberResponse;
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
  deleteDocument: DeleteDocumentResponse;
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
  initialiseSite: InitialiseSiteResponse;
  insertDocumentRegistry: InsertDocumentResponse;
  insertEncounter: InsertEncounterResponse;
  insertFormSchema: InsertFormSchemaResponse;
  insertInboundShipment: InsertInboundShipmentResponse;
  insertInboundShipmentLine: InsertInboundShipmentLineResponse;
  insertInboundShipmentServiceLine: InsertInboundShipmentServiceLineResponse;
  insertLocation: InsertLocationResponse;
  insertOutboundShipment: InsertOutboundShipmentResponse;
  insertOutboundShipmentLine: InsertOutboundShipmentLineResponse;
  insertOutboundShipmentServiceLine: InsertOutboundShipmentServiceLineResponse;
  insertOutboundShipmentUnallocatedLine: InsertOutboundShipmentUnallocatedLineResponse;
  insertPatient: InsertPatientResponse;
  /**
   * Enrols a patient into a program by adding a program document to the patient's documents.
   * Every patient can only have one program document of each program type.
   */
  insertProgramEnrolment: InsertProgramEnrolmentResponse;
  insertRequestRequisition: InsertRequestRequisitionResponse;
  insertRequestRequisitionLine: InsertRequestRequisitionLineResponse;
  insertStocktake: InsertStocktakeResponse;
  insertStocktakeLine: InsertStocktakeLineResponse;
  manualSync: Scalars['String'];
  /** Set supply quantity to requested quantity */
  supplyRequestedQuantity: SupplyRequestedQuantityResponse;
  undeleteDocument: UndeleteDocumentResponse;
  updateDisplaySettings: UpdateDisplaySettingsResponse;
  updateDocument: UpdateDocumentResponse;
  updateEncounter: UpdateEncounterResponse;
  updateInboundShipment: UpdateInboundShipmentResponse;
  updateInboundShipmentLine: UpdateInboundShipmentLineResponse;
  updateInboundShipmentServiceLine: UpdateInboundShipmentServiceLineResponse;
  updateLocation: UpdateLocationResponse;
  updateOutboundShipment: UpdateOutboundShipmentResponse;
  updateOutboundShipmentLine: UpdateOutboundShipmentLineResponse;
  updateOutboundShipmentName: UpdateOutboundShipmentNameResponse;
  updateOutboundShipmentServiceLine: UpdateOutboundShipmentServiceLineResponse;
  updateOutboundShipmentUnallocatedLine: UpdateOutboundShipmentUnallocatedLineResponse;
  updatePatient: UpdatePatientResponse;
  /** Updates an existing program document belonging to a patient. */
  updateProgramEnrolment: UpdateProgramEnrolmentResponse;
  updateRequestRequisition: UpdateRequestRequisitionResponse;
  updateRequestRequisitionLine: UpdateRequestRequisitionLineResponse;
  updateResponseRequisition: UpdateResponseRequisitionResponse;
  updateResponseRequisitionLine: UpdateResponseRequisitionLineResponse;
  updateStockLine: UpdateStockLineLineResponse;
  updateStocktake: UpdateStocktakeResponse;
  updateStocktakeLine: UpdateStocktakeLineResponse;
  updateSyncSettings: UpdateSyncSettingsResponse;
  /** Set requested for each line in request requisition to calculated */
  useSuggestedQuantity: UseSuggestedQuantityResponse;
};


export type MutationsAddFromMasterListArgs = {
  input: AddFromMasterListInput;
  storeId: Scalars['String'];
};


export type MutationsAddToInboundShipmentFromMasterListArgs = {
  input: AddToShipmentFromMasterListInput;
  storeId: Scalars['String'];
};


export type MutationsAddToOutboundShipmentFromMasterListArgs = {
  input: AddToShipmentFromMasterListInput;
  storeId: Scalars['String'];
};


export type MutationsAllocateOutboundShipmentUnallocatedLineArgs = {
  lineId: Scalars['String'];
  storeId: Scalars['String'];
};


export type MutationsAllocateProgramNumberArgs = {
  input: AllocateProgramNumberInput;
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


export type MutationsBatchRequestRequisitionArgs = {
  input: BatchRequestRequisitionInput;
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


export type MutationsDeleteDocumentArgs = {
  input: DeleteDocumentInput;
  storeId: Scalars['String'];
};


export type MutationsDeleteInboundShipmentArgs = {
  input: DeleteInboundShipmentInput;
  storeId: Scalars['String'];
};


export type MutationsDeleteInboundShipmentLineArgs = {
  input: DeleteInboundShipmentLineInput;
  storeId: Scalars['String'];
};


export type MutationsDeleteInboundShipmentServiceLineArgs = {
  input: DeleteInboundShipmentServiceLineInput;
  storeId: Scalars['String'];
};


export type MutationsDeleteLocationArgs = {
  input: DeleteLocationInput;
  storeId: Scalars['String'];
};


export type MutationsDeleteOutboundShipmentArgs = {
  id: Scalars['String'];
  storeId: Scalars['String'];
};


export type MutationsDeleteOutboundShipmentLineArgs = {
  input: DeleteOutboundShipmentLineInput;
  storeId: Scalars['String'];
};


export type MutationsDeleteOutboundShipmentServiceLineArgs = {
  input: DeleteOutboundShipmentServiceLineInput;
  storeId: Scalars['String'];
};


export type MutationsDeleteOutboundShipmentUnallocatedLineArgs = {
  input: DeleteOutboundShipmentUnallocatedLineInput;
  storeId: Scalars['String'];
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


export type MutationsInitialiseSiteArgs = {
  input: SyncSettingsInput;
};


export type MutationsInsertDocumentRegistryArgs = {
  input: InsertDocumentRegistryInput;
};


export type MutationsInsertEncounterArgs = {
  input: InsertEncounterInput;
  storeId: Scalars['String'];
};


export type MutationsInsertFormSchemaArgs = {
  input: InsertFormSchemaInput;
};


export type MutationsInsertInboundShipmentArgs = {
  input: InsertInboundShipmentInput;
  storeId: Scalars['String'];
};


export type MutationsInsertInboundShipmentLineArgs = {
  input: InsertInboundShipmentLineInput;
  storeId: Scalars['String'];
};


export type MutationsInsertInboundShipmentServiceLineArgs = {
  input: InsertInboundShipmentServiceLineInput;
  storeId: Scalars['String'];
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
  storeId: Scalars['String'];
};


export type MutationsInsertOutboundShipmentServiceLineArgs = {
  input: InsertOutboundShipmentServiceLineInput;
  storeId: Scalars['String'];
};


export type MutationsInsertOutboundShipmentUnallocatedLineArgs = {
  input: InsertOutboundShipmentUnallocatedLineInput;
  storeId: Scalars['String'];
};


export type MutationsInsertPatientArgs = {
  input: InsertPatientInput;
  storeId: Scalars['String'];
};


export type MutationsInsertProgramEnrolmentArgs = {
  input: InsertProgramEnrolmentInput;
  storeId: Scalars['String'];
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


export type MutationsSupplyRequestedQuantityArgs = {
  input: SupplyRequestedQuantityInput;
  storeId: Scalars['String'];
};


export type MutationsUndeleteDocumentArgs = {
  input: UndeleteDocumentInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateDisplaySettingsArgs = {
  input: DisplaySettingsInput;
};


export type MutationsUpdateDocumentArgs = {
  input: UpdateDocumentInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateEncounterArgs = {
  input: UpdateEncounterInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateInboundShipmentArgs = {
  input: UpdateInboundShipmentInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateInboundShipmentLineArgs = {
  input: UpdateInboundShipmentLineInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateInboundShipmentServiceLineArgs = {
  input: UpdateInboundShipmentServiceLineInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateLocationArgs = {
  input: UpdateLocationInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateOutboundShipmentArgs = {
  input: UpdateOutboundShipmentInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateOutboundShipmentLineArgs = {
  input: UpdateOutboundShipmentLineInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateOutboundShipmentNameArgs = {
  input: UpdateOutboundShipmentNameInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateOutboundShipmentServiceLineArgs = {
  input: UpdateOutboundShipmentServiceLineInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateOutboundShipmentUnallocatedLineArgs = {
  input: UpdateOutboundShipmentUnallocatedLineInput;
  storeId: Scalars['String'];
};


export type MutationsUpdatePatientArgs = {
  input: UpdatePatientInput;
  storeId: Scalars['String'];
};


export type MutationsUpdateProgramEnrolmentArgs = {
  input: UpdateProgramEnrolmentInput;
  storeId: Scalars['String'];
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


export type MutationsUpdateStockLineArgs = {
  input: UpdateStockLineInput;
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


export type MutationsUpdateSyncSettingsArgs = {
  input: SyncSettingsInput;
};


export type MutationsUseSuggestedQuantityArgs = {
  input: UseSuggestedQuantityInput;
  storeId: Scalars['String'];
};

export type NameConnector = {
  __typename: 'NameConnector';
  nodes: Array<NameNode>;
  totalCount: Scalars['Int'];
};

export type NameFilterInput = {
  address1?: InputMaybe<SimpleStringFilterInput>;
  address2?: InputMaybe<SimpleStringFilterInput>;
  /** Filter by code */
  code?: InputMaybe<SimpleStringFilterInput>;
  country?: InputMaybe<SimpleStringFilterInput>;
  dateOfBirth?: InputMaybe<DateFilterInput>;
  email?: InputMaybe<SimpleStringFilterInput>;
  firstName?: InputMaybe<SimpleStringFilterInput>;
  gender?: InputMaybe<EqualFilterGenderInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  identifier?: InputMaybe<SimpleStringFilterInput>;
  /** Filter by customer property */
  isCustomer?: InputMaybe<Scalars['Boolean']>;
  /** Is this name a store */
  isStore?: InputMaybe<Scalars['Boolean']>;
  /** Filter by supplier property */
  isSupplier?: InputMaybe<Scalars['Boolean']>;
  /**
   * 	Show system names (defaults to false)
   * System names don't have name_store_join thus if queried with true filter, is_visible filter should also be true or null
   * if is_visible is set to true and is_system_name is also true no system names will be returned
   */
  isSystemName?: InputMaybe<Scalars['Boolean']>;
  /** Visibility in current store (based on store_id parameter and existence of name_store_join record) */
  isVisible?: InputMaybe<Scalars['Boolean']>;
  lastName?: InputMaybe<SimpleStringFilterInput>;
  /** Filter by name */
  name?: InputMaybe<SimpleStringFilterInput>;
  /** Filter by national health number */
  nationalHealthNumber?: InputMaybe<SimpleStringFilterInput>;
  phone?: InputMaybe<SimpleStringFilterInput>;
  /** Code of the store if store is linked to name */
  storeCode?: InputMaybe<SimpleStringFilterInput>;
  /** Filter by the name type */
  type?: InputMaybe<EqualFilterTypeInput>;
};

export type NameNode = {
  __typename: 'NameNode';
  address1?: Maybe<Scalars['String']>;
  address2?: Maybe<Scalars['String']>;
  chargeCode?: Maybe<Scalars['String']>;
  code: Scalars['String'];
  comment?: Maybe<Scalars['String']>;
  country?: Maybe<Scalars['String']>;
  createdDatetime?: Maybe<Scalars['DateTime']>;
  dateOfBirth?: Maybe<Scalars['NaiveDate']>;
  email?: Maybe<Scalars['String']>;
  firstName?: Maybe<Scalars['String']>;
  gender?: Maybe<GenderType>;
  id: Scalars['String'];
  isCustomer: Scalars['Boolean'];
  isDonor: Scalars['Boolean'];
  isManufacturer: Scalars['Boolean'];
  isOnHold: Scalars['Boolean'];
  isSupplier: Scalars['Boolean'];
  isSystemName: Scalars['Boolean'];
  isVisible: Scalars['Boolean'];
  lastName?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  phone?: Maybe<Scalars['String']>;
  store?: Maybe<StoreNode>;
  type: NameNodeType;
  website?: Maybe<Scalars['String']>;
};

export enum NameNodeType {
  Build = 'BUILD',
  Facility = 'FACILITY',
  Invad = 'INVAD',
  Others = 'OTHERS',
  Patient = 'PATIENT',
  Repack = 'REPACK',
  Store = 'STORE'
}

export enum NameSortFieldInput {
  Code = 'code',
  Name = 'name'
}

export type NameSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
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

export type NotAnOutboundShipmentError = UpdateErrorInterface & UpdateNameErrorInterface & {
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

export type NumberNode = {
  __typename: 'NumberNode';
  number: Scalars['Int'];
};

export type OtherPartyNotACustomer = InsertErrorInterface & UpdateNameErrorInterface & {
  __typename: 'OtherPartyNotACustomer';
  description: Scalars['String'];
};

export type OtherPartyNotASupplier = InsertInboundShipmentErrorInterface & InsertRequestRequisitionErrorInterface & UpdateInboundShipmentErrorInterface & UpdateRequestRequisitionErrorInterface & {
  __typename: 'OtherPartyNotASupplier';
  description: Scalars['String'];
};

export type OtherPartyNotVisible = InsertErrorInterface & InsertInboundShipmentErrorInterface & InsertRequestRequisitionErrorInterface & UpdateInboundShipmentErrorInterface & UpdateNameErrorInterface & UpdateRequestRequisitionErrorInterface & {
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

export type PatientConnector = {
  __typename: 'PatientConnector';
  nodes: Array<PatientNode>;
  totalCount: Scalars['Int'];
};

export type PatientFilterInput = {
  address1?: InputMaybe<SimpleStringFilterInput>;
  address2?: InputMaybe<SimpleStringFilterInput>;
  code?: InputMaybe<SimpleStringFilterInput>;
  code2?: InputMaybe<SimpleStringFilterInput>;
  country?: InputMaybe<SimpleStringFilterInput>;
  dateOfBirth?: InputMaybe<DateFilterInput>;
  email?: InputMaybe<SimpleStringFilterInput>;
  firstName?: InputMaybe<SimpleStringFilterInput>;
  gender?: InputMaybe<EqualFilterGenderInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  identifier?: InputMaybe<SimpleStringFilterInput>;
  isVisible?: InputMaybe<Scalars['Boolean']>;
  lastName?: InputMaybe<SimpleStringFilterInput>;
  phone?: InputMaybe<SimpleStringFilterInput>;
};

export type PatientNode = {
  __typename: 'PatientNode';
  address1?: Maybe<Scalars['String']>;
  address2?: Maybe<Scalars['String']>;
  age?: Maybe<Scalars['Int']>;
  code: Scalars['String'];
  code2?: Maybe<Scalars['String']>;
  country?: Maybe<Scalars['String']>;
  dateOfBirth?: Maybe<Scalars['NaiveDate']>;
  document?: Maybe<DocumentNode>;
  email?: Maybe<Scalars['String']>;
  firstName?: Maybe<Scalars['String']>;
  gender?: Maybe<GenderType>;
  id: Scalars['String'];
  isDeceased: Scalars['Boolean'];
  lastName?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  phone?: Maybe<Scalars['String']>;
  programEnrolments: Array<ProgramEnrolmentNode>;
  website?: Maybe<Scalars['String']>;
};

export type PatientResponse = PatientConnector;

export type PatientSearchConnector = {
  __typename: 'PatientSearchConnector';
  nodes: Array<PatientSearchNode>;
  totalCount: Scalars['Int'];
};

export type PatientSearchInput = {
  /** Patient code */
  code?: InputMaybe<Scalars['String']>;
  /** Secondary patient code */
  code2?: InputMaybe<Scalars['String']>;
  dateOfBirth?: InputMaybe<Scalars['NaiveDate']>;
  firstName?: InputMaybe<Scalars['String']>;
  gender?: InputMaybe<GenderInput>;
  lastName?: InputMaybe<Scalars['String']>;
};

export type PatientSearchNode = {
  __typename: 'PatientSearchNode';
  patient: PatientNode;
  score: Scalars['Float'];
};

export type PatientSearchResponse = PatientSearchConnector;

export enum PatientSortFieldInput {
  Address1 = 'address1',
  Address2 = 'address2',
  Code = 'code',
  Code2 = 'code2',
  Country = 'country',
  DateOfBirth = 'dateOfBirth',
  Email = 'email',
  FirstName = 'firstName',
  Gender = 'gender',
  LastName = 'lastName',
  Name = 'name',
  Phone = 'phone'
}

export type PatientSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: PatientSortFieldInput;
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

export enum PrintFormat {
  Html = 'HTML',
  Pdf = 'PDF'
}

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

export type ProgramEnrolmentConnector = {
  __typename: 'ProgramEnrolmentConnector';
  nodes: Array<ProgramEnrolmentNode>;
  totalCount: Scalars['Int'];
};

export type ProgramEnrolmentFilterInput = {
  enrolmentDatetime?: InputMaybe<DatetimeFilterInput>;
  patientId?: InputMaybe<EqualFilterStringInput>;
  programPatientId?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export type ProgramEnrolmentNode = {
  __typename: 'ProgramEnrolmentNode';
  /** The encounter document */
  document: DocumentNode;
  /** The program document */
  encounters: Array<EncounterNode>;
  enrolmentDatetime: Scalars['DateTime'];
  events: Array<ProgramEventNode>;
  /** The program document name */
  name: Scalars['String'];
  patientId: Scalars['String'];
  programPatientId?: Maybe<Scalars['String']>;
  /** The program type */
  type: Scalars['String'];
};


export type ProgramEnrolmentNodeEventsArgs = {
  at?: InputMaybe<Scalars['DateTime']>;
  filter?: InputMaybe<ProgramEventFilterInput>;
};

export type ProgramEnrolmentResponse = ProgramEnrolmentConnector;

export enum ProgramEnrolmentSortFieldInput {
  EnrolmentDatetime = 'enrolmentDatetime',
  PatientId = 'patientId',
  ProgramPatientId = 'programPatientId',
  Type = 'type'
}

export type ProgramEnrolmentSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: ProgramEnrolmentSortFieldInput;
};

export type ProgramEventConnector = {
  __typename: 'ProgramEventConnector';
  nodes: Array<ProgramEventNode>;
  totalCount: Scalars['Int'];
};

export type ProgramEventFilterInput = {
  documentName?: InputMaybe<EqualFilterStringInput>;
  documentType?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export type ProgramEventNode = {
  __typename: 'ProgramEventNode';
  activeDatetime: Scalars['DateTime'];
  data?: Maybe<Scalars['String']>;
  datetime: Scalars['DateTime'];
  documentName?: Maybe<Scalars['String']>;
  documentType: Scalars['String'];
  patientId?: Maybe<Scalars['String']>;
  type: Scalars['String'];
};

export type ProgramEventResponse = ProgramEventConnector;

export enum ProgramEventSortFieldInput {
  Datetime = 'datetime',
  DocumentName = 'documentName',
  DocumentType = 'documentType',
  Type = 'type'
}

export type ProgramEventSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: ProgramEventSortFieldInput;
};

export type Queries = {
  __typename: 'Queries';
  activityLogs: ActivityLogResponse;
  apiVersion: Scalars['String'];
  /**
   * Retrieves a new auth bearer and refresh token
   * The refresh token is returned as a cookie
   */
  authToken: AuthTokenResponse;
  displaySettings: DisplaySettingsNode;
  document?: Maybe<DocumentNode>;
  documentHistory: DocumentHistoryResponse;
  documentRegistries: DocumentRegistryResponse;
  documents: DocumentResponse;
  encounterFields: EncounterFieldsResponse;
  encounters: EncounterResponse;
  formSchema?: Maybe<FormSchemaNode>;
  /** Available without authorisation in operational and initialisation states */
  initialisationStatus: InitialisationStatusNode;
  invoice: InvoiceResponse;
  invoiceByNumber: InvoiceResponse;
  invoiceCounts: InvoiceCounts;
  invoices: InvoicesResponse;
  /** Query omSupply "item" entries */
  items: ItemsResponse;
  latestSyncStatus?: Maybe<FullSyncStatusNode>;
  /** Query omSupply "locations" entries */
  locations: LocationsResponse;
  logout: LogoutResponse;
  /** Query omSupply "master_lists" entries */
  masterLists: MasterListsResponse;
  me: UserResponse;
  /** Query omSupply "name" entries */
  names: NamesResponse;
  numberOfRecordsInPushQueue: Scalars['Int'];
  patient?: Maybe<PatientNode>;
  patientSearch: PatientSearchResponse;
  patients: PatientResponse;
  /**
   * Creates a printed report.
   *
   * All details about the report, e.g. the output format, are specified in the report definition
   * which is referred to by the report_id.
   * The printed report can be retrieved from the `/files` endpoint using the returned file id.
   */
  printReport: PrintReportResponse;
  printReportDefinition: PrintReportResponse;
  programEnrolments: ProgramEnrolmentResponse;
  programEvents: ProgramEventResponse;
  /**
   * Retrieves a new auth bearer and refresh token
   * The refresh token is returned as a cookie
   */
  refreshToken: RefreshTokenResponse;
  /** Queries a list of available reports */
  reports: ReportsResponse;
  requisition: RequisitionResponse;
  requisitionByNumber: RequisitionResponse;
  requisitionLineChart: RequisitionLineChartResponse;
  requisitions: RequisitionsResponse;
  responseRequisitionStats: RequisitionLineStatsResponse;
  stockCounts: StockCounts;
  /** Query for "stock_line" entries */
  stockLines: StockLinesResponse;
  stocktake: StocktakeResponse;
  stocktakeByNumber: StocktakeResponse;
  stocktakes: StocktakesResponse;
  store: StoreResponse;
  stores: StoresResponse;
  syncSettings?: Maybe<SyncSettingsNode>;
};


export type QueriesActivityLogsArgs = {
  filter?: InputMaybe<ActivityLogFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<ActivityLogSortInput>>;
};


export type QueriesAuthTokenArgs = {
  password: Scalars['String'];
  username: Scalars['String'];
};


export type QueriesDisplaySettingsArgs = {
  input: DisplaySettingsHash;
};


export type QueriesDocumentArgs = {
  name: Scalars['String'];
  storeId: Scalars['String'];
};


export type QueriesDocumentHistoryArgs = {
  name: Scalars['String'];
  storeId: Scalars['String'];
};


export type QueriesDocumentRegistriesArgs = {
  filter?: InputMaybe<DocumentRegistryFilterInput>;
  sort?: InputMaybe<Array<DocumentRegistrySortInput>>;
};


export type QueriesDocumentsArgs = {
  filter?: InputMaybe<DocumentFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<DocumentSortInput>;
  storeId: Scalars['String'];
};


export type QueriesEncounterFieldsArgs = {
  filter?: InputMaybe<EncounterFilterInput>;
  input: EncounterFieldsInput;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<EncounterSortInput>;
  storeId: Scalars['String'];
};


export type QueriesEncountersArgs = {
  filter?: InputMaybe<EncounterFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<EncounterSortInput>;
  storeId: Scalars['String'];
};


export type QueriesFormSchemaArgs = {
  id: Scalars['String'];
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
  storeId: Scalars['String'];
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
  storeId: Scalars['String'];
};


export type QueriesLocationsArgs = {
  filter?: InputMaybe<LocationFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<LocationSortInput>>;
  storeId: Scalars['String'];
};


export type QueriesMasterListsArgs = {
  filter?: InputMaybe<MasterListFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<MasterListSortInput>>;
  storeId: Scalars['String'];
};


export type QueriesNamesArgs = {
  filter?: InputMaybe<NameFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<NameSortInput>>;
  storeId: Scalars['String'];
};


export type QueriesPatientArgs = {
  patientId: Scalars['String'];
  storeId: Scalars['String'];
};


export type QueriesPatientSearchArgs = {
  input: PatientSearchInput;
  storeId: Scalars['String'];
};


export type QueriesPatientsArgs = {
  filter?: InputMaybe<PatientFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<PatientSortInput>>;
  storeId: Scalars['String'];
};


export type QueriesPrintReportArgs = {
  arguments?: InputMaybe<Scalars['JSON']>;
  dataId?: InputMaybe<Scalars['String']>;
  format?: InputMaybe<PrintFormat>;
  reportId: Scalars['String'];
  storeId: Scalars['String'];
};


export type QueriesPrintReportDefinitionArgs = {
  arguments?: InputMaybe<Scalars['JSON']>;
  dataId?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  report: Scalars['JSON'];
  storeId: Scalars['String'];
};


export type QueriesProgramEnrolmentsArgs = {
  filter?: InputMaybe<ProgramEnrolmentFilterInput>;
  sort?: InputMaybe<ProgramEnrolmentSortInput>;
  storeId: Scalars['String'];
};


export type QueriesProgramEventsArgs = {
  at?: InputMaybe<Scalars['DateTime']>;
  filter?: InputMaybe<ProgramEventFilterInput>;
  page?: InputMaybe<PaginationInput>;
  patientId: Scalars['String'];
  sort?: InputMaybe<ProgramEventSortInput>;
  storeId: Scalars['String'];
};


export type QueriesReportsArgs = {
  filter?: InputMaybe<ReportFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<ReportSortInput>>;
  storeId: Scalars['String'];
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


export type QueriesRequisitionLineChartArgs = {
  consumptionOptionsInput?: InputMaybe<ConsumptionOptionsInput>;
  requestRequisitionLineId: Scalars['String'];
  stockEvolutionOptionsInput?: InputMaybe<StockEvolutionOptionsInput>;
  storeId: Scalars['String'];
};


export type QueriesRequisitionsArgs = {
  filter?: InputMaybe<RequisitionFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<RequisitionSortInput>>;
  storeId: Scalars['String'];
};


export type QueriesResponseRequisitionStatsArgs = {
  requisitionLineId: Scalars['String'];
  storeId: Scalars['String'];
};


export type QueriesStockCountsArgs = {
  daysTillExpired?: InputMaybe<Scalars['Int']>;
  storeId: Scalars['String'];
  timezoneOffset?: InputMaybe<Scalars['Int']>;
};


export type QueriesStockLinesArgs = {
  filter?: InputMaybe<StockLineFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<StockLineSortInput>>;
  storeId: Scalars['String'];
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


export type QueriesStoreArgs = {
  id: Scalars['String'];
};


export type QueriesStoresArgs = {
  filter?: InputMaybe<StoreFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<StoreSortInput>>;
};

export type RawDocumentNode = {
  __typename: 'RawDocumentNode';
  author: Scalars['String'];
  data: Scalars['String'];
  name: Scalars['String'];
  parents: Array<Scalars['String']>;
  schemaId?: Maybe<Scalars['String']>;
  timestamp: Scalars['DateTime'];
  type: Scalars['String'];
};

export type RecordAlreadyExist = InsertLocationErrorInterface & {
  __typename: 'RecordAlreadyExist';
  description: Scalars['String'];
};

export type RecordBelongsToAnotherStore = DeleteLocationErrorInterface & UpdateLocationErrorInterface & {
  __typename: 'RecordBelongsToAnotherStore';
  description: Scalars['String'];
};

export type RecordNotFound = AddFromMasterListErrorInterface & AddToInboundShipmentFromMasterListErrorInterface & AddToOutboundShipmentFromMasterListErrorInterface & AllocateOutboundShipmentUnallocatedLineErrorInterface & CreateRequisitionShipmentErrorInterface & DeleteErrorInterface & DeleteInboundShipmentErrorInterface & DeleteInboundShipmentLineErrorInterface & DeleteInboundShipmentServiceLineErrorInterface & DeleteLocationErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & DeleteOutboundShipmentUnallocatedLineErrorInterface & DeleteRequestRequisitionErrorInterface & DeleteRequestRequisitionLineErrorInterface & NodeErrorInterface & RequisitionLineChartErrorInterface & RequisitionLineStatsErrorInterface & SupplyRequestedQuantityErrorInterface & UpdateErrorInterface & UpdateInboundShipmentErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateInboundShipmentServiceLineErrorInterface & UpdateLocationErrorInterface & UpdateNameErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & UpdateOutboundShipmentUnallocatedLineErrorInterface & UpdateRequestRequisitionErrorInterface & UpdateRequestRequisitionLineErrorInterface & UpdateResponseRequisitionErrorInterface & UpdateResponseRequisitionLineErrorInterface & UpdateStockLineErrorInterface & UseSuggestedQuantityErrorInterface & {
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

export type ReportConnector = {
  __typename: 'ReportConnector';
  nodes: Array<ReportNode>;
  totalCount: Scalars['Int'];
};

export enum ReportContext {
  InboundShipment = 'INBOUND_SHIPMENT',
  OutboundShipment = 'OUTBOUND_SHIPMENT',
  Patient = 'PATIENT',
  Requisition = 'REQUISITION',
  Resource = 'RESOURCE',
  Stocktake = 'STOCKTAKE'
}

export type ReportFilterInput = {
  context?: InputMaybe<EqualFilterReportContextInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<SimpleStringFilterInput>;
  subContext?: InputMaybe<EqualFilterStringInput>;
};

export type ReportNode = {
  __typename: 'ReportNode';
  argumentSchema?: Maybe<FormSchemaNode>;
  context: ReportContext;
  id: Scalars['String'];
  /** Human readable name of the report */
  name: Scalars['String'];
  subContext?: Maybe<Scalars['String']>;
};

export enum ReportSortFieldInput {
  Id = 'id',
  Name = 'name'
}

export type ReportSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: ReportSortFieldInput;
};

export type ReportsResponse = ReportConnector;

export type RequestStoreStatsNode = {
  __typename: 'RequestStoreStatsNode';
  averageMonthlyConsumption: Scalars['Int'];
  maxMonthsOfStock: Scalars['Float'];
  stockOnHand: Scalars['Int'];
  suggestedQuantity: Scalars['Int'];
};

export type RequisitionConnector = {
  __typename: 'RequisitionConnector';
  nodes: Array<RequisitionNode>;
  totalCount: Scalars['Int'];
};

export type RequisitionFilterInput = {
  colour?: InputMaybe<EqualFilterStringInput>;
  comment?: InputMaybe<SimpleStringFilterInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  expectedDeliveryDate?: InputMaybe<DateFilterInput>;
  finalisedDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  otherPartyId?: InputMaybe<EqualFilterStringInput>;
  otherPartyName?: InputMaybe<SimpleStringFilterInput>;
  requisitionNumber?: InputMaybe<EqualFilterBigNumberInput>;
  sentDatetime?: InputMaybe<DatetimeFilterInput>;
  status?: InputMaybe<EqualFilterRequisitionStatusInput>;
  theirReference?: InputMaybe<SimpleStringFilterInput>;
  type?: InputMaybe<EqualFilterRequisitionTypeInput>;
  userId?: InputMaybe<EqualFilterStringInput>;
};

export type RequisitionLineChartError = {
  __typename: 'RequisitionLineChartError';
  error: RequisitionLineChartErrorInterface;
};

export type RequisitionLineChartErrorInterface = {
  description: Scalars['String'];
};

export type RequisitionLineChartResponse = ItemChartNode | RequisitionLineChartError;

export type RequisitionLineConnector = {
  __typename: 'RequisitionLineConnector';
  nodes: Array<RequisitionLineNode>;
  totalCount: Scalars['Int'];
};

export type RequisitionLineNode = {
  __typename: 'RequisitionLineNode';
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  /** InboundShipment lines linked to requisitions line */
  inboundShipmentLines: InvoiceLineConnector;
  item: ItemNode;
  itemId: Scalars['String'];
  /**
   * For request requisition: snapshot stats (when requisition was created)
   * For response requisition current item stats
   */
  itemStats: ItemStatsNode;
  linkedRequisitionLine?: Maybe<RequisitionLineNode>;
  /** OutboundShipment lines linked to requisitions line */
  outboundShipmentLines: InvoiceLineConnector;
  /**
   * Quantity remaining to supply
   * supplyQuantity minus all (including unallocated) linked invoice lines numberOfPacks * packSize
   * Only available in response requisition, request requisition returns 0
   */
  remainingQuantityToSupply: Scalars['Float'];
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


export type RequisitionLineNodeItemStatsArgs = {
  amcLookbackMonths?: InputMaybe<Scalars['Int']>;
};

export type RequisitionLineStatsError = {
  __typename: 'RequisitionLineStatsError';
  error: RequisitionLineStatsErrorInterface;
};

export type RequisitionLineStatsErrorInterface = {
  description: Scalars['String'];
};

export type RequisitionLineStatsResponse = RequisitionLineStatsError | ResponseRequisitionStatsNode;

export type RequisitionLineWithItemIdExists = InsertRequestRequisitionLineErrorInterface & {
  __typename: 'RequisitionLineWithItemIdExists';
  description: Scalars['String'];
};

export type RequisitionNode = {
  __typename: 'RequisitionNode';
  colour?: Maybe<Scalars['String']>;
  comment?: Maybe<Scalars['String']>;
  createdDatetime: Scalars['DateTime'];
  expectedDeliveryDate?: Maybe<Scalars['NaiveDate']>;
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
  Draft = 'DRAFT',
  Finalised = 'FINALISED',
  New = 'NEW',
  Sent = 'SENT'
}

export enum RequisitionNodeType {
  Request = 'REQUEST',
  Response = 'RESPONSE'
}

export type RequisitionResponse = RecordNotFound | RequisitionNode;

export enum RequisitionSortFieldInput {
  Comment = 'comment',
  CreatedDatetime = 'createdDatetime',
  ExpectedDeliveryDate = 'expectedDeliveryDate',
  FinalisedDatetime = 'finalisedDatetime',
  OtherPartyName = 'otherPartyName',
  RequisitionNumber = 'requisitionNumber',
  SentDatetime = 'sentDatetime',
  Status = 'status',
  TheirReference = 'theirReference',
  Type = 'type'
}

export type RequisitionSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: RequisitionSortFieldInput;
};

export type RequisitionsResponse = RequisitionConnector;

export type ResponseRequisitionStatsNode = {
  __typename: 'ResponseRequisitionStatsNode';
  requestStoreStats: RequestStoreStatsNode;
  responseStoreStats: ResponseStoreStatsNode;
};

export type ResponseStoreStatsNode = {
  __typename: 'ResponseStoreStatsNode';
  incomingStock: Scalars['Int'];
  otherRequestedQuantity: Scalars['Int'];
  requestedQuantity: Scalars['Int'];
  stockOnHand: Scalars['Float'];
  stockOnOrder: Scalars['Int'];
};

export type SimpleStringFilterInput = {
  /** Search term must be an exact match (case sensitive) */
  equalTo?: InputMaybe<Scalars['String']>;
  /** Search term must be an exact match, but case insensitive */
  insensitiveEqualTo?: InputMaybe<Scalars['String']>;
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
  isProjected: Scalars['Boolean'];
  maximumStockOnHand: Scalars['Int'];
  minimumStockOnHand: Scalars['Int'];
  stockOnHand: Scalars['Int'];
};

export type StockEvolutionOptionsInput = {
  /** Defaults to 30, number of data points for historic stock on hand in stock evolution chart */
  numberOfHistoricDataPoints?: InputMaybe<Scalars['Int']>;
  /** Defaults to 20, number of data points for projected stock on hand in stock evolution chart */
  numberOfProjectedDataPoints?: InputMaybe<Scalars['Int']>;
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

export type StockLineFilterInput = {
  expiryDate?: InputMaybe<DateFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  isAvailable?: InputMaybe<Scalars['Boolean']>;
  itemCodeOrName?: InputMaybe<SimpleStringFilterInput>;
  itemId?: InputMaybe<EqualFilterStringInput>;
  locationId?: InputMaybe<EqualFilterStringInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
};

export type StockLineIsOnHold = InsertOutboundShipmentLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & {
  __typename: 'StockLineIsOnHold';
  description: Scalars['String'];
};

export type StockLineNode = {
  __typename: 'StockLineNode';
  availableNumberOfPacks: Scalars['Float'];
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
  totalNumberOfPacks: Scalars['Float'];
};

export type StockLineResponse = NodeError | StockLineNode;

export enum StockLineSortFieldInput {
  ExpiryDate = 'expiryDate',
  NumberOfPacks = 'numberOfPacks'
}

export type StockLineSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: StockLineSortFieldInput;
};

export type StockLinesResponse = StockLineConnector;

export type StocktakeConnector = {
  __typename: 'StocktakeConnector';
  nodes: Array<StocktakeNode>;
  totalCount: Scalars['Int'];
};

export type StocktakeFilterInput = {
  comment?: InputMaybe<SimpleStringFilterInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  description?: InputMaybe<SimpleStringFilterInput>;
  finalisedDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  isLocked?: InputMaybe<Scalars['Boolean']>;
  status?: InputMaybe<EqualFilterStocktakeStatusInput>;
  stocktakeDate?: InputMaybe<DateFilterInput>;
  stocktakeNumber?: InputMaybe<EqualFilterBigNumberInput>;
  userId?: InputMaybe<EqualFilterStringInput>;
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
  countedNumberOfPacks?: Maybe<Scalars['Float']>;
  expiryDate?: Maybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  item: ItemNode;
  itemId: Scalars['String'];
  location?: Maybe<LocationNode>;
  note?: Maybe<Scalars['String']>;
  packSize?: Maybe<Scalars['Int']>;
  sellPricePerPack?: Maybe<Scalars['Float']>;
  snapshotNumberOfPacks: Scalars['Float'];
  stockLine?: Maybe<StockLineNode>;
  stocktakeId: Scalars['String'];
};

export type StocktakeNode = {
  __typename: 'StocktakeNode';
  comment?: Maybe<Scalars['String']>;
  createdDatetime: Scalars['DateTime'];
  description?: Maybe<Scalars['String']>;
  finalisedDatetime?: Maybe<Scalars['DateTime']>;
  id: Scalars['String'];
  inventoryAddition?: Maybe<InvoiceNode>;
  inventoryAdditionId?: Maybe<Scalars['String']>;
  inventoryReduction?: Maybe<InvoiceNode>;
  inventoryReductionId?: Maybe<Scalars['String']>;
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
  Comment = 'comment',
  CreatedDatetime = 'createdDatetime',
  Description = 'description',
  FinalisedDatetime = 'finalisedDatetime',
  Status = 'status',
  StocktakeDate = 'stocktakeDate',
  StocktakeNumber = 'stocktakeNumber'
}

export type StocktakeSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
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
  siteId?: InputMaybe<EqualFilterNumberInput>;
};

export type StoreNode = {
  __typename: 'StoreNode';
  code: Scalars['String'];
  id: Scalars['String'];
  name: NameNode;
  siteId: Scalars['Int'];
  storeName: Scalars['String'];
};


export type StoreNodeNameArgs = {
  storeId: Scalars['String'];
};

export type StoreResponse = NodeError | StoreNode;

export enum StoreSortFieldInput {
  Code = 'code',
  Name = 'name',
  NameCode = 'nameCode'
}

export type StoreSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']>;
  /** Sort query result by `key` */
  key: StoreSortFieldInput;
};

export type StoresResponse = StoreConnector;

export type SuggestedQuantityCalculationNode = {
  __typename: 'SuggestedQuantityCalculationNode';
  averageMonthlyConsumption: Scalars['Int'];
  maximumStockOnHand: Scalars['Int'];
  minimumStockOnHand: Scalars['Int'];
  stockOnHand: Scalars['Int'];
  suggestedQuantity: Scalars['Int'];
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

export type SyncErrorNode = {
  __typename: 'SyncErrorNode';
  fullError: Scalars['String'];
  variant: SyncErrorVariant;
};

export enum SyncErrorVariant {
  ConnectionError = 'CONNECTION_ERROR',
  HardwareIdMismatch = 'HARDWARE_ID_MISMATCH',
  IncorrectPassword = 'INCORRECT_PASSWORD',
  IntegrationTimeoutReached = 'INTEGRATION_TIMEOUT_REACHED',
  InvalidUrl = 'INVALID_URL',
  SiteAuthTimeout = 'SITE_AUTH_TIMEOUT',
  SiteHasNoStore = 'SITE_HAS_NO_STORE',
  SiteNameNotFound = 'SITE_NAME_NOT_FOUND',
  SiteUuidIsBeingChanged = 'SITE_UUID_IS_BEING_CHANGED',
  Unknown = 'UNKNOWN'
}

export type SyncSettingsInput = {
  /** Sync interval */
  intervalSeconds: Scalars['Int'];
  /** Plain text password */
  password: Scalars['String'];
  url: Scalars['String'];
  username: Scalars['String'];
};

export type SyncSettingsNode = {
  __typename: 'SyncSettingsNode';
  /** How frequently central data is synced */
  intervalSeconds: Scalars['Int'];
  /** Central server url */
  url: Scalars['String'];
  /** Central server username */
  username: Scalars['String'];
};

export type SyncStatusNode = {
  __typename: 'SyncStatusNode';
  finished?: Maybe<Scalars['DateTime']>;
  started: Scalars['DateTime'];
};

export type SyncStatusWithProgressNode = {
  __typename: 'SyncStatusWithProgressNode';
  done?: Maybe<Scalars['Int']>;
  finished?: Maybe<Scalars['DateTime']>;
  started: Scalars['DateTime'];
  total?: Maybe<Scalars['Int']>;
};

export type TaxInput = {
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

export type UndeleteDocumentInput = {
  id: Scalars['String'];
};

export type UndeleteDocumentResponse = DocumentNode;

export enum UniqueValueKey {
  Code = 'code'
}

export type UniqueValueViolation = InsertLocationErrorInterface & UpdateLocationErrorInterface & {
  __typename: 'UniqueValueViolation';
  description: Scalars['String'];
  field: UniqueValueKey;
};

export type UpdateDisplaySettingsError = {
  __typename: 'UpdateDisplaySettingsError';
  error: Scalars['String'];
};

export type UpdateDisplaySettingsResponse = UpdateDisplaySettingsError | UpdateResult;

export type UpdateDocumentError = {
  __typename: 'UpdateDocumentError';
  error: UpdateDocumentErrorInterface;
};

export type UpdateDocumentErrorInterface = {
  description: Scalars['String'];
};

export type UpdateDocumentInput = {
  author: Scalars['String'];
  data: Scalars['JSON'];
  name: Scalars['String'];
  parents: Array<Scalars['String']>;
  patientId?: InputMaybe<Scalars['String']>;
  schemaId?: InputMaybe<Scalars['String']>;
  timestamp: Scalars['DateTime'];
  type: Scalars['String'];
};

export type UpdateDocumentResponse = DocumentNode | UpdateDocumentError;

export type UpdateEncounterInput = {
  /** Encounter document data */
  data: Scalars['JSON'];
  /** The document id of the encounter document which should be updated */
  parent: Scalars['String'];
  /** The schema id used for the counter data */
  schemaId: Scalars['String'];
  /** The encounter type */
  type: Scalars['String'];
};

export type UpdateEncounterResponse = EncounterNode;

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
  tax?: InputMaybe<TaxInput>;
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
  itemId?: InputMaybe<Scalars['String']>;
  locationId?: InputMaybe<Scalars['String']>;
  numberOfPacks?: InputMaybe<Scalars['Float']>;
  packSize?: InputMaybe<Scalars['Int']>;
  sellPricePerPack?: InputMaybe<Scalars['Float']>;
  tax?: InputMaybe<TaxInput>;
  totalBeforeTax?: InputMaybe<Scalars['Float']>;
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
  itemId?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  note?: InputMaybe<Scalars['String']>;
  tax?: InputMaybe<TaxInput>;
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

export type UpdateNameErrorInterface = {
  description: Scalars['String'];
};

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
   * 	When changing the status from DRAFT to CONFIRMED or FINALISED the total_number_of_packs for
   * existing invoice items gets updated.
   */
  status?: InputMaybe<UpdateOutboundShipmentStatusInput>;
  tax?: InputMaybe<TaxInput>;
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
  itemId?: InputMaybe<Scalars['String']>;
  numberOfPacks?: InputMaybe<Scalars['Float']>;
  stockLineId?: InputMaybe<Scalars['String']>;
  tax?: InputMaybe<TaxInput>;
  totalBeforeTax?: InputMaybe<Scalars['Float']>;
};

export type UpdateOutboundShipmentLineResponse = InvoiceLineNode | UpdateOutboundShipmentLineError;

export type UpdateOutboundShipmentLineResponseWithId = {
  __typename: 'UpdateOutboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: UpdateOutboundShipmentLineResponse;
};

export type UpdateOutboundShipmentNameError = {
  __typename: 'UpdateOutboundShipmentNameError';
  error: UpdateNameErrorInterface;
};

export type UpdateOutboundShipmentNameInput = {
  id: Scalars['String'];
  otherPartyId?: InputMaybe<Scalars['String']>;
};

export type UpdateOutboundShipmentNameResponse = InvoiceNode | UpdateOutboundShipmentNameError;

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
  itemId?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  note?: InputMaybe<Scalars['String']>;
  tax?: InputMaybe<TaxInput>;
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

export type UpdatePatientInput = {
  /** Patient document data */
  data: Scalars['JSON'];
  parent: Scalars['String'];
  /** The schema id used for the patient data */
  schemaId: Scalars['String'];
};

export type UpdatePatientResponse = PatientNode;

export type UpdateProgramEnrolmentInput = {
  /** Program document data */
  data: Scalars['JSON'];
  parent: Scalars['String'];
  patientId: Scalars['String'];
  /** The schema id used for the program data */
  schemaId: Scalars['String'];
  /** The program type */
  type: Scalars['String'];
};

export type UpdateProgramEnrolmentResponse = ProgramEnrolmentNode;

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
  expectedDeliveryDate?: InputMaybe<Scalars['NaiveDate']>;
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

export type UpdateResult = {
  __typename: 'UpdateResult';
  logo?: Maybe<Scalars['String']>;
  theme?: Maybe<Scalars['String']>;
};

export type UpdateStockLineError = {
  __typename: 'UpdateStockLineError';
  error: UpdateStockLineErrorInterface;
};

export type UpdateStockLineErrorInterface = {
  description: Scalars['String'];
};

export type UpdateStockLineInput = {
  batch?: InputMaybe<Scalars['String']>;
  costPricePerPack?: InputMaybe<Scalars['Float']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  locationId?: InputMaybe<Scalars['String']>;
  onHold?: InputMaybe<Scalars['Boolean']>;
  sellPricePerPack?: InputMaybe<Scalars['Float']>;
};

export type UpdateStockLineLineResponse = StockLineNode | UpdateStockLineError;

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
  status?: InputMaybe<UpdateStocktakeStatusInput>;
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
  countedNumberOfPacks?: InputMaybe<Scalars['Float']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  locationId?: InputMaybe<Scalars['String']>;
  note?: InputMaybe<Scalars['String']>;
  packSize?: InputMaybe<Scalars['Int']>;
  sellPricePerPack?: InputMaybe<Scalars['Float']>;
  snapshotNumberOfPacks?: InputMaybe<Scalars['Float']>;
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

export enum UpdateStocktakeStatusInput {
  Finalised = 'FINALISED'
}

export type UpdateSyncSettingsResponse = SyncErrorNode | SyncSettingsNode;

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

export type UserNode = {
  __typename: 'UserNode';
  defaultStore?: Maybe<UserStoreNode>;
  /** The user's email address */
  email?: Maybe<Scalars['String']>;
  language: LanguageType;
  permissions: UserStorePermissionConnector;
  stores: UserStoreConnector;
  /** Internal user id */
  userId: Scalars['String'];
  username: Scalars['String'];
};


export type UserNodePermissionsArgs = {
  storeId?: InputMaybe<Scalars['String']>;
};

export enum UserPermission {
  DocumentMutate = 'DOCUMENT_MUTATE',
  DocumentQuery = 'DOCUMENT_QUERY',
  InboundShipmentMutate = 'INBOUND_SHIPMENT_MUTATE',
  InboundShipmentQuery = 'INBOUND_SHIPMENT_QUERY',
  LocationMutate = 'LOCATION_MUTATE',
  LogQuery = 'LOG_QUERY',
  OutboundShipmentMutate = 'OUTBOUND_SHIPMENT_MUTATE',
  OutboundShipmentQuery = 'OUTBOUND_SHIPMENT_QUERY',
  PatientMutate = 'PATIENT_MUTATE',
  PatientQuery = 'PATIENT_QUERY',
  Report = 'REPORT',
  RequisitionMutate = 'REQUISITION_MUTATE',
  RequisitionQuery = 'REQUISITION_QUERY',
  ServerAdmin = 'SERVER_ADMIN',
  StocktakeMutate = 'STOCKTAKE_MUTATE',
  StocktakeQuery = 'STOCKTAKE_QUERY',
  StockLineMutate = 'STOCK_LINE_MUTATE',
  StockLineQuery = 'STOCK_LINE_QUERY',
  StoreAccess = 'STORE_ACCESS'
}

export type UserResponse = UserNode;

export type UserStoreConnector = {
  __typename: 'UserStoreConnector';
  nodes: Array<UserStoreNode>;
  totalCount: Scalars['Int'];
};

export type UserStoreNode = {
  __typename: 'UserStoreNode';
  code: Scalars['String'];
  id: Scalars['String'];
  name: Scalars['String'];
};

export type UserStorePermissionConnector = {
  __typename: 'UserStorePermissionConnector';
  nodes: Array<UserStorePermissionNode>;
  totalCount: Scalars['Int'];
};

export type UserStorePermissionNode = {
  __typename: 'UserStorePermissionNode';
  context: Array<Scalars['String']>;
  permissions: Array<UserPermission>;
  storeId: Scalars['String'];
};
