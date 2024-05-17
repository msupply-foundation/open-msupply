export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /**
   * Implement the DateTime<Utc> scalar
   *
   * The input/output is a string in RFC3339 format.
   */
  DateTime: { input: string; output: string; }
  /** A scalar that can represent any JSON value. */
  JSON: { input: any; output: any; }
  /**
   * ISO 8601 calendar date without timezone.
   * Format: %Y-%m-%d
   *
   * # Examples
   *
   * * `1994-11-13`
   * * `2000-02-24`
   */
  NaiveDate: { input: string; output: string; }
  /**
   * ISO 8601 combined date and time without timezone.
   *
   * # Examples
   *
   * * `2015-07-01T08:59:60.123`,
   */
  NaiveDateTime: { input: string; output: string; }
};

export type AccountBlocked = AuthTokenErrorInterface & {
  __typename: 'AccountBlocked';
  description: Scalars['String']['output'];
  timeoutRemaining: Scalars['Int']['output'];
};

export type ActiveEncounterEventFilterInput = {
  data?: InputMaybe<StringFilterInput>;
  /**
   * 	Only include events that are for the current encounter, i.e. have matching encounter type
   * and matching encounter name of the current encounter. If not set all events with matching
   * encounter type are returned.
   */
  isCurrentEncounter?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export type ActivityLogConnector = {
  __typename: 'ActivityLogConnector';
  nodes: Array<ActivityLogNode>;
  totalCount: Scalars['Int']['output'];
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
  datetime: Scalars['DateTime']['output'];
  from?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  recordId?: Maybe<Scalars['String']['output']>;
  store?: Maybe<StoreNode>;
  storeId?: Maybe<Scalars['String']['output']>;
  to?: Maybe<Scalars['String']['output']>;
  type: ActivityLogNodeType;
  user?: Maybe<UserNode>;
};

export enum ActivityLogNodeType {
  AssetCatalogueItemCreated = 'ASSET_CATALOGUE_ITEM_CREATED',
  AssetCatalogueItemPropertyCreated = 'ASSET_CATALOGUE_ITEM_PROPERTY_CREATED',
  AssetCreated = 'ASSET_CREATED',
  AssetDeleted = 'ASSET_DELETED',
  AssetLogCreated = 'ASSET_LOG_CREATED',
  AssetLogReasonCreated = 'ASSET_LOG_REASON_CREATED',
  AssetLogReasonDeleted = 'ASSET_LOG_REASON_DELETED',
  AssetPropertyCreated = 'ASSET_PROPERTY_CREATED',
  AssetUpdated = 'ASSET_UPDATED',
  InventoryAdjustment = 'INVENTORY_ADJUSTMENT',
  InvoiceCreated = 'INVOICE_CREATED',
  InvoiceDeleted = 'INVOICE_DELETED',
  InvoiceNumberAllocated = 'INVOICE_NUMBER_ALLOCATED',
  InvoiceStatusAllocated = 'INVOICE_STATUS_ALLOCATED',
  InvoiceStatusDelivered = 'INVOICE_STATUS_DELIVERED',
  InvoiceStatusPicked = 'INVOICE_STATUS_PICKED',
  InvoiceStatusShipped = 'INVOICE_STATUS_SHIPPED',
  InvoiceStatusVerified = 'INVOICE_STATUS_VERIFIED',
  PrescriptionCreated = 'PRESCRIPTION_CREATED',
  PrescriptionDeleted = 'PRESCRIPTION_DELETED',
  PrescriptionStatusPicked = 'PRESCRIPTION_STATUS_PICKED',
  PrescriptionStatusVerified = 'PRESCRIPTION_STATUS_VERIFIED',
  QuantityForLineHasBeenSetToZero = 'QUANTITY_FOR_LINE_HAS_BEEN_SET_TO_ZERO',
  Repack = 'REPACK',
  RequisitionCreated = 'REQUISITION_CREATED',
  RequisitionDeleted = 'REQUISITION_DELETED',
  RequisitionNumberAllocated = 'REQUISITION_NUMBER_ALLOCATED',
  RequisitionStatusFinalised = 'REQUISITION_STATUS_FINALISED',
  RequisitionStatusSent = 'REQUISITION_STATUS_SENT',
  SensorLocationChanged = 'SENSOR_LOCATION_CHANGED',
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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ActivityLogSortFieldInput;
};

export type AddFromMasterListError = {
  __typename: 'AddFromMasterListError';
  error: AddFromMasterListErrorInterface;
};

export type AddFromMasterListErrorInterface = {
  description: Scalars['String']['output'];
};

export type AddFromMasterListInput = {
  masterListId: Scalars['String']['input'];
  requestRequisitionId: Scalars['String']['input'];
};

export type AddFromMasterListResponse = AddFromMasterListError | RequisitionLineConnector;

export type AddToInboundShipmentFromMasterListError = {
  __typename: 'AddToInboundShipmentFromMasterListError';
  error: AddToInboundShipmentFromMasterListErrorInterface;
};

export type AddToInboundShipmentFromMasterListErrorInterface = {
  description: Scalars['String']['output'];
};

export type AddToInboundShipmentFromMasterListResponse = AddToInboundShipmentFromMasterListError | InvoiceLineConnector;

export type AddToOutboundShipmentFromMasterListError = {
  __typename: 'AddToOutboundShipmentFromMasterListError';
  error: AddToOutboundShipmentFromMasterListErrorInterface;
};

export type AddToOutboundShipmentFromMasterListErrorInterface = {
  description: Scalars['String']['output'];
};

export type AddToOutboundShipmentFromMasterListResponse = AddToOutboundShipmentFromMasterListError | InvoiceLineConnector;

export type AddToShipmentFromMasterListInput = {
  masterListId: Scalars['String']['input'];
  shipmentId: Scalars['String']['input'];
};

export type AdjustmentReasonNotProvided = InsertStocktakeLineErrorInterface & UpdateStocktakeLineErrorInterface & {
  __typename: 'AdjustmentReasonNotProvided';
  description: Scalars['String']['output'];
};

export type AdjustmentReasonNotValid = InsertStocktakeLineErrorInterface & UpdateStocktakeLineErrorInterface & {
  __typename: 'AdjustmentReasonNotValid';
  description: Scalars['String']['output'];
};

export enum AdjustmentTypeInput {
  Addition = 'ADDITION',
  Reduction = 'REDUCTION'
}

export type AllocateOutboundShipmentUnallocatedLineError = {
  __typename: 'AllocateOutboundShipmentUnallocatedLineError';
  error: AllocateOutboundShipmentUnallocatedLineErrorInterface;
};

export type AllocateOutboundShipmentUnallocatedLineErrorInterface = {
  description: Scalars['String']['output'];
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
  id: Scalars['String']['output'];
  response: AllocateOutboundShipmentUnallocatedLineResponse;
};

export type AllocateProgramNumberInput = {
  numberName: Scalars['String']['input'];
};

export type AllocateProgramNumberResponse = NumberNode;

export type AssetCatalogueItemConnector = {
  __typename: 'AssetCatalogueItemConnector';
  nodes: Array<AssetCatalogueItemNode>;
  totalCount: Scalars['Int']['output'];
};

export type AssetCatalogueItemFilterInput = {
  category?: InputMaybe<StringFilterInput>;
  categoryId?: InputMaybe<EqualFilterStringInput>;
  class?: InputMaybe<StringFilterInput>;
  classId?: InputMaybe<EqualFilterStringInput>;
  code?: InputMaybe<StringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  manufacturer?: InputMaybe<StringFilterInput>;
  model?: InputMaybe<StringFilterInput>;
  search?: InputMaybe<StringFilterInput>;
  subCatalogue?: InputMaybe<StringFilterInput>;
  type?: InputMaybe<StringFilterInput>;
  typeId?: InputMaybe<EqualFilterStringInput>;
};

export type AssetCatalogueItemNode = {
  __typename: 'AssetCatalogueItemNode';
  assetCategory?: Maybe<AssetCategoryNode>;
  assetCategoryId: Scalars['String']['output'];
  assetClass?: Maybe<AssetClassNode>;
  assetClassId: Scalars['String']['output'];
  assetType?: Maybe<AssetTypeNode>;
  assetTypeId: Scalars['String']['output'];
  code: Scalars['String']['output'];
  id: Scalars['String']['output'];
  manufacturer?: Maybe<Scalars['String']['output']>;
  model: Scalars['String']['output'];
  subCatalogue: Scalars['String']['output'];
};

export type AssetCatalogueItemPropertyNode = {
  __typename: 'AssetCatalogueItemPropertyNode';
  catalogueItemId: Scalars['String']['output'];
  cataloguePropertyId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  valueBool?: Maybe<Scalars['Boolean']['output']>;
  valueFloat?: Maybe<Scalars['Float']['output']>;
  valueInt?: Maybe<Scalars['Int']['output']>;
  valueString?: Maybe<Scalars['String']['output']>;
};

export type AssetCatalogueItemPropertyValueNode = {
  __typename: 'AssetCatalogueItemPropertyValueNode';
  catalogueItemId: Scalars['String']['output'];
  cataloguePropertyId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  valueBool?: Maybe<Scalars['Boolean']['output']>;
  valueFloat?: Maybe<Scalars['Float']['output']>;
  valueInt?: Maybe<Scalars['Int']['output']>;
  valueString?: Maybe<Scalars['String']['output']>;
  valueType: PropertyNodeValueType;
};

export type AssetCatalogueItemResponse = AssetCatalogueItemNode | NodeError;

export enum AssetCatalogueItemSortFieldInput {
  Catalogue = 'catalogue',
  Code = 'code',
  Manufacturer = 'manufacturer',
  Model = 'model'
}

export type AssetCatalogueItemSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  key: AssetCatalogueItemSortFieldInput;
};

export type AssetCatalogueItemsResponse = AssetCatalogueItemConnector;

export type AssetCatalogueMutations = {
  __typename: 'AssetCatalogueMutations';
  deleteAssetCatalogueItem: DeleteAssetCatalogueItemResponse;
  insertAssetCatalogueItem: InsertAssetCatalogueItemResponse;
  insertAssetCatalogueItemProperty: InsertAssetCatalogueItemPropertyResponse;
};


export type AssetCatalogueMutationsDeleteAssetCatalogueItemArgs = {
  assetCatalogueItemId: Scalars['String']['input'];
};


export type AssetCatalogueMutationsInsertAssetCatalogueItemArgs = {
  input: InsertAssetCatalogueItemInput;
  storeId: Scalars['String']['input'];
};


export type AssetCatalogueMutationsInsertAssetCatalogueItemPropertyArgs = {
  input: InsertAssetCatalogueItemPropertyInput;
  storeId: Scalars['String']['input'];
};

export type AssetCataloguePropertyConnector = {
  __typename: 'AssetCataloguePropertyConnector';
  nodes: Array<AssetCataloguePropertyNode>;
  totalCount: Scalars['Int']['output'];
};

export type AssetCataloguePropertyFilterInput = {
  categoryId?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
};

export type AssetCataloguePropertyNode = {
  __typename: 'AssetCataloguePropertyNode';
  allowedValues?: Maybe<Scalars['String']['output']>;
  categoryId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  valueType: PropertyNodeValueType;
};

export type AssetCataloguePropertyResponse = AssetCataloguePropertyConnector | NodeError;

export type AssetCategoriesResponse = AssetCategoryConnector;

export type AssetCategoryConnector = {
  __typename: 'AssetCategoryConnector';
  nodes: Array<AssetCategoryNode>;
  totalCount: Scalars['Int']['output'];
};

export type AssetCategoryFilterInput = {
  classId?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
};

export type AssetCategoryNode = {
  __typename: 'AssetCategoryNode';
  classId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type AssetCategoryResponse = AssetCategoryNode | NodeError;

export enum AssetCategorySortFieldInput {
  Name = 'name'
}

export type AssetCategorySortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  key: AssetCategorySortFieldInput;
};

export type AssetClassConnector = {
  __typename: 'AssetClassConnector';
  nodes: Array<AssetClassNode>;
  totalCount: Scalars['Int']['output'];
};

export type AssetClassFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
};

export type AssetClassNode = {
  __typename: 'AssetClassNode';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type AssetClassResponse = AssetClassNode | NodeError;

export enum AssetClassSortFieldInput {
  Name = 'name'
}

export type AssetClassSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  key: AssetClassSortFieldInput;
};

export type AssetClassesResponse = AssetClassConnector;

export type AssetConnector = {
  __typename: 'AssetConnector';
  nodes: Array<AssetNode>;
  totalCount: Scalars['Int']['output'];
};

export type AssetFilterInput = {
  assetNumber?: InputMaybe<StringFilterInput>;
  catalogueItemId?: InputMaybe<EqualFilterStringInput>;
  categoryId?: InputMaybe<EqualFilterStringInput>;
  classId?: InputMaybe<EqualFilterStringInput>;
  functionalStatus?: InputMaybe<EqualFilterStatusInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  installationDate?: InputMaybe<DateFilterInput>;
  isNonCatalogue?: InputMaybe<Scalars['Boolean']['input']>;
  notes?: InputMaybe<StringFilterInput>;
  replacementDate?: InputMaybe<DateFilterInput>;
  serialNumber?: InputMaybe<StringFilterInput>;
  store?: InputMaybe<StringFilterInput>;
  typeId?: InputMaybe<EqualFilterStringInput>;
};

export type AssetLogConnector = {
  __typename: 'AssetLogConnector';
  nodes: Array<AssetLogNode>;
  totalCount: Scalars['Int']['output'];
};

export type AssetLogFilterInput = {
  assetId?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  logDatetime?: InputMaybe<DatetimeFilterInput>;
  reasonId?: InputMaybe<EqualFilterStringInput>;
  status?: InputMaybe<EqualFilterStatusInput>;
  user?: InputMaybe<StringFilterInput>;
};

export type AssetLogNode = {
  __typename: 'AssetLogNode';
  assetId: Scalars['String']['output'];
  comment?: Maybe<Scalars['String']['output']>;
  documents: SyncFileReferenceConnector;
  id: Scalars['String']['output'];
  logDatetime: Scalars['NaiveDateTime']['output'];
  reason?: Maybe<AssetLogReasonNode>;
  status?: Maybe<StatusType>;
  type?: Maybe<Scalars['String']['output']>;
  user?: Maybe<UserNode>;
};

export type AssetLogReasonConnector = {
  __typename: 'AssetLogReasonConnector';
  nodes: Array<AssetLogReasonNode>;
  totalCount: Scalars['Int']['output'];
};

export type AssetLogReasonFilterInput = {
  assetLogStatus?: InputMaybe<EqualFilterStatusInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  reason?: InputMaybe<StringFilterInput>;
};

export type AssetLogReasonMutations = {
  __typename: 'AssetLogReasonMutations';
  deleteLogReason: DeleteAssetLogReasonResponse;
  insertAssetLogReason: InsertAssetLogReasonResponse;
};


export type AssetLogReasonMutationsDeleteLogReasonArgs = {
  reasonId: Scalars['String']['input'];
};


export type AssetLogReasonMutationsInsertAssetLogReasonArgs = {
  input: InsertAssetLogReasonInput;
};

export type AssetLogReasonNode = {
  __typename: 'AssetLogReasonNode';
  assetLogStatus: StatusType;
  id: Scalars['String']['output'];
  reason: Scalars['String']['output'];
};

export enum AssetLogReasonSortFieldInput {
  Status = 'status'
}

export type AssetLogReasonSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: AssetLogReasonSortFieldInput;
};

export type AssetLogReasonsResponse = AssetLogReasonConnector;

export enum AssetLogSortFieldInput {
  LogDatetime = 'logDatetime',
  Status = 'status'
}

export type AssetLogSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: AssetLogSortFieldInput;
};

export enum AssetLogStatusInput {
  Decommissioned = 'DECOMMISSIONED',
  Functioning = 'FUNCTIONING',
  FunctioningButNeedsAttention = 'FUNCTIONING_BUT_NEEDS_ATTENTION',
  NotFunctioning = 'NOT_FUNCTIONING',
  NotInUse = 'NOT_IN_USE'
}

export type AssetLogsResponse = AssetLogConnector;

export type AssetNode = {
  __typename: 'AssetNode';
  assetCategory?: Maybe<AssetCategoryNode>;
  assetClass?: Maybe<AssetClassNode>;
  assetNumber?: Maybe<Scalars['String']['output']>;
  assetType?: Maybe<AssetTypeNode>;
  catalogProperties: Array<AssetCatalogueItemPropertyValueNode>;
  catalogueItem?: Maybe<AssetCatalogueItemNode>;
  catalogueItemId?: Maybe<Scalars['String']['output']>;
  createdDatetime: Scalars['NaiveDateTime']['output'];
  documents: SyncFileReferenceConnector;
  donor?: Maybe<NameNode>;
  donorNameId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  installationDate?: Maybe<Scalars['NaiveDate']['output']>;
  locations: LocationConnector;
  modifiedDatetime: Scalars['NaiveDateTime']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  properties: Scalars['String']['output'];
  replacementDate?: Maybe<Scalars['NaiveDate']['output']>;
  serialNumber?: Maybe<Scalars['String']['output']>;
  statusLog?: Maybe<AssetLogNode>;
  store?: Maybe<StoreNode>;
  storeId?: Maybe<Scalars['String']['output']>;
  warrantyEnd?: Maybe<Scalars['NaiveDate']['output']>;
  warrantyStart?: Maybe<Scalars['NaiveDate']['output']>;
};


export type AssetNodeDonorArgs = {
  storeId: Scalars['String']['input'];
};

export type AssetPropertiesResponse = AssetPropertyConnector;

export type AssetPropertyConnector = {
  __typename: 'AssetPropertyConnector';
  nodes: Array<AssetPropertyNode>;
  totalCount: Scalars['Int']['output'];
};

export type AssetPropertyFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
};

export type AssetPropertyNode = {
  __typename: 'AssetPropertyNode';
  id: Scalars['String']['output'];
};

export enum AssetSortFieldInput {
  AssetNumber = 'assetNumber',
  InstallationDate = 'installationDate',
  ModifiedDatetime = 'modifiedDatetime',
  ReplacementDate = 'replacementDate',
  SerialNumber = 'serialNumber',
  Store = 'store'
}

export type AssetSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: AssetSortFieldInput;
};

export type AssetTypeConnector = {
  __typename: 'AssetTypeConnector';
  nodes: Array<AssetTypeNode>;
  totalCount: Scalars['Int']['output'];
};

export type AssetTypeFilterInput = {
  categoryId?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
};

export type AssetTypeNode = {
  __typename: 'AssetTypeNode';
  categoryId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type AssetTypeResponse = AssetTypeNode | NodeError;

export enum AssetTypeSortFieldInput {
  Name = 'name'
}

export type AssetTypeSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  key: AssetTypeSortFieldInput;
};

export type AssetTypesResponse = AssetTypeConnector;

export type AssetsResponse = AssetConnector;

export type AuthToken = {
  __typename: 'AuthToken';
  /** Bearer token */
  token: Scalars['String']['output'];
};

export type AuthTokenError = {
  __typename: 'AuthTokenError';
  error: AuthTokenErrorInterface;
};

export type AuthTokenErrorInterface = {
  description: Scalars['String']['output'];
};

export type AuthTokenResponse = AuthToken | AuthTokenError;

export type BarcodeNode = {
  __typename: 'BarcodeNode';
  gtin: Scalars['String']['output'];
  id: Scalars['String']['output'];
  itemId: Scalars['String']['output'];
  manufacturerId?: Maybe<Scalars['String']['output']>;
  packSize?: Maybe<Scalars['Int']['output']>;
  parentId?: Maybe<Scalars['String']['output']>;
};

export type BarcodeResponse = BarcodeNode | NodeError;

export type BatchInboundShipmentInput = {
  continueOnError?: InputMaybe<Scalars['Boolean']['input']>;
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
  description: Scalars['String']['output'];
};

export type BatchOutboundShipmentInput = {
  allocatedOutboundShipmentUnallocatedLines?: InputMaybe<Array<Scalars['String']['input']>>;
  continueOnError?: InputMaybe<Scalars['Boolean']['input']>;
  deleteOutboundShipmentLines?: InputMaybe<Array<DeleteOutboundShipmentLineInput>>;
  deleteOutboundShipmentServiceLines?: InputMaybe<Array<DeleteOutboundShipmentServiceLineInput>>;
  deleteOutboundShipmentUnallocatedLines?: InputMaybe<Array<DeleteOutboundShipmentUnallocatedLineInput>>;
  deleteOutboundShipments?: InputMaybe<Array<Scalars['String']['input']>>;
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

export type BatchPrescriptionInput = {
  continueOnError?: InputMaybe<Scalars['Boolean']['input']>;
  deletePrescriptionLines?: InputMaybe<Array<DeletePrescriptionLineInput>>;
  deletePrescriptions?: InputMaybe<Array<Scalars['String']['input']>>;
  insertPrescriptionLines?: InputMaybe<Array<InsertPrescriptionLineInput>>;
  insertPrescriptions?: InputMaybe<Array<InsertPrescriptionInput>>;
  updatePrescriptionLines?: InputMaybe<Array<UpdatePrescriptionLineInput>>;
  updatePrescriptions?: InputMaybe<Array<UpdatePrescriptionInput>>;
};

export type BatchPrescriptionResponse = {
  __typename: 'BatchPrescriptionResponse';
  deletePrescriptionLines?: Maybe<Array<DeletePrescriptionLineResponseWithId>>;
  deletePrescriptions?: Maybe<Array<DeletePrescriptionResponseWithId>>;
  insertPrescriptionLines?: Maybe<Array<InsertPrescriptionLineResponseWithId>>;
  insertPrescriptions?: Maybe<Array<InsertPrescriptionResponseWithId>>;
  updatePrescriptionLines?: Maybe<Array<UpdatePrescriptionLineResponseWithId>>;
  updatePrescriptions?: Maybe<Array<UpdatePrescriptionResponseWithId>>;
};

export type BatchRequestRequisitionInput = {
  continueOnError?: InputMaybe<Scalars['Boolean']['input']>;
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
  continueOnError?: InputMaybe<Scalars['Boolean']['input']>;
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
  description: Scalars['String']['output'];
  invoiceLines: InvoiceLineConnector;
};

export type CanOnlyChangeToPickedWhenNoUnallocatedLines = UpdatePrescriptionErrorInterface & {
  __typename: 'CanOnlyChangeToPickedWhenNoUnallocatedLines';
  description: Scalars['String']['output'];
  invoiceLines: InvoiceLineConnector;
};

export type CannotAddPackSizeOfZero = InsertPackVariantErrorInterface & {
  __typename: 'CannotAddPackSizeOfZero';
  description: Scalars['String']['output'];
};

export type CannotAddWithNoAbbreviationAndName = InsertPackVariantErrorInterface & UpdatePackVariantErrorInterface & {
  __typename: 'CannotAddWithNoAbbreviationAndName';
  description: Scalars['String']['output'];
};

export type CannotChangeStatusOfInvoiceOnHold = UpdateErrorInterface & UpdateInboundShipmentErrorInterface & {
  __typename: 'CannotChangeStatusOfInvoiceOnHold';
  description: Scalars['String']['output'];
};

export type CannotDeleteInvoiceWithLines = DeleteErrorInterface & DeleteInboundReturnErrorInterface & DeleteInboundShipmentErrorInterface & DeleteOutboundReturnErrorInterface & DeletePrescriptionErrorInterface & {
  __typename: 'CannotDeleteInvoiceWithLines';
  description: Scalars['String']['output'];
  lines: InvoiceLineConnector;
};

export type CannotDeleteRequisitionWithLines = DeleteRequestRequisitionErrorInterface & {
  __typename: 'CannotDeleteRequisitionWithLines';
  description: Scalars['String']['output'];
};

export type CannotEditInvoice = AddToInboundShipmentFromMasterListErrorInterface & AddToOutboundShipmentFromMasterListErrorInterface & DeleteErrorInterface & DeleteInboundReturnErrorInterface & DeleteInboundShipmentErrorInterface & DeleteInboundShipmentLineErrorInterface & DeleteInboundShipmentServiceLineErrorInterface & DeleteOutboundReturnErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & DeletePrescriptionErrorInterface & DeletePrescriptionLineErrorInterface & InsertInboundShipmentLineErrorInterface & InsertInboundShipmentServiceLineErrorInterface & InsertOutboundShipmentLineErrorInterface & InsertOutboundShipmentServiceLineErrorInterface & InsertPrescriptionLineErrorInterface & UpdateInboundShipmentErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateInboundShipmentServiceLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & UpdatePrescriptionLineErrorInterface & {
  __typename: 'CannotEditInvoice';
  description: Scalars['String']['output'];
};

export type CannotEditRequisition = AddFromMasterListErrorInterface & CreateRequisitionShipmentErrorInterface & DeleteRequestRequisitionErrorInterface & DeleteRequestRequisitionLineErrorInterface & InsertRequestRequisitionLineErrorInterface & SupplyRequestedQuantityErrorInterface & UpdateRequestRequisitionErrorInterface & UpdateRequestRequisitionLineErrorInterface & UpdateResponseRequisitionErrorInterface & UpdateResponseRequisitionLineErrorInterface & UseSuggestedQuantityErrorInterface & {
  __typename: 'CannotEditRequisition';
  description: Scalars['String']['output'];
};

export type CannotEditStocktake = DeleteStocktakeErrorInterface & DeleteStocktakeLineErrorInterface & InsertStocktakeLineErrorInterface & UpdateStocktakeErrorInterface & UpdateStocktakeLineErrorInterface & {
  __typename: 'CannotEditStocktake';
  description: Scalars['String']['output'];
};

export type CannotHaveFractionalPack = InsertRepackErrorInterface & {
  __typename: 'CannotHaveFractionalPack';
  description: Scalars['String']['output'];
};

export type CannotIssueInForeignCurrency = UpdateErrorInterface & UpdateInboundShipmentErrorInterface & {
  __typename: 'CannotIssueInForeignCurrency';
  description: Scalars['String']['output'];
};

export type CannotReverseInvoiceStatus = UpdateErrorInterface & UpdateInboundShipmentErrorInterface & UpdatePrescriptionErrorInterface & {
  __typename: 'CannotReverseInvoiceStatus';
  description: Scalars['String']['output'];
};

export type CentralPatientNode = {
  __typename: 'CentralPatientNode';
  code: Scalars['String']['output'];
  dateOfBirth?: Maybe<Scalars['NaiveDate']['output']>;
  firstName: Scalars['String']['output'];
  id: Scalars['String']['output'];
  lastName: Scalars['String']['output'];
};

export type CentralPatientSearchConnector = {
  __typename: 'CentralPatientSearchConnector';
  nodes: Array<CentralPatientNode>;
  totalCount: Scalars['Int']['output'];
};

export type CentralPatientSearchError = {
  __typename: 'CentralPatientSearchError';
  error: CentralPatientSearchErrorInterface;
};

export type CentralPatientSearchErrorInterface = {
  description: Scalars['String']['output'];
};

export type CentralPatientSearchInput = {
  /** Patient code */
  code?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['NaiveDate']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
};

export type CentralPatientSearchResponse = CentralPatientSearchConnector | CentralPatientSearchError;

export type CentralServerMutationNode = {
  __typename: 'CentralServerMutationNode';
  assetCatalogue: AssetCatalogueMutations;
  logReason: AssetLogReasonMutations;
  packVariant: PackVariantMutations;
};

export type ClinicianConnector = {
  __typename: 'ClinicianConnector';
  nodes: Array<ClinicianNode>;
  totalCount: Scalars['Int']['output'];
};

export type ClinicianFilterInput = {
  address1?: InputMaybe<StringFilterInput>;
  address2?: InputMaybe<StringFilterInput>;
  code?: InputMaybe<StringFilterInput>;
  email?: InputMaybe<StringFilterInput>;
  firstName?: InputMaybe<StringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  initials?: InputMaybe<StringFilterInput>;
  lastName?: InputMaybe<StringFilterInput>;
  mobile?: InputMaybe<StringFilterInput>;
  phone?: InputMaybe<StringFilterInput>;
};

export type ClinicianNode = {
  __typename: 'ClinicianNode';
  address1?: Maybe<Scalars['String']['output']>;
  address2?: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  gender?: Maybe<GenderType>;
  id: Scalars['String']['output'];
  initials: Scalars['String']['output'];
  lastName: Scalars['String']['output'];
  mobile?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
};

export enum ClinicianSortFieldInput {
  Address1 = 'address1',
  Address2 = 'address2',
  Code = 'code',
  Email = 'email',
  FirstName = 'firstName',
  Initials = 'initials',
  LastName = 'lastName',
  Mobile = 'mobile',
  Phone = 'phone'
}

export type ClinicianSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ClinicianSortFieldInput;
};

export type CliniciansResponse = ClinicianConnector;

export type ConnectionError = CentralPatientSearchErrorInterface & LinkPatientPatientToStoreErrorInterface & UpdateUserErrorInterface & {
  __typename: 'ConnectionError';
  description: Scalars['String']['output'];
};

export type ConsumptionHistoryConnector = {
  __typename: 'ConsumptionHistoryConnector';
  nodes: Array<ConsumptionHistoryNode>;
  totalCount: Scalars['Int']['output'];
};

export type ConsumptionHistoryNode = {
  __typename: 'ConsumptionHistoryNode';
  averageMonthlyConsumption: Scalars['Int']['output'];
  consumption: Scalars['Int']['output'];
  date: Scalars['NaiveDate']['output'];
  isCurrent: Scalars['Boolean']['output'];
  isHistoric: Scalars['Boolean']['output'];
};

export type ConsumptionOptionsInput = {
  /** Defaults to 3 months */
  amcLookbackMonths?: InputMaybe<Scalars['Int']['input']>;
  /** Defaults to 12 */
  numberOfDataPoints?: InputMaybe<Scalars['Int']['input']>;
};

export type ContactTraceConnector = {
  __typename: 'ContactTraceConnector';
  nodes: Array<ContactTraceNode>;
  totalCount: Scalars['Int']['output'];
};

export type ContactTraceFilterInput = {
  contactPatientId?: InputMaybe<EqualFilterStringInput>;
  contactTraceId?: InputMaybe<StringFilterInput>;
  dateOfBirth?: InputMaybe<DateFilterInput>;
  datetime?: InputMaybe<DatetimeFilterInput>;
  documentName?: InputMaybe<StringFilterInput>;
  firstName?: InputMaybe<StringFilterInput>;
  gender?: InputMaybe<EqualFilterGenderInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  lastName?: InputMaybe<StringFilterInput>;
  patientId?: InputMaybe<EqualFilterStringInput>;
  programId?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<StringFilterInput>;
};

export type ContactTraceNode = {
  __typename: 'ContactTraceNode';
  age?: Maybe<Scalars['Int']['output']>;
  contactPatient?: Maybe<PatientNode>;
  contactPatientId?: Maybe<Scalars['String']['output']>;
  contactTraceId?: Maybe<Scalars['String']['output']>;
  dateOfBirth?: Maybe<Scalars['NaiveDate']['output']>;
  datetime: Scalars['DateTime']['output'];
  /** The encounter document */
  document: DocumentNode;
  documentId: Scalars['String']['output'];
  firstName?: Maybe<Scalars['String']['output']>;
  gender?: Maybe<GenderType>;
  id: Scalars['String']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  patient: PatientNode;
  patientId: Scalars['String']['output'];
  program: ProgramNode;
  /** Returns the matching program enrolment for the root patient of this contact trace */
  programEnrolment?: Maybe<ProgramEnrolmentNode>;
  programId: Scalars['String']['output'];
  /** Relationship between the patient and the contact, e.g. mother, next of kin, etc. */
  relationship?: Maybe<Scalars['String']['output']>;
  storeId?: Maybe<Scalars['String']['output']>;
};

export type ContactTraceResponse = ContactTraceConnector;

export enum ContactTraceSortFieldInput {
  ContactTraceId = 'contactTraceId',
  DateOfBirth = 'dateOfBirth',
  Datetime = 'datetime',
  FirstName = 'firstName',
  Gender = 'gender',
  LastName = 'lastName',
  PatientId = 'patientId',
  ProgramId = 'programId'
}

export type ContactTraceSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ContactTraceSortFieldInput;
};

export type CreateInventoryAdjustmentError = {
  __typename: 'CreateInventoryAdjustmentError';
  error: InsertInventoryAdjustmentErrorInterface;
};

export type CreateInventoryAdjustmentInput = {
  adjustment: Scalars['Float']['input'];
  adjustmentType: AdjustmentTypeInput;
  inventoryAdjustmentReasonId?: InputMaybe<Scalars['String']['input']>;
  stockLineId: Scalars['String']['input'];
};

export type CreateInventoryAdjustmentResponse = CreateInventoryAdjustmentError | InvoiceNode;

export type CreateRequisitionShipmentError = {
  __typename: 'CreateRequisitionShipmentError';
  error: CreateRequisitionShipmentErrorInterface;
};

export type CreateRequisitionShipmentErrorInterface = {
  description: Scalars['String']['output'];
};

export type CreateRequisitionShipmentInput = {
  responseRequisitionId: Scalars['String']['input'];
};

export type CreateRequisitionShipmentResponse = CreateRequisitionShipmentError | InvoiceNode;

export type CurrenciesResponse = CurrencyConnector;

export type CurrencyConnector = {
  __typename: 'CurrencyConnector';
  nodes: Array<CurrencyNode>;
  totalCount: Scalars['Int']['output'];
};

export type CurrencyFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isHomeCurrency?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CurrencyNode = {
  __typename: 'CurrencyNode';
  code: Scalars['String']['output'];
  dateUpdated?: Maybe<Scalars['NaiveDate']['output']>;
  id: Scalars['String']['output'];
  isHomeCurrency: Scalars['Boolean']['output'];
  rate: Scalars['Float']['output'];
};

export enum CurrencySortFieldInput {
  CurrencyCode = 'currencyCode',
  Id = 'id',
  IsHomeCurrency = 'isHomeCurrency'
}

export type CurrencySortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: CurrencySortFieldInput;
};

export type DatabaseError = DeleteAssetCatalogueItemErrorInterface & DeleteAssetErrorInterface & DeleteAssetLogReasonErrorInterface & DeleteLocationErrorInterface & InsertAssetCatalogueItemErrorInterface & InsertAssetCatalogueItemPropertyErrorInterface & InsertAssetErrorInterface & InsertAssetLogErrorInterface & InsertAssetLogReasonErrorInterface & InsertLocationErrorInterface & NodeErrorInterface & RefreshTokenErrorInterface & UpdateAssetErrorInterface & UpdateLocationErrorInterface & UpdateSensorErrorInterface & {
  __typename: 'DatabaseError';
  description: Scalars['String']['output'];
  fullError: Scalars['String']['output'];
};

export type DatabaseSettingsNode = {
  __typename: 'DatabaseSettingsNode';
  databaseType: DatabaseType;
};

export enum DatabaseType {
  Postgres = 'POSTGRES',
  SqLite = 'SQ_LITE'
}

export type DateFilterInput = {
  afterOrEqualTo?: InputMaybe<Scalars['NaiveDate']['input']>;
  beforeOrEqualTo?: InputMaybe<Scalars['NaiveDate']['input']>;
  equalTo?: InputMaybe<Scalars['NaiveDate']['input']>;
};

export type DatetimeFilterInput = {
  afterOrEqualTo?: InputMaybe<Scalars['DateTime']['input']>;
  beforeOrEqualTo?: InputMaybe<Scalars['DateTime']['input']>;
  equalTo?: InputMaybe<Scalars['DateTime']['input']>;
};

export type DeleteAssetCatalogueItemError = {
  __typename: 'DeleteAssetCatalogueItemError';
  error: DeleteAssetCatalogueItemErrorInterface;
};

export type DeleteAssetCatalogueItemErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteAssetCatalogueItemResponse = DeleteAssetCatalogueItemError | DeleteResponse;

export type DeleteAssetError = {
  __typename: 'DeleteAssetError';
  error: DeleteAssetErrorInterface;
};

export type DeleteAssetErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteAssetLogReasonError = {
  __typename: 'DeleteAssetLogReasonError';
  error: DeleteAssetLogReasonErrorInterface;
};

export type DeleteAssetLogReasonErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteAssetLogReasonResponse = DeleteAssetLogReasonError | DeleteResponse;

export type DeleteAssetResponse = DeleteAssetError | DeleteResponse;

export type DeleteErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteInboundReturnError = {
  __typename: 'DeleteInboundReturnError';
  error: DeleteInboundReturnErrorInterface;
};

export type DeleteInboundReturnErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteInboundReturnResponse = DeleteInboundReturnError | DeleteResponse;

export type DeleteInboundShipmentError = {
  __typename: 'DeleteInboundShipmentError';
  error: DeleteInboundShipmentErrorInterface;
};

export type DeleteInboundShipmentErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteInboundShipmentInput = {
  id: Scalars['String']['input'];
};

export type DeleteInboundShipmentLineError = {
  __typename: 'DeleteInboundShipmentLineError';
  error: DeleteInboundShipmentLineErrorInterface;
};

export type DeleteInboundShipmentLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteInboundShipmentLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteInboundShipmentLineResponse = DeleteInboundShipmentLineError | DeleteResponse;

export type DeleteInboundShipmentLineResponseWithId = {
  __typename: 'DeleteInboundShipmentLineResponseWithId';
  id: Scalars['String']['output'];
  response: DeleteInboundShipmentLineResponse;
};

export type DeleteInboundShipmentResponse = DeleteInboundShipmentError | DeleteResponse;

export type DeleteInboundShipmentResponseWithId = {
  __typename: 'DeleteInboundShipmentResponseWithId';
  id: Scalars['String']['output'];
  response: DeleteInboundShipmentResponse;
};

export type DeleteInboundShipmentServiceLineError = {
  __typename: 'DeleteInboundShipmentServiceLineError';
  error: DeleteInboundShipmentServiceLineErrorInterface;
};

export type DeleteInboundShipmentServiceLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteInboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteInboundShipmentServiceLineResponse = DeleteInboundShipmentServiceLineError | DeleteResponse;

export type DeleteInboundShipmentServiceLineResponseWithId = {
  __typename: 'DeleteInboundShipmentServiceLineResponseWithId';
  id: Scalars['String']['output'];
  response: DeleteInboundShipmentServiceLineResponse;
};

export type DeleteLocationError = {
  __typename: 'DeleteLocationError';
  error: DeleteLocationErrorInterface;
};

export type DeleteLocationErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteLocationInput = {
  id: Scalars['String']['input'];
};

export type DeleteLocationResponse = DeleteLocationError | DeleteResponse;

export type DeleteOutboundReturnError = {
  __typename: 'DeleteOutboundReturnError';
  error: DeleteOutboundReturnErrorInterface;
};

export type DeleteOutboundReturnErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteOutboundReturnResponse = DeleteOutboundReturnError | DeleteResponse;

export type DeleteOutboundShipmentError = {
  __typename: 'DeleteOutboundShipmentError';
  error: DeleteErrorInterface;
};

export type DeleteOutboundShipmentLineError = {
  __typename: 'DeleteOutboundShipmentLineError';
  error: DeleteOutboundShipmentLineErrorInterface;
};

export type DeleteOutboundShipmentLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteOutboundShipmentLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteOutboundShipmentLineResponse = DeleteOutboundShipmentLineError | DeleteResponse;

export type DeleteOutboundShipmentLineResponseWithId = {
  __typename: 'DeleteOutboundShipmentLineResponseWithId';
  id: Scalars['String']['output'];
  response: DeleteOutboundShipmentLineResponse;
};

export type DeleteOutboundShipmentResponse = DeleteOutboundShipmentError | DeleteResponse;

export type DeleteOutboundShipmentResponseWithId = {
  __typename: 'DeleteOutboundShipmentResponseWithId';
  id: Scalars['String']['output'];
  response: DeleteOutboundShipmentResponse;
};

export type DeleteOutboundShipmentServiceLineError = {
  __typename: 'DeleteOutboundShipmentServiceLineError';
  error: DeleteOutboundShipmentServiceLineErrorInterface;
};

export type DeleteOutboundShipmentServiceLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteOutboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteOutboundShipmentServiceLineResponse = DeleteOutboundShipmentServiceLineError | DeleteResponse;

export type DeleteOutboundShipmentServiceLineResponseWithId = {
  __typename: 'DeleteOutboundShipmentServiceLineResponseWithId';
  id: Scalars['String']['output'];
  response: DeleteOutboundShipmentServiceLineResponse;
};

export type DeleteOutboundShipmentUnallocatedLineError = {
  __typename: 'DeleteOutboundShipmentUnallocatedLineError';
  error: DeleteOutboundShipmentUnallocatedLineErrorInterface;
};

export type DeleteOutboundShipmentUnallocatedLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteOutboundShipmentUnallocatedLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteOutboundShipmentUnallocatedLineResponse = DeleteOutboundShipmentUnallocatedLineError | DeleteResponse;

export type DeleteOutboundShipmentUnallocatedLineResponseWithId = {
  __typename: 'DeleteOutboundShipmentUnallocatedLineResponseWithId';
  id: Scalars['String']['output'];
  response: DeleteOutboundShipmentUnallocatedLineResponse;
};

export type DeletePackVariantInput = {
  id: Scalars['String']['input'];
};

export type DeletePackVariantResponse = DeleteResponse;

export type DeletePrescriptionError = {
  __typename: 'DeletePrescriptionError';
  error: DeletePrescriptionErrorInterface;
};

export type DeletePrescriptionErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeletePrescriptionLineError = {
  __typename: 'DeletePrescriptionLineError';
  error: DeletePrescriptionLineErrorInterface;
};

export type DeletePrescriptionLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeletePrescriptionLineInput = {
  id: Scalars['String']['input'];
};

export type DeletePrescriptionLineResponse = DeletePrescriptionLineError | DeleteResponse;

export type DeletePrescriptionLineResponseWithId = {
  __typename: 'DeletePrescriptionLineResponseWithId';
  id: Scalars['String']['output'];
  response: DeletePrescriptionLineResponse;
};

export type DeletePrescriptionResponse = DeletePrescriptionError | DeleteResponse;

export type DeletePrescriptionResponseWithId = {
  __typename: 'DeletePrescriptionResponseWithId';
  id: Scalars['String']['output'];
  response: DeletePrescriptionResponse;
};

export type DeleteRequestRequisitionError = {
  __typename: 'DeleteRequestRequisitionError';
  error: DeleteRequestRequisitionErrorInterface;
};

export type DeleteRequestRequisitionErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteRequestRequisitionInput = {
  id: Scalars['String']['input'];
};

export type DeleteRequestRequisitionLineError = {
  __typename: 'DeleteRequestRequisitionLineError';
  error: DeleteRequestRequisitionLineErrorInterface;
};

export type DeleteRequestRequisitionLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteRequestRequisitionLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteRequestRequisitionLineResponse = DeleteRequestRequisitionLineError | DeleteResponse;

export type DeleteRequestRequisitionLineResponseWithId = {
  __typename: 'DeleteRequestRequisitionLineResponseWithId';
  id: Scalars['String']['output'];
  response: DeleteRequestRequisitionLineResponse;
};

export type DeleteRequestRequisitionResponse = DeleteRequestRequisitionError | DeleteResponse;

export type DeleteRequestRequisitionResponseWithId = {
  __typename: 'DeleteRequestRequisitionResponseWithId';
  id: Scalars['String']['output'];
  response: DeleteRequestRequisitionResponse;
};

export type DeleteResponse = {
  __typename: 'DeleteResponse';
  id: Scalars['String']['output'];
};

export type DeleteStocktakeError = {
  __typename: 'DeleteStocktakeError';
  error: DeleteStocktakeErrorInterface;
};

export type DeleteStocktakeErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteStocktakeInput = {
  id: Scalars['String']['input'];
};

export type DeleteStocktakeLineError = {
  __typename: 'DeleteStocktakeLineError';
  error: DeleteStocktakeLineErrorInterface;
};

export type DeleteStocktakeLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type DeleteStocktakeLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteStocktakeLineResponse = DeleteResponse | DeleteStocktakeLineError;

export type DeleteStocktakeLineResponseWithId = {
  __typename: 'DeleteStocktakeLineResponseWithId';
  id: Scalars['String']['output'];
  response: DeleteStocktakeLineResponse;
};

export type DeleteStocktakeResponse = DeleteResponse | DeleteStocktakeError;

export type DeleteStocktakeResponseWithId = {
  __typename: 'DeleteStocktakeResponseWithId';
  id: Scalars['String']['output'];
  response: DeleteStocktakeResponse;
};

export type DisplaySettingNode = {
  __typename: 'DisplaySettingNode';
  hash: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type DisplaySettingsHash = {
  logo: Scalars['String']['input'];
  theme: Scalars['String']['input'];
};

export type DisplaySettingsInput = {
  customLogo?: InputMaybe<Scalars['String']['input']>;
  customTheme?: InputMaybe<Scalars['String']['input']>;
};

export type DisplaySettingsNode = {
  __typename: 'DisplaySettingsNode';
  customLogo?: Maybe<DisplaySettingNode>;
  customTheme?: Maybe<DisplaySettingNode>;
};

export type DocumentConnector = {
  __typename: 'DocumentConnector';
  nodes: Array<DocumentNode>;
  totalCount: Scalars['Int']['output'];
};

export type DocumentFilterInput = {
  contextId?: InputMaybe<EqualFilterStringInput>;
  /**
   * 	This filter makes it possible to search the raw text json data.
   * Be beware of potential performance issues.
   */
  data?: InputMaybe<StringFilterInput>;
  datetime?: InputMaybe<DatetimeFilterInput>;
  name?: InputMaybe<StringFilterInput>;
  owner?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export type DocumentHistoryResponse = DocumentConnector;

export type DocumentNode = {
  __typename: 'DocumentNode';
  data: Scalars['JSON']['output'];
  documentRegistry?: Maybe<DocumentRegistryNode>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  parents: Array<Scalars['String']['output']>;
  schema?: Maybe<JsonschemaNode>;
  timestamp: Scalars['DateTime']['output'];
  type: Scalars['String']['output'];
  user?: Maybe<UserNode>;
  userId: Scalars['String']['output'];
};

export enum DocumentRegistryCategoryNode {
  ContactTrace = 'CONTACT_TRACE',
  Custom = 'CUSTOM',
  Encounter = 'ENCOUNTER',
  Patient = 'PATIENT',
  ProgramEnrolment = 'PROGRAM_ENROLMENT'
}

export type DocumentRegistryConnector = {
  __typename: 'DocumentRegistryConnector';
  nodes: Array<DocumentRegistryNode>;
  totalCount: Scalars['Int']['output'];
};

export type DocumentRegistryFilterInput = {
  category?: InputMaybe<EqualFilterDocumentRegistryCategoryInput>;
  contextId?: InputMaybe<EqualFilterStringInput>;
  documentType?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
};

export type DocumentRegistryNode = {
  __typename: 'DocumentRegistryNode';
  category: DocumentRegistryCategoryNode;
  contextId: Scalars['String']['output'];
  documentType: Scalars['String']['output'];
  formSchemaId: Scalars['String']['output'];
  id: Scalars['String']['output'];
  jsonSchema: Scalars['JSON']['output'];
  name?: Maybe<Scalars['String']['output']>;
  uiSchema: Scalars['JSON']['output'];
  uiSchemaType: Scalars['String']['output'];
};

export type DocumentRegistryResponse = DocumentRegistryConnector;

export enum DocumentRegistrySortFieldInput {
  DocumentType = 'documentType',
  Type = 'type'
}

export type DocumentRegistrySortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: DocumentSortFieldInput;
};

export type EncounterConnector = {
  __typename: 'EncounterConnector';
  nodes: Array<EncounterNode>;
  totalCount: Scalars['Int']['output'];
};

export type EncounterEventFilterInput = {
  activeEndDatetime?: InputMaybe<DatetimeFilterInput>;
  activeStartDatetime?: InputMaybe<DatetimeFilterInput>;
  data?: InputMaybe<StringFilterInput>;
  datetime?: InputMaybe<DatetimeFilterInput>;
  /**
   * 	Only include events that are for the current encounter, i.e. have matching encounter type
   * and matching encounter name of the current encounter. If not set all events with matching
   * encounter type are returned.
   */
  isCurrentEncounter?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export type EncounterFieldsConnector = {
  __typename: 'EncounterFieldsConnector';
  nodes: Array<EncounterFieldsNode>;
  totalCount: Scalars['Int']['output'];
};

export type EncounterFieldsInput = {
  fields: Array<Scalars['String']['input']>;
};

export type EncounterFieldsNode = {
  __typename: 'EncounterFieldsNode';
  encounter: EncounterNode;
  fields: Array<Scalars['JSON']['output']>;
};

export type EncounterFieldsResponse = EncounterFieldsConnector;

export type EncounterFilterInput = {
  clinicianId?: InputMaybe<EqualFilterStringInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  documentData?: InputMaybe<StringFilterInput>;
  documentName?: InputMaybe<EqualFilterStringInput>;
  endDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  /** Only if this filter is set encounters with status DELETED are returned */
  includeDeleted?: InputMaybe<Scalars['Boolean']['input']>;
  patient?: InputMaybe<PatientFilterInput>;
  patientId?: InputMaybe<EqualFilterStringInput>;
  programEnrolment?: InputMaybe<ProgramEnrolmentFilterInput>;
  /** The program id */
  programId?: InputMaybe<EqualFilterStringInput>;
  startDatetime?: InputMaybe<DatetimeFilterInput>;
  status?: InputMaybe<EqualFilterEncounterStatusInput>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export type EncounterNode = {
  __typename: 'EncounterNode';
  activeProgramEvents: ProgramEventResponse;
  clinician?: Maybe<ClinicianNode>;
  contextId: Scalars['String']['output'];
  createdDatetime: Scalars['DateTime']['output'];
  /** The encounter document */
  document: DocumentNode;
  endDatetime?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  patient: PatientNode;
  patientId: Scalars['String']['output'];
  /** Returns the matching program enrolment for the patient of this encounter */
  programEnrolment?: Maybe<ProgramEnrolmentNode>;
  programEvents: ProgramEventResponse;
  programId: Scalars['String']['output'];
  startDatetime: Scalars['DateTime']['output'];
  status?: Maybe<EncounterNodeStatus>;
  /** Tries to suggest a date for the next encounter */
  suggestedNextEncounter?: Maybe<SuggestedNextEncounterNode>;
  type: Scalars['String']['output'];
};


export type EncounterNodeActiveProgramEventsArgs = {
  at?: InputMaybe<Scalars['DateTime']['input']>;
  filter?: InputMaybe<ActiveEncounterEventFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<ProgramEventSortInput>;
};


export type EncounterNodeProgramEventsArgs = {
  filter?: InputMaybe<EncounterEventFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<ProgramEventSortInput>;
};

export enum EncounterNodeStatus {
  Cancelled = 'CANCELLED',
  Deleted = 'DELETED',
  Pending = 'PENDING',
  Visited = 'VISITED'
}

export type EncounterResponse = EncounterConnector;

export enum EncounterSortFieldInput {
  CreatedDatetime = 'createdDatetime',
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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: EncounterSortFieldInput;
};

export type EqualFilterActivityLogTypeInput = {
  equalAny?: InputMaybe<Array<ActivityLogNodeType>>;
  equalTo?: InputMaybe<ActivityLogNodeType>;
  notEqualTo?: InputMaybe<ActivityLogNodeType>;
};

export type EqualFilterBigFloatingNumberInput = {
  equalAny?: InputMaybe<Array<Scalars['Float']['input']>>;
  equalTo?: InputMaybe<Scalars['Float']['input']>;
  notEqualTo?: InputMaybe<Scalars['Float']['input']>;
};

export type EqualFilterBigNumberInput = {
  equalAny?: InputMaybe<Array<Scalars['Int']['input']>>;
  equalTo?: InputMaybe<Scalars['Int']['input']>;
  notEqualTo?: InputMaybe<Scalars['Int']['input']>;
};

export type EqualFilterDocumentRegistryCategoryInput = {
  equalAny?: InputMaybe<Array<DocumentRegistryCategoryNode>>;
  equalTo?: InputMaybe<DocumentRegistryCategoryNode>;
  notEqualTo?: InputMaybe<DocumentRegistryCategoryNode>;
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

export type EqualFilterInventoryAdjustmentReasonTypeInput = {
  equalAny?: InputMaybe<Array<InventoryAdjustmentReasonNodeType>>;
  equalTo?: InputMaybe<InventoryAdjustmentReasonNodeType>;
  notEqualTo?: InputMaybe<InventoryAdjustmentReasonNodeType>;
};

export type EqualFilterInvoiceLineTypeInput = {
  equalAny?: InputMaybe<Array<InvoiceLineNodeType>>;
  equalTo?: InputMaybe<InvoiceLineNodeType>;
  notEqualTo?: InputMaybe<InvoiceLineNodeType>;
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
  equalAny?: InputMaybe<Array<Scalars['Int']['input']>>;
  equalTo?: InputMaybe<Scalars['Int']['input']>;
  notEqualTo?: InputMaybe<Scalars['Int']['input']>;
};

export type EqualFilterRelatedRecordTypeInput = {
  equalAny?: InputMaybe<Array<RelatedRecordNodeType>>;
  equalTo?: InputMaybe<RelatedRecordNodeType>;
  notEqualTo?: InputMaybe<RelatedRecordNodeType>;
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

export type EqualFilterStatusInput = {
  equalAny?: InputMaybe<Array<AssetLogStatusInput>>;
  equalTo?: InputMaybe<AssetLogStatusInput>;
  notEqualTo?: InputMaybe<AssetLogStatusInput>;
};

export type EqualFilterStocktakeStatusInput = {
  equalAny?: InputMaybe<Array<StocktakeNodeStatus>>;
  equalTo?: InputMaybe<StocktakeNodeStatus>;
  notEqualTo?: InputMaybe<StocktakeNodeStatus>;
};

export type EqualFilterStringInput = {
  equalAny?: InputMaybe<Array<Scalars['String']['input']>>;
  equalTo?: InputMaybe<Scalars['String']['input']>;
  notEqualTo?: InputMaybe<Scalars['String']['input']>;
};

export type EqualFilterTemperatureBreachRowTypeInput = {
  equalAny?: InputMaybe<Array<TemperatureBreachNodeType>>;
  equalTo?: InputMaybe<TemperatureBreachNodeType>;
  notEqualTo?: InputMaybe<TemperatureBreachNodeType>;
};

export type EqualFilterTypeInput = {
  equalAny?: InputMaybe<Array<NameNodeType>>;
  equalTo?: InputMaybe<NameNodeType>;
  notEqualTo?: InputMaybe<NameNodeType>;
};

export type ExistingLinesInput = {
  itemId: Scalars['String']['input'];
  returnId: Scalars['String']['input'];
};

export type FailedToFetchReportData = PrintReportErrorInterface & {
  __typename: 'FailedToFetchReportData';
  description: Scalars['String']['output'];
  errors: Scalars['JSON']['output'];
};

export enum ForeignKey {
  InvoiceId = 'invoiceId',
  ItemId = 'itemId',
  LocationId = 'locationId',
  OtherPartyId = 'otherPartyId',
  RequisitionId = 'requisitionId',
  StockLineId = 'stockLineId'
}

export type ForeignKeyError = DeleteInboundShipmentLineErrorInterface & DeleteInboundShipmentServiceLineErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & DeleteOutboundShipmentUnallocatedLineErrorInterface & DeletePrescriptionLineErrorInterface & InsertInboundShipmentLineErrorInterface & InsertInboundShipmentServiceLineErrorInterface & InsertOutboundShipmentLineErrorInterface & InsertOutboundShipmentServiceLineErrorInterface & InsertOutboundShipmentUnallocatedLineErrorInterface & InsertPrescriptionLineErrorInterface & InsertRequestRequisitionLineErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateInboundShipmentServiceLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & UpdateOutboundShipmentUnallocatedLineErrorInterface & UpdatePrescriptionLineErrorInterface & UpdateRequestRequisitionLineErrorInterface & UpdateResponseRequisitionLineErrorInterface & {
  __typename: 'ForeignKeyError';
  description: Scalars['String']['output'];
  key: ForeignKey;
};

export type FormSchemaConnector = {
  __typename: 'FormSchemaConnector';
  nodes: Array<FormSchemaNode>;
  totalCount: Scalars['Int']['output'];
};

export type FormSchemaFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export type FormSchemaNode = {
  __typename: 'FormSchemaNode';
  id: Scalars['String']['output'];
  jsonSchema: Scalars['JSON']['output'];
  type: Scalars['String']['output'];
  uiSchema: Scalars['JSON']['output'];
};

export type FormSchemaResponse = FormSchemaConnector;

export enum FormSchemaSortFieldInput {
  Id = 'id'
}

export type FormSchemaSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: FormSchemaSortFieldInput;
};

export type FullSyncStatusNode = {
  __typename: 'FullSyncStatusNode';
  error?: Maybe<SyncErrorNode>;
  integration?: Maybe<SyncStatusWithProgressNode>;
  isSyncing: Scalars['Boolean']['output'];
  lastSuccessfulSync?: Maybe<SyncStatusNode>;
  prepareInitial?: Maybe<SyncStatusNode>;
  pullCentral?: Maybe<SyncStatusWithProgressNode>;
  pullRemote?: Maybe<SyncStatusWithProgressNode>;
  pullV6?: Maybe<SyncStatusWithProgressNode>;
  push?: Maybe<SyncStatusWithProgressNode>;
  pushV6?: Maybe<SyncStatusWithProgressNode>;
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

export type GenerateInboundReturnLinesInput = {
  existingLinesInput?: InputMaybe<ExistingLinesInput>;
  /** The ids of the outbound shipment lines to generate new return lines for */
  outboundShipmentLineIds: Array<Scalars['String']['input']>;
};

export type GenerateInboundReturnLinesResponse = GeneratedInboundReturnLineConnector;

/** At least one input is required. */
export type GenerateOutboundReturnLinesInput = {
  /** Generate new return lines for all the available stock lines of a specific item */
  itemId?: InputMaybe<Scalars['String']['input']>;
  /** Include existing return lines in the response. Only has an effect when either `stock_line_ids` or `item_id` is set. */
  returnId?: InputMaybe<Scalars['String']['input']>;
  /** The stock line ids to generate new return lines for */
  stockLineIds: Array<Scalars['String']['input']>;
};

export type GenerateOutboundReturnLinesResponse = OutboundReturnLineConnector;

export type GeneratedInboundReturnLineConnector = {
  __typename: 'GeneratedInboundReturnLineConnector';
  nodes: Array<InboundReturnLineNode>;
  totalCount: Scalars['Int']['output'];
};

export type InboundInvoiceCounts = {
  __typename: 'InboundInvoiceCounts';
  created: InvoiceCountsSummary;
  notDelivered: Scalars['Int']['output'];
};

export type InboundReturnInput = {
  customerId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  inboundReturnLines: Array<InboundReturnLineInput>;
  outboundShipmentId?: InputMaybe<Scalars['String']['input']>;
};

export type InboundReturnLineInput = {
  batch?: InputMaybe<Scalars['String']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  numberOfPacksReturned: Scalars['Float']['input'];
  packSize: Scalars['Int']['input'];
  reasonId?: InputMaybe<Scalars['String']['input']>;
};

export type InboundReturnLineNode = {
  __typename: 'InboundReturnLineNode';
  batch?: Maybe<Scalars['String']['output']>;
  expiryDate?: Maybe<Scalars['NaiveDate']['output']>;
  id: Scalars['String']['output'];
  item: ItemNode;
  itemCode: Scalars['String']['output'];
  itemName: Scalars['String']['output'];
  note?: Maybe<Scalars['String']['output']>;
  numberOfPacksIssued?: Maybe<Scalars['Float']['output']>;
  numberOfPacksReturned: Scalars['Float']['output'];
  packSize: Scalars['Int']['output'];
  reasonId?: Maybe<Scalars['String']['output']>;
  stockLineId?: Maybe<Scalars['String']['output']>;
};

export type InitialisationStatusNode = {
  __typename: 'InitialisationStatusNode';
  siteName?: Maybe<Scalars['String']['output']>;
  status: InitialisationStatusType;
};

export enum InitialisationStatusType {
  Initialised = 'INITIALISED',
  Initialising = 'INITIALISING',
  PreInitialisation = 'PRE_INITIALISATION'
}

export type InitialiseSiteResponse = SyncErrorNode | SyncSettingsNode;

export type InsertAssetCatalogueItemError = {
  __typename: 'InsertAssetCatalogueItemError';
  error: InsertAssetCatalogueItemErrorInterface;
};

export type InsertAssetCatalogueItemErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertAssetCatalogueItemInput = {
  categoryId: Scalars['String']['input'];
  classId: Scalars['String']['input'];
  code: Scalars['String']['input'];
  id: Scalars['String']['input'];
  manufacturer?: InputMaybe<Scalars['String']['input']>;
  model: Scalars['String']['input'];
  subCatalogue: Scalars['String']['input'];
  typeId: Scalars['String']['input'];
};

export type InsertAssetCatalogueItemPropertyError = {
  __typename: 'InsertAssetCatalogueItemPropertyError';
  error: InsertAssetCatalogueItemPropertyErrorInterface;
};

export type InsertAssetCatalogueItemPropertyErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertAssetCatalogueItemPropertyInput = {
  catalogueItemId: Scalars['String']['input'];
  cataloguePropertyId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  valueBool?: InputMaybe<Scalars['Boolean']['input']>;
  valueFloat?: InputMaybe<Scalars['Float']['input']>;
  valueInt?: InputMaybe<Scalars['Int']['input']>;
  valueString?: InputMaybe<Scalars['String']['input']>;
};

export type InsertAssetCatalogueItemPropertyResponse = AssetCatalogueItemPropertyNode | InsertAssetCatalogueItemPropertyError;

export type InsertAssetCatalogueItemResponse = AssetCatalogueItemNode | InsertAssetCatalogueItemError;

export type InsertAssetError = {
  __typename: 'InsertAssetError';
  error: InsertAssetErrorInterface;
};

export type InsertAssetErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertAssetInput = {
  assetNumber?: InputMaybe<Scalars['String']['input']>;
  catalogueItemId?: InputMaybe<Scalars['String']['input']>;
  categoryId?: InputMaybe<Scalars['String']['input']>;
  classId?: InputMaybe<Scalars['String']['input']>;
  donorNameId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  installationDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  properties?: InputMaybe<Scalars['String']['input']>;
  replacementDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  serialNumber?: InputMaybe<Scalars['String']['input']>;
  storeId?: InputMaybe<Scalars['String']['input']>;
  typeId?: InputMaybe<Scalars['String']['input']>;
  warrantyEnd?: InputMaybe<Scalars['NaiveDate']['input']>;
  warrantyStart?: InputMaybe<Scalars['NaiveDate']['input']>;
};

export type InsertAssetLogError = {
  __typename: 'InsertAssetLogError';
  error: InsertAssetLogErrorInterface;
};

export type InsertAssetLogErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertAssetLogInput = {
  assetId: Scalars['String']['input'];
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  reasonId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<AssetLogStatusInput>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type InsertAssetLogReasonError = {
  __typename: 'InsertAssetLogReasonError';
  error: InsertAssetLogReasonErrorInterface;
};

export type InsertAssetLogReasonErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertAssetLogReasonInput = {
  assetLogStatus: AssetLogStatusInput;
  id: Scalars['String']['input'];
  reason: Scalars['String']['input'];
};

export type InsertAssetLogReasonResponse = AssetLogReasonNode | InsertAssetLogReasonError;

export type InsertAssetLogResponse = AssetLogNode | InsertAssetLogError;

export type InsertAssetResponse = AssetNode | InsertAssetError;

export type InsertBarcodeInput = {
  gtin: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  packSize?: InputMaybe<Scalars['Int']['input']>;
};

export type InsertBarcodeResponse = BarcodeNode;

export type InsertContactTraceInput = {
  /** Contact trace document data */
  data: Scalars['JSON']['input'];
  /** The patient ID the contact belongs to */
  patientId: Scalars['String']['input'];
  /** The schema id used for the encounter data */
  schemaId: Scalars['String']['input'];
  /** The contact trace document type */
  type: Scalars['String']['input'];
};

export type InsertContactTraceResponse = ContactTraceNode;

export type InsertDocumentRegistryInput = {
  category: DocumentRegistryCategoryNode;
  contextId: Scalars['String']['input'];
  documentType: Scalars['String']['input'];
  formSchemaId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type InsertDocumentResponse = DocumentRegistryNode;

export type InsertEncounterInput = {
  /** Encounter document data */
  data: Scalars['JSON']['input'];
  patientId: Scalars['String']['input'];
  /** The schema id used for the encounter data */
  schemaId: Scalars['String']['input'];
  /** The encounter type */
  type: Scalars['String']['input'];
};

export type InsertEncounterResponse = EncounterNode;

export type InsertErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertFormSchemaInput = {
  id: Scalars['String']['input'];
  jsonSchema: Scalars['JSON']['input'];
  type: Scalars['String']['input'];
  uiSchema: Scalars['JSON']['input'];
};

export type InsertFormSchemaResponse = FormSchemaNode;

export type InsertInboundReturnError = {
  __typename: 'InsertInboundReturnError';
  error: InsertInboundReturnErrorInterface;
};

export type InsertInboundReturnErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertInboundReturnResponse = InsertInboundReturnError | InvoiceNode;

export type InsertInboundShipmentError = {
  __typename: 'InsertInboundShipmentError';
  error: InsertInboundShipmentErrorInterface;
};

export type InsertInboundShipmentErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertInboundShipmentInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  otherPartyId: Scalars['String']['input'];
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type InsertInboundShipmentLineError = {
  __typename: 'InsertInboundShipmentLineError';
  error: InsertInboundShipmentLineErrorInterface;
};

export type InsertInboundShipmentLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertInboundShipmentLineInput = {
  batch?: InputMaybe<Scalars['String']['input']>;
  costPricePerPack: Scalars['Float']['input'];
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  location?: InputMaybe<NullableStringUpdate>;
  numberOfPacks: Scalars['Float']['input'];
  packSize: Scalars['Int']['input'];
  sellPricePerPack: Scalars['Float']['input'];
  taxPercentage?: InputMaybe<Scalars['Float']['input']>;
  totalBeforeTax?: InputMaybe<Scalars['Float']['input']>;
};

export type InsertInboundShipmentLineResponse = InsertInboundShipmentLineError | InvoiceLineNode;

export type InsertInboundShipmentLineResponseWithId = {
  __typename: 'InsertInboundShipmentLineResponseWithId';
  id: Scalars['String']['output'];
  response: InsertInboundShipmentLineResponse;
};

export type InsertInboundShipmentResponse = InsertInboundShipmentError | InvoiceNode;

export type InsertInboundShipmentResponseWithId = {
  __typename: 'InsertInboundShipmentResponseWithId';
  id: Scalars['String']['output'];
  response: InsertInboundShipmentResponse;
};

export type InsertInboundShipmentServiceLineError = {
  __typename: 'InsertInboundShipmentServiceLineError';
  error: InsertInboundShipmentServiceLineErrorInterface;
};

export type InsertInboundShipmentServiceLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertInboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  itemId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  taxPercentage?: InputMaybe<Scalars['Float']['input']>;
  totalBeforeTax: Scalars['Float']['input'];
};

export type InsertInboundShipmentServiceLineResponse = InsertInboundShipmentServiceLineError | InvoiceLineNode;

export type InsertInboundShipmentServiceLineResponseWithId = {
  __typename: 'InsertInboundShipmentServiceLineResponseWithId';
  id: Scalars['String']['output'];
  response: InsertInboundShipmentServiceLineResponse;
};

export type InsertInventoryAdjustmentErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertLocationError = {
  __typename: 'InsertLocationError';
  error: InsertLocationErrorInterface;
};

export type InsertLocationErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertLocationInput = {
  code: Scalars['String']['input'];
  id: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
};

export type InsertLocationResponse = InsertLocationError | LocationNode;

export type InsertOutboundReturnError = {
  __typename: 'InsertOutboundReturnError';
  error: InsertOutboundReturnErrorInterface;
};

export type InsertOutboundReturnErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertOutboundReturnResponse = InsertOutboundReturnError | InvoiceNode;

export type InsertOutboundShipmentError = {
  __typename: 'InsertOutboundShipmentError';
  error: InsertErrorInterface;
};

export type InsertOutboundShipmentInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  /** The new invoice id provided by the client */
  id: Scalars['String']['input'];
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  /** The other party must be an customer of the current store */
  otherPartyId: Scalars['String']['input'];
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type InsertOutboundShipmentLineError = {
  __typename: 'InsertOutboundShipmentLineError';
  error: InsertOutboundShipmentLineErrorInterface;
};

export type InsertOutboundShipmentLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertOutboundShipmentLineInput = {
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  numberOfPacks: Scalars['Float']['input'];
  stockLineId: Scalars['String']['input'];
  taxPercentage?: InputMaybe<Scalars['Float']['input']>;
  totalBeforeTax?: InputMaybe<Scalars['Float']['input']>;
};

export type InsertOutboundShipmentLineResponse = InsertOutboundShipmentLineError | InvoiceLineNode;

export type InsertOutboundShipmentLineResponseWithId = {
  __typename: 'InsertOutboundShipmentLineResponseWithId';
  id: Scalars['String']['output'];
  response: InsertOutboundShipmentLineResponse;
};

export type InsertOutboundShipmentResponse = InsertOutboundShipmentError | InvoiceNode | NodeError;

export type InsertOutboundShipmentResponseWithId = {
  __typename: 'InsertOutboundShipmentResponseWithId';
  id: Scalars['String']['output'];
  response: InsertOutboundShipmentResponse;
};

export type InsertOutboundShipmentServiceLineError = {
  __typename: 'InsertOutboundShipmentServiceLineError';
  error: InsertOutboundShipmentServiceLineErrorInterface;
};

export type InsertOutboundShipmentServiceLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertOutboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  itemId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  taxPercentage?: InputMaybe<Scalars['Float']['input']>;
  totalBeforeTax: Scalars['Float']['input'];
};

export type InsertOutboundShipmentServiceLineResponse = InsertOutboundShipmentServiceLineError | InvoiceLineNode;

export type InsertOutboundShipmentServiceLineResponseWithId = {
  __typename: 'InsertOutboundShipmentServiceLineResponseWithId';
  id: Scalars['String']['output'];
  response: InsertOutboundShipmentServiceLineResponse;
};

export type InsertOutboundShipmentUnallocatedLineError = {
  __typename: 'InsertOutboundShipmentUnallocatedLineError';
  error: InsertOutboundShipmentUnallocatedLineErrorInterface;
};

export type InsertOutboundShipmentUnallocatedLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertOutboundShipmentUnallocatedLineInput = {
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  quantity: Scalars['Int']['input'];
};

export type InsertOutboundShipmentUnallocatedLineResponse = InsertOutboundShipmentUnallocatedLineError | InvoiceLineNode;

export type InsertOutboundShipmentUnallocatedLineResponseWithId = {
  __typename: 'InsertOutboundShipmentUnallocatedLineResponseWithId';
  id: Scalars['String']['output'];
  response: InsertOutboundShipmentUnallocatedLineResponse;
};

export type InsertPackVariantError = {
  __typename: 'InsertPackVariantError';
  error: InsertPackVariantErrorInterface;
};

export type InsertPackVariantErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertPackVariantInput = {
  id: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  longName: Scalars['String']['input'];
  packSize: Scalars['Int']['input'];
  shortName: Scalars['String']['input'];
};

export type InsertPackVariantResponse = InsertPackVariantError | VariantNode;

export type InsertPatientInput = {
  address1?: InputMaybe<Scalars['String']['input']>;
  code: Scalars['String']['input'];
  code2?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['NaiveDate']['input']>;
  dateOfDeath?: InputMaybe<Scalars['NaiveDate']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<GenderInput>;
  id: Scalars['String']['input'];
  isDeceased?: InputMaybe<Scalars['Boolean']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type InsertPatientResponse = PatientNode;

export type InsertPluginDataInput = {
  data: Scalars['String']['input'];
  id: Scalars['String']['input'];
  pluginName: Scalars['String']['input'];
  relatedRecordId: Scalars['String']['input'];
  relatedRecordType: RelatedRecordNodeType;
};

export type InsertPluginDataResponse = PluginDataNode;

export type InsertPrescriptionError = {
  __typename: 'InsertPrescriptionError';
  error: InsertPrescriptionErrorInterface;
};

export type InsertPrescriptionErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertPrescriptionInput = {
  id: Scalars['String']['input'];
  patientId: Scalars['String']['input'];
};

export type InsertPrescriptionLineError = {
  __typename: 'InsertPrescriptionLineError';
  error: InsertPrescriptionLineErrorInterface;
};

export type InsertPrescriptionLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertPrescriptionLineInput = {
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  numberOfPacks: Scalars['Float']['input'];
  stockLineId: Scalars['String']['input'];
};

export type InsertPrescriptionLineResponse = InsertPrescriptionLineError | InvoiceLineNode;

export type InsertPrescriptionLineResponseWithId = {
  __typename: 'InsertPrescriptionLineResponseWithId';
  id: Scalars['String']['output'];
  response: InsertPrescriptionLineResponse;
};

export type InsertPrescriptionResponse = InsertPrescriptionError | InvoiceNode;

export type InsertPrescriptionResponseWithId = {
  __typename: 'InsertPrescriptionResponseWithId';
  id: Scalars['String']['output'];
  response: InsertPrescriptionResponse;
};

export type InsertProgramEnrolmentInput = {
  /** Program document data */
  data: Scalars['JSON']['input'];
  patientId: Scalars['String']['input'];
  /** The schema id used for the program data */
  schemaId: Scalars['String']['input'];
  /** The program type */
  type: Scalars['String']['input'];
};

export type InsertProgramEnrolmentResponse = ProgramEnrolmentNode;

export type InsertProgramPatientInput = {
  /** Patient document data */
  data: Scalars['JSON']['input'];
  /** The schema id used for the patient data */
  schemaId: Scalars['String']['input'];
};

export type InsertProgramPatientResponse = PatientNode;

export type InsertProgramRequestRequisitionError = {
  __typename: 'InsertProgramRequestRequisitionError';
  error: InsertProgramRequestRequisitionErrorInterface;
};

export type InsertProgramRequestRequisitionErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertProgramRequestRequisitionInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  /** Defaults to 2 weeks from now */
  expectedDeliveryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  otherPartyId: Scalars['String']['input'];
  periodId: Scalars['String']['input'];
  programOrderTypeId: Scalars['String']['input'];
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type InsertProgramRequestRequisitionResponse = InsertProgramRequestRequisitionError | RequisitionNode;

export type InsertRepackError = {
  __typename: 'InsertRepackError';
  error: InsertRepackErrorInterface;
};

export type InsertRepackErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertRepackInput = {
  newLocationId?: InputMaybe<Scalars['String']['input']>;
  newPackSize: Scalars['Int']['input'];
  numberOfPacks: Scalars['Float']['input'];
  stockLineId: Scalars['String']['input'];
};

export type InsertRepackResponse = InsertRepackError | InvoiceNode;

export type InsertRequestRequisitionError = {
  __typename: 'InsertRequestRequisitionError';
  error: InsertRequestRequisitionErrorInterface;
};

export type InsertRequestRequisitionErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertRequestRequisitionInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  /** Defaults to 2 weeks from now */
  expectedDeliveryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  maxMonthsOfStock: Scalars['Float']['input'];
  minMonthsOfStock: Scalars['Float']['input'];
  otherPartyId: Scalars['String']['input'];
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type InsertRequestRequisitionLineError = {
  __typename: 'InsertRequestRequisitionLineError';
  error: InsertRequestRequisitionLineErrorInterface;
};

export type InsertRequestRequisitionLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertRequestRequisitionLineInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  requestedQuantity?: InputMaybe<Scalars['Int']['input']>;
  requisitionId: Scalars['String']['input'];
};

export type InsertRequestRequisitionLineResponse = InsertRequestRequisitionLineError | RequisitionLineNode;

export type InsertRequestRequisitionLineResponseWithId = {
  __typename: 'InsertRequestRequisitionLineResponseWithId';
  id: Scalars['String']['output'];
  response: InsertRequestRequisitionLineResponse;
};

export type InsertRequestRequisitionResponse = InsertRequestRequisitionError | RequisitionNode;

export type InsertRequestRequisitionResponseWithId = {
  __typename: 'InsertRequestRequisitionResponseWithId';
  id: Scalars['String']['output'];
  response: InsertRequestRequisitionResponse;
};

export type InsertStockLineInput = {
  /** Empty barcode will unlink barcode from StockLine */
  barcode?: InputMaybe<Scalars['String']['input']>;
  batch?: InputMaybe<Scalars['String']['input']>;
  costPricePerPack: Scalars['Float']['input'];
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  inventoryAdjustmentReasonId?: InputMaybe<Scalars['String']['input']>;
  itemId: Scalars['String']['input'];
  location?: InputMaybe<NullableStringUpdate>;
  numberOfPacks: Scalars['Float']['input'];
  onHold: Scalars['Boolean']['input'];
  packSize: Scalars['Int']['input'];
  sellPricePerPack: Scalars['Float']['input'];
};

export type InsertStockLineLineResponse = StockLineNode;

export type InsertStocktakeInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  expiresBefore?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  isLocked?: InputMaybe<Scalars['Boolean']['input']>;
  itemsHaveStock?: InputMaybe<Scalars['Boolean']['input']>;
  location?: InputMaybe<NullableStringUpdate>;
  masterListId?: InputMaybe<Scalars['String']['input']>;
  stocktakeDate?: InputMaybe<Scalars['NaiveDate']['input']>;
};

export type InsertStocktakeLineError = {
  __typename: 'InsertStocktakeLineError';
  error: InsertStocktakeLineErrorInterface;
};

export type InsertStocktakeLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type InsertStocktakeLineInput = {
  batch?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  costPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  countedNumberOfPacks?: InputMaybe<Scalars['Float']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  inventoryAdjustmentReasonId?: InputMaybe<Scalars['String']['input']>;
  itemId?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<NullableStringUpdate>;
  note?: InputMaybe<Scalars['String']['input']>;
  packSize?: InputMaybe<Scalars['Int']['input']>;
  sellPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  stockLineId?: InputMaybe<Scalars['String']['input']>;
  stocktakeId: Scalars['String']['input'];
};

export type InsertStocktakeLineResponse = InsertStocktakeLineError | StocktakeLineNode;

export type InsertStocktakeLineResponseWithId = {
  __typename: 'InsertStocktakeLineResponseWithId';
  id: Scalars['String']['output'];
  response: InsertStocktakeLineResponse;
};

export type InsertStocktakeResponse = StocktakeNode;

export type InsertStocktakeResponseWithId = {
  __typename: 'InsertStocktakeResponseWithId';
  id: Scalars['String']['output'];
  response: InsertStocktakeResponse;
};

export type InternalError = InsertAssetCatalogueItemErrorInterface & InsertAssetCatalogueItemPropertyErrorInterface & InsertAssetErrorInterface & InsertAssetLogErrorInterface & InsertAssetLogReasonErrorInterface & InsertLocationErrorInterface & RefreshTokenErrorInterface & UpdateAssetErrorInterface & UpdateLocationErrorInterface & UpdateSensorErrorInterface & {
  __typename: 'InternalError';
  description: Scalars['String']['output'];
  fullError: Scalars['String']['output'];
};

export type InvalidCredentials = AuthTokenErrorInterface & UpdateUserErrorInterface & {
  __typename: 'InvalidCredentials';
  description: Scalars['String']['output'];
};

export type InvalidToken = RefreshTokenErrorInterface & {
  __typename: 'InvalidToken';
  description: Scalars['String']['output'];
};

export type InventoryAdjustmentReasonConnector = {
  __typename: 'InventoryAdjustmentReasonConnector';
  nodes: Array<InventoryAdjustmentReasonNode>;
  totalCount: Scalars['Int']['output'];
};

export type InventoryAdjustmentReasonFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<EqualFilterInventoryAdjustmentReasonTypeInput>;
};

export type InventoryAdjustmentReasonNode = {
  __typename: 'InventoryAdjustmentReasonNode';
  id: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  reason: Scalars['String']['output'];
  type: InventoryAdjustmentReasonNodeType;
};

export enum InventoryAdjustmentReasonNodeType {
  Negative = 'NEGATIVE',
  Positive = 'POSITIVE'
}

export type InventoryAdjustmentReasonResponse = InventoryAdjustmentReasonConnector;

export enum InventoryAdjustmentReasonSortFieldInput {
  Id = 'id',
  InventoryAdjustmentReasonType = 'inventoryAdjustmentReasonType',
  Reason = 'reason'
}

export type InventoryAdjustmentReasonSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: InventoryAdjustmentReasonSortFieldInput;
};

export type InvoiceConnector = {
  __typename: 'InvoiceConnector';
  nodes: Array<InvoiceNode>;
  totalCount: Scalars['Int']['output'];
};

export type InvoiceCounts = {
  __typename: 'InvoiceCounts';
  inbound: InboundInvoiceCounts;
  outbound: OutboundInvoiceCounts;
};

export type InvoiceCountsSummary = {
  __typename: 'InvoiceCountsSummary';
  thisWeek: Scalars['Int']['output'];
  today: Scalars['Int']['output'];
};

export type InvoiceFilterInput = {
  allocatedDatetime?: InputMaybe<DatetimeFilterInput>;
  colour?: InputMaybe<EqualFilterStringInput>;
  comment?: InputMaybe<StringFilterInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  deliveredDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  invoiceNumber?: InputMaybe<EqualFilterBigNumberInput>;
  linkedInvoiceId?: InputMaybe<EqualFilterStringInput>;
  nameId?: InputMaybe<EqualFilterStringInput>;
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  otherPartyId?: InputMaybe<EqualFilterStringInput>;
  otherPartyName?: InputMaybe<StringFilterInput>;
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

export type InvoiceIsNotEditable = UpdateErrorInterface & UpdateNameErrorInterface & UpdatePrescriptionErrorInterface & {
  __typename: 'InvoiceIsNotEditable';
  description: Scalars['String']['output'];
};

export type InvoiceLineConnector = {
  __typename: 'InvoiceLineConnector';
  nodes: Array<InvoiceLineNode>;
  totalCount: Scalars['Int']['output'];
};

export type InvoiceLineFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  invoiceId?: InputMaybe<EqualFilterStringInput>;
  invoiceStatus?: InputMaybe<EqualFilterInvoiceStatusInput>;
  invoiceType?: InputMaybe<EqualFilterInvoiceTypeInput>;
  itemId?: InputMaybe<EqualFilterStringInput>;
  locationId?: InputMaybe<EqualFilterStringInput>;
  numberOfPacks?: InputMaybe<EqualFilterBigFloatingNumberInput>;
  requisitionId?: InputMaybe<EqualFilterStringInput>;
  stockLineId?: InputMaybe<EqualFilterStringInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterInvoiceLineTypeInput>;
};

export type InvoiceLineNode = {
  __typename: 'InvoiceLineNode';
  batch?: Maybe<Scalars['String']['output']>;
  costPricePerPack: Scalars['Float']['output'];
  expiryDate?: Maybe<Scalars['NaiveDate']['output']>;
  foreignCurrencyPriceBeforeTax?: Maybe<Scalars['Float']['output']>;
  id: Scalars['String']['output'];
  invoiceId: Scalars['String']['output'];
  item: ItemNode;
  itemCode: Scalars['String']['output'];
  itemId: Scalars['String']['output'];
  itemName: Scalars['String']['output'];
  location?: Maybe<LocationNode>;
  locationId?: Maybe<Scalars['String']['output']>;
  locationName?: Maybe<Scalars['String']['output']>;
  note?: Maybe<Scalars['String']['output']>;
  numberOfPacks: Scalars['Float']['output'];
  packSize: Scalars['Int']['output'];
  pricing: PricingNode;
  returnReasonId?: Maybe<Scalars['String']['output']>;
  sellPricePerPack: Scalars['Float']['output'];
  stockLine?: Maybe<StockLineNode>;
  taxPercentage?: Maybe<Scalars['Float']['output']>;
  totalAfterTax: Scalars['Float']['output'];
  totalBeforeTax: Scalars['Float']['output'];
  type: InvoiceLineNodeType;
};

export enum InvoiceLineNodeType {
  Service = 'SERVICE',
  StockIn = 'STOCK_IN',
  StockOut = 'STOCK_OUT',
  UnallocatedStock = 'UNALLOCATED_STOCK'
}

export enum InvoiceLineSortFieldInput {
  Batch = 'batch',
  ExpiryDate = 'expiryDate',
  ItemCode = 'itemCode',
  ItemName = 'itemName',
  LocationName = 'locationName',
  PackSize = 'packSize'
}

export type InvoiceLineSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: InvoiceLineSortFieldInput;
};

export type InvoiceLinesResponse = InvoiceLineConnector;

export type InvoiceNode = {
  __typename: 'InvoiceNode';
  allocatedDatetime?: Maybe<Scalars['DateTime']['output']>;
  clinician?: Maybe<ClinicianNode>;
  clinicianId?: Maybe<Scalars['String']['output']>;
  colour?: Maybe<Scalars['String']['output']>;
  comment?: Maybe<Scalars['String']['output']>;
  createdDatetime: Scalars['DateTime']['output'];
  currency?: Maybe<CurrencyNode>;
  currencyRate: Scalars['Float']['output'];
  deliveredDatetime?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  invoiceNumber: Scalars['Int']['output'];
  lines: InvoiceLineConnector;
  /** Inbound Shipment <-> Outbound Shipment, where Inbound Shipment originated from Outbound Shipment */
  linkedShipment?: Maybe<InvoiceNode>;
  onHold: Scalars['Boolean']['output'];
  /**
   * Inbound Shipment that is the origin of this Outbound Return
   * OR Outbound Shipment that is the origin of this Inbound Return
   */
  originalShipment?: Maybe<InvoiceNode>;
  otherParty: NameNode;
  otherPartyId: Scalars['String']['output'];
  otherPartyName: Scalars['String']['output'];
  otherPartyStore?: Maybe<StoreNode>;
  patient?: Maybe<PatientNode>;
  pickedDatetime?: Maybe<Scalars['DateTime']['output']>;
  pricing: PricingNode;
  /**
   * Response Requisition that is the origin of this Outbound Shipment
   * Or Request Requisition for Inbound Shipment that Originated from Outbound Shipment (linked through Response Requisition)
   */
  requisition?: Maybe<RequisitionNode>;
  shippedDatetime?: Maybe<Scalars['DateTime']['output']>;
  status: InvoiceNodeStatus;
  taxPercentage?: Maybe<Scalars['Float']['output']>;
  theirReference?: Maybe<Scalars['String']['output']>;
  transportReference?: Maybe<Scalars['String']['output']>;
  type: InvoiceNodeType;
  /**
   * User that last edited invoice, if user is not found in system default unknown user is returned
   * Null is returned for transfers, where inbound has not been edited yet
   * Null is also returned for system created invoices like inventory adjustments
   */
  user?: Maybe<UserNode>;
  verifiedDatetime?: Maybe<Scalars['DateTime']['output']>;
};


export type InvoiceNodeOtherPartyArgs = {
  storeId: Scalars['String']['input'];
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
  InboundReturn = 'INBOUND_RETURN',
  InboundShipment = 'INBOUND_SHIPMENT',
  InventoryAddition = 'INVENTORY_ADDITION',
  InventoryReduction = 'INVENTORY_REDUCTION',
  OutboundReturn = 'OUTBOUND_RETURN',
  OutboundShipment = 'OUTBOUND_SHIPMENT',
  Prescription = 'PRESCRIPTION',
  Repack = 'REPACK'
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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: InvoiceSortFieldInput;
};

export type InvoicesResponse = InvoiceConnector;

export type ItemChartNode = {
  __typename: 'ItemChartNode';
  calculationDate?: Maybe<Scalars['NaiveDate']['output']>;
  consumptionHistory?: Maybe<ConsumptionHistoryConnector>;
  stockEvolution?: Maybe<StockEvolutionConnector>;
  suggestedQuantityCalculation: SuggestedQuantityCalculationNode;
};

export type ItemConnector = {
  __typename: 'ItemConnector';
  nodes: Array<ItemNode>;
  totalCount: Scalars['Int']['output'];
};

export type ItemCounts = {
  __typename: 'ItemCounts';
  itemCounts: ItemCountsResponse;
};

export type ItemCountsResponse = {
  __typename: 'ItemCountsResponse';
  lowStock: Scalars['Int']['output'];
  moreThanSixMonthsStock: Scalars['Int']['output'];
  noStock: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type ItemFilterInput = {
  code?: InputMaybe<StringFilterInput>;
  codeOrName?: InputMaybe<StringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isVisible?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StringFilterInput>;
  type?: InputMaybe<EqualFilterItemTypeInput>;
};

export type ItemNode = {
  __typename: 'ItemNode';
  atcCategory: Scalars['String']['output'];
  availableBatches: StockLineConnector;
  availableStockOnHand: Scalars['Int']['output'];
  code: Scalars['String']['output'];
  ddd: Scalars['String']['output'];
  defaultPackSize: Scalars['Int']['output'];
  doses: Scalars['Int']['output'];
  id: Scalars['String']['output'];
  isVaccine: Scalars['Boolean']['output'];
  margin: Scalars['Float']['output'];
  msupplyUniversalCode: Scalars['String']['output'];
  msupplyUniversalName: Scalars['String']['output'];
  name: Scalars['String']['output'];
  outerPackSize: Scalars['Int']['output'];
  stats: ItemStatsNode;
  strength: Scalars['String']['output'];
  type: ItemNodeType;
  unitName?: Maybe<Scalars['String']['output']>;
  volumePerOuterPack: Scalars['Float']['output'];
  volumePerPack: Scalars['Float']['output'];
  weight: Scalars['Float']['output'];
};


export type ItemNodeAvailableBatchesArgs = {
  storeId: Scalars['String']['input'];
};


export type ItemNodeAvailableStockOnHandArgs = {
  storeId: Scalars['String']['input'];
};


export type ItemNodeStatsArgs = {
  amcLookbackMonths?: InputMaybe<Scalars['Int']['input']>;
  storeId: Scalars['String']['input'];
};

export enum ItemNodeType {
  NonStock = 'NON_STOCK',
  Service = 'SERVICE',
  Stock = 'STOCK'
}

export type ItemPackVariantConnector = {
  __typename: 'ItemPackVariantConnector';
  nodes: Array<ItemPackVariantNode>;
  totalCount: Scalars['Int']['output'];
};

export type ItemPackVariantNode = {
  __typename: 'ItemPackVariantNode';
  itemId: Scalars['String']['output'];
  mostUsedPackVariantId: Scalars['String']['output'];
  packVariants: Array<VariantNode>;
};

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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ItemSortFieldInput;
};

export type ItemStatsNode = {
  __typename: 'ItemStatsNode';
  availableMonthsOfStockOnHand?: Maybe<Scalars['Float']['output']>;
  availableStockOnHand: Scalars['Int']['output'];
  averageMonthlyConsumption: Scalars['Float']['output'];
};

export type ItemsResponse = ItemConnector;

export type JsonschemaNode = {
  __typename: 'JsonschemaNode';
  id: Scalars['String']['output'];
  jsonSchema: Scalars['JSON']['output'];
};

export type LabelPrinterSettingNode = {
  __typename: 'LabelPrinterSettingNode';
  address: Scalars['String']['output'];
  labelHeight: Scalars['Int']['output'];
  labelWidth: Scalars['Int']['output'];
  port: Scalars['Int']['output'];
};

export type LabelPrinterSettingsInput = {
  address: Scalars['String']['input'];
  labelHeight: Scalars['Int']['input'];
  labelWidth: Scalars['Int']['input'];
  port: Scalars['Int']['input'];
};

export type LabelPrinterUpdateResult = {
  __typename: 'LabelPrinterUpdateResult';
  success: Scalars['Boolean']['output'];
};

export enum LanguageType {
  English = 'ENGLISH',
  French = 'FRENCH',
  Khmer = 'KHMER',
  Laos = 'LAOS',
  Portuguese = 'PORTUGUESE',
  Russian = 'RUSSIAN',
  Spanish = 'SPANISH',
  Tetum = 'TETUM'
}

export type LedgerConnector = {
  __typename: 'LedgerConnector';
  nodes: Array<LedgerNode>;
  totalCount: Scalars['Int']['output'];
};

export type LedgerFilterInput = {
  stockLineId?: InputMaybe<EqualFilterStringInput>;
};

export type LedgerNode = {
  __typename: 'LedgerNode';
  datetime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  invoiceType: InvoiceNodeType;
  itemId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  reason?: Maybe<Scalars['String']['output']>;
  stockLineId?: Maybe<Scalars['String']['output']>;
  storeId: Scalars['String']['output'];
};

export type LedgerResponse = LedgerConnector;

export enum LedgerSortFieldInput {
  Datetime = 'datetime',
  InvoiceType = 'invoiceType',
  ItemId = 'itemId',
  Name = 'name',
  Quantity = 'quantity',
  StockLineId = 'stockLineId'
}

export type LedgerSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the
   * default is ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: LedgerSortFieldInput;
};

export type LinkPatientPatientToStoreError = {
  __typename: 'LinkPatientPatientToStoreError';
  error: LinkPatientPatientToStoreErrorInterface;
};

export type LinkPatientPatientToStoreErrorInterface = {
  description: Scalars['String']['output'];
};

export type LinkPatientToStoreResponse = LinkPatientPatientToStoreError | NameStoreJoinNode;

export type LocationConnector = {
  __typename: 'LocationConnector';
  nodes: Array<LocationNode>;
  totalCount: Scalars['Int']['output'];
};

export type LocationFilterInput = {
  assignedToAsset?: InputMaybe<Scalars['Boolean']['input']>;
  code?: InputMaybe<StringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  storeId?: InputMaybe<EqualFilterStringInput>;
};

export type LocationInUse = DeleteLocationErrorInterface & {
  __typename: 'LocationInUse';
  description: Scalars['String']['output'];
  invoiceLines: InvoiceLineConnector;
  stockLines: StockLineConnector;
};

export type LocationIsOnHold = InsertOutboundShipmentLineErrorInterface & InsertPrescriptionLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdatePrescriptionLineErrorInterface & {
  __typename: 'LocationIsOnHold';
  description: Scalars['String']['output'];
};

export type LocationNode = {
  __typename: 'LocationNode';
  code: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  onHold: Scalars['Boolean']['output'];
  stock: StockLineConnector;
};

export type LocationNotFound = InsertOutboundShipmentLineErrorInterface & InsertPrescriptionLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdatePrescriptionLineErrorInterface & {
  __typename: 'LocationNotFound';
  description: Scalars['String']['output'];
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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: LocationSortFieldInput;
};

export type LocationsResponse = LocationConnector;

export enum LogLevelEnum {
  Debug = 'DEBUG',
  Error = 'ERROR',
  Info = 'INFO',
  Trace = 'TRACE',
  Warn = 'WARN'
}

export type LogLevelNode = {
  __typename: 'LogLevelNode';
  level: LogLevelEnum;
};

export type LogNode = {
  __typename: 'LogNode';
  fileContent?: Maybe<Array<Scalars['String']['output']>>;
  fileNames?: Maybe<Array<Scalars['String']['output']>>;
};

export type Logout = {
  __typename: 'Logout';
  /** User id of the logged out user */
  userId: Scalars['String']['output'];
};

export type LogoutResponse = Logout;

export type MasterListConnector = {
  __typename: 'MasterListConnector';
  nodes: Array<MasterListNode>;
  totalCount: Scalars['Int']['output'];
};

export type MasterListFilterInput = {
  code?: InputMaybe<StringFilterInput>;
  description?: InputMaybe<StringFilterInput>;
  existsForName?: InputMaybe<StringFilterInput>;
  existsForNameId?: InputMaybe<EqualFilterStringInput>;
  existsForStoreId?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  isProgram?: InputMaybe<Scalars['Boolean']['input']>;
  itemId?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
};

export type MasterListLineConnector = {
  __typename: 'MasterListLineConnector';
  nodes: Array<MasterListLineNode>;
  totalCount: Scalars['Int']['output'];
};

export type MasterListLineFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  itemId?: InputMaybe<EqualFilterStringInput>;
  masterListId?: InputMaybe<EqualFilterStringInput>;
};

export type MasterListLineNode = {
  __typename: 'MasterListLineNode';
  id: Scalars['String']['output'];
  item: ItemNode;
  itemId: Scalars['String']['output'];
};

export enum MasterListLineSortFieldInput {
  Code = 'code',
  Name = 'name'
}

export type MasterListLineSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: MasterListLineSortFieldInput;
};

export type MasterListLinesResponse = MasterListLineConnector;

export type MasterListNode = {
  __typename: 'MasterListNode';
  code: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['String']['output'];
  linesCount?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
};

export type MasterListNotFoundForThisName = AddToOutboundShipmentFromMasterListErrorInterface & {
  __typename: 'MasterListNotFoundForThisName';
  description: Scalars['String']['output'];
};

export type MasterListNotFoundForThisStore = AddFromMasterListErrorInterface & AddToInboundShipmentFromMasterListErrorInterface & {
  __typename: 'MasterListNotFoundForThisStore';
  description: Scalars['String']['output'];
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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: MasterListSortFieldInput;
};

export type MasterListsResponse = MasterListConnector;

export type MaxOrdersReachedForPeriod = InsertProgramRequestRequisitionErrorInterface & {
  __typename: 'MaxOrdersReachedForPeriod';
  description: Scalars['String']['output'];
};

export type MergeRequiredError = UpdateDocumentErrorInterface & {
  __typename: 'MergeRequiredError';
  autoMerge?: Maybe<RawDocumentNode>;
  description: Scalars['String']['output'];
};

export type MissingCredentials = UpdateUserErrorInterface & {
  __typename: 'MissingCredentials';
  description: Scalars['String']['output'];
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
  batchPrescription: BatchPrescriptionResponse;
  batchRequestRequisition: BatchRequestRequisitionResponse;
  batchStocktake: BatchStocktakeResponse;
  centralServer: CentralServerMutationNode;
  createInventoryAdjustment: CreateInventoryAdjustmentResponse;
  /**
   * Create shipment for response requisition
   * Will create Outbound Shipment with placeholder lines for each requisition line
   * placeholder line quantity will be set to requisitionLine.supply - all linked outbound shipments
   * lines quantity (placeholder and filled) for requisitionLine.item
   */
  createRequisitionShipment: CreateRequisitionShipmentResponse;
  deleteAsset: DeleteAssetResponse;
  deleteInboundReturn: DeleteInboundReturnResponse;
  deleteInboundShipment: DeleteInboundShipmentResponse;
  deleteInboundShipmentLine: DeleteInboundShipmentLineResponse;
  deleteInboundShipmentServiceLine: DeleteInboundShipmentServiceLineResponse;
  deleteLocation: DeleteLocationResponse;
  deleteOutboundReturn: DeleteOutboundReturnResponse;
  deleteOutboundShipment: DeleteOutboundShipmentResponse;
  deleteOutboundShipmentLine: DeleteOutboundShipmentLineResponse;
  deleteOutboundShipmentServiceLine: DeleteOutboundShipmentServiceLineResponse;
  deleteOutboundShipmentUnallocatedLine: DeleteOutboundShipmentUnallocatedLineResponse;
  deletePrescription: DeletePrescriptionResponse;
  deletePrescriptionLine: DeletePrescriptionLineResponse;
  deleteRequestRequisition: DeleteRequestRequisitionResponse;
  deleteRequestRequisitionLine: DeleteRequestRequisitionLineResponse;
  deleteStocktake: DeleteStocktakeResponse;
  deleteStocktakeLine: DeleteStocktakeLineResponse;
  initialiseSite: InitialiseSiteResponse;
  insertAsset: InsertAssetResponse;
  insertAssetLog: InsertAssetLogResponse;
  insertBarcode: InsertBarcodeResponse;
  insertContactTrace: InsertContactTraceResponse;
  insertDocumentRegistry: InsertDocumentResponse;
  insertEncounter: InsertEncounterResponse;
  insertFormSchema: InsertFormSchemaResponse;
  insertInboundReturn: InsertInboundReturnResponse;
  insertInboundShipment: InsertInboundShipmentResponse;
  insertInboundShipmentLine: InsertInboundShipmentLineResponse;
  insertInboundShipmentServiceLine: InsertInboundShipmentServiceLineResponse;
  insertLocation: InsertLocationResponse;
  insertOutboundReturn: InsertOutboundReturnResponse;
  insertOutboundShipment: InsertOutboundShipmentResponse;
  insertOutboundShipmentLine: InsertOutboundShipmentLineResponse;
  insertOutboundShipmentServiceLine: InsertOutboundShipmentServiceLineResponse;
  insertOutboundShipmentUnallocatedLine: InsertOutboundShipmentUnallocatedLineResponse;
  /** Inserts a new patient (without document data) */
  insertPatient: InsertPatientResponse;
  insertPluginData: InsertPluginDataResponse;
  insertPrescription: InsertPrescriptionResponse;
  insertPrescriptionLine: InsertPrescriptionLineResponse;
  /**
   * Enrols a patient into a program by adding a program document to the patient's documents.
   * Every patient can only have one program document of each program type.
   */
  insertProgramEnrolment: InsertProgramEnrolmentResponse;
  /**
   * Inserts a new program patient, i.e. a patient that can contain additional information stored
   * in a document.
   */
  insertProgramPatient: InsertProgramPatientResponse;
  insertProgramRequestRequisition: InsertProgramRequestRequisitionResponse;
  insertRepack: InsertRepackResponse;
  insertRequestRequisition: InsertRequestRequisitionResponse;
  insertRequestRequisitionLine: InsertRequestRequisitionLineResponse;
  insertStockLine: InsertStockLineLineResponse;
  insertStocktake: InsertStocktakeResponse;
  insertStocktakeLine: InsertStocktakeLineResponse;
  /** Links a patient to a store and thus effectively to a site */
  linkPatientToStore: LinkPatientToStoreResponse;
  manualSync: Scalars['String']['output'];
  /** Set supply quantity to requested quantity */
  supplyRequestedQuantity: SupplyRequestedQuantityResponse;
  updateAsset: UpdateAssetResponse;
  updateContactTrace: UpdateContactTraceResponse;
  updateDisplaySettings: UpdateDisplaySettingsResponse;
  updateDocument: UpdateDocumentResponse;
  updateEncounter: UpdateEncounterResponse;
  updateInboundReturn: UpdateInboundReturnResponse;
  updateInboundReturnLines: UpdateInboundReturnLinesResponse;
  updateInboundShipment: UpdateInboundShipmentResponse;
  updateInboundShipmentLine: UpdateInboundShipmentLineResponse;
  updateInboundShipmentServiceLine: UpdateInboundShipmentServiceLineResponse;
  updateLabelPrinterSettings: UpdateLabelPrinterSettingsResponse;
  updateLocation: UpdateLocationResponse;
  updateLogLevel: UpsertLogLevelResponse;
  updateOutboundReturn: UpdateOutboundReturnResponse;
  updateOutboundReturnLines: UpdateOutboundReturnLinesResponse;
  updateOutboundShipment: UpdateOutboundShipmentResponse;
  updateOutboundShipmentLine: UpdateOutboundShipmentLineResponse;
  updateOutboundShipmentName: UpdateOutboundShipmentNameResponse;
  updateOutboundShipmentServiceLine: UpdateOutboundShipmentServiceLineResponse;
  updateOutboundShipmentUnallocatedLine: UpdateOutboundShipmentUnallocatedLineResponse;
  /** Updates a new patient (without document data) */
  updatePatient: UpdatePatientResponse;
  updatePluginData: UpdatePluginDataResponse;
  updatePrescription: UpdatePrescriptionResponse;
  updatePrescriptionLine: UpdatePrescriptionLineResponse;
  /** Updates an existing program document belonging to a patient. */
  updateProgramEnrolment: UpdateProgramEnrolmentResponse;
  /**
   * Updates a new program patient, i.e. a patient the can contain additional information stored
   * in a document.
   */
  updateProgramPatient: UpdateProgramPatientResponse;
  updateRequestRequisition: UpdateRequestRequisitionResponse;
  updateRequestRequisitionLine: UpdateRequestRequisitionLineResponse;
  updateResponseRequisition: UpdateResponseRequisitionResponse;
  updateResponseRequisitionLine: UpdateResponseRequisitionLineResponse;
  updateSensor: UpdateSensorResponse;
  updateStockLine: UpdateStockLineLineResponse;
  updateStocktake: UpdateStocktakeResponse;
  updateStocktakeLine: UpdateStocktakeLineResponse;
  updateSyncSettings: UpdateSyncSettingsResponse;
  updateTemperatureBreach: UpdateTemperatureBreachResponse;
  updateUser: UpdateUserResponse;
  /** Set requested for each line in request requisition to calculated */
  useSuggestedQuantity: UseSuggestedQuantityResponse;
};


export type MutationsAddFromMasterListArgs = {
  input: AddFromMasterListInput;
  storeId: Scalars['String']['input'];
};


export type MutationsAddToInboundShipmentFromMasterListArgs = {
  input: AddToShipmentFromMasterListInput;
  storeId: Scalars['String']['input'];
};


export type MutationsAddToOutboundShipmentFromMasterListArgs = {
  input: AddToShipmentFromMasterListInput;
  storeId: Scalars['String']['input'];
};


export type MutationsAllocateOutboundShipmentUnallocatedLineArgs = {
  lineId: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type MutationsAllocateProgramNumberArgs = {
  input: AllocateProgramNumberInput;
  storeId: Scalars['String']['input'];
};


export type MutationsBatchInboundShipmentArgs = {
  input: BatchInboundShipmentInput;
  storeId: Scalars['String']['input'];
};


export type MutationsBatchOutboundShipmentArgs = {
  input: BatchOutboundShipmentInput;
  storeId: Scalars['String']['input'];
};


export type MutationsBatchPrescriptionArgs = {
  input: BatchPrescriptionInput;
  storeId: Scalars['String']['input'];
};


export type MutationsBatchRequestRequisitionArgs = {
  input: BatchRequestRequisitionInput;
  storeId: Scalars['String']['input'];
};


export type MutationsBatchStocktakeArgs = {
  input: BatchStocktakeInput;
  storeId: Scalars['String']['input'];
};


export type MutationsCreateInventoryAdjustmentArgs = {
  input: CreateInventoryAdjustmentInput;
  storeId: Scalars['String']['input'];
};


export type MutationsCreateRequisitionShipmentArgs = {
  input: CreateRequisitionShipmentInput;
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteAssetArgs = {
  assetId: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteInboundReturnArgs = {
  id: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteInboundShipmentArgs = {
  input: DeleteInboundShipmentInput;
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteInboundShipmentLineArgs = {
  input: DeleteInboundShipmentLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteInboundShipmentServiceLineArgs = {
  input: DeleteInboundShipmentServiceLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteLocationArgs = {
  input: DeleteLocationInput;
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteOutboundReturnArgs = {
  id: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteOutboundShipmentArgs = {
  id: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteOutboundShipmentLineArgs = {
  input: DeleteOutboundShipmentLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteOutboundShipmentServiceLineArgs = {
  input: DeleteOutboundShipmentServiceLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteOutboundShipmentUnallocatedLineArgs = {
  input: DeleteOutboundShipmentUnallocatedLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsDeletePrescriptionArgs = {
  id: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type MutationsDeletePrescriptionLineArgs = {
  input: DeletePrescriptionLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteRequestRequisitionArgs = {
  input: DeleteRequestRequisitionInput;
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteRequestRequisitionLineArgs = {
  input: DeleteRequestRequisitionLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteStocktakeArgs = {
  input: DeleteStocktakeInput;
  storeId: Scalars['String']['input'];
};


export type MutationsDeleteStocktakeLineArgs = {
  input: DeleteStocktakeLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInitialiseSiteArgs = {
  input: SyncSettingsInput;
};


export type MutationsInsertAssetArgs = {
  input: InsertAssetInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertAssetLogArgs = {
  input: InsertAssetLogInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertBarcodeArgs = {
  input: InsertBarcodeInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertContactTraceArgs = {
  input: InsertContactTraceInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertDocumentRegistryArgs = {
  input: InsertDocumentRegistryInput;
};


export type MutationsInsertEncounterArgs = {
  input: InsertEncounterInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertFormSchemaArgs = {
  input: InsertFormSchemaInput;
};


export type MutationsInsertInboundReturnArgs = {
  input: InboundReturnInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertInboundShipmentArgs = {
  input: InsertInboundShipmentInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertInboundShipmentLineArgs = {
  input: InsertInboundShipmentLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertInboundShipmentServiceLineArgs = {
  input: InsertInboundShipmentServiceLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertLocationArgs = {
  input: InsertLocationInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertOutboundReturnArgs = {
  input: OutboundReturnInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertOutboundShipmentArgs = {
  input: InsertOutboundShipmentInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertOutboundShipmentLineArgs = {
  input: InsertOutboundShipmentLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertOutboundShipmentServiceLineArgs = {
  input: InsertOutboundShipmentServiceLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertOutboundShipmentUnallocatedLineArgs = {
  input: InsertOutboundShipmentUnallocatedLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertPatientArgs = {
  input: InsertPatientInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertPluginDataArgs = {
  input: InsertPluginDataInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertPrescriptionArgs = {
  input: InsertPrescriptionInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertPrescriptionLineArgs = {
  input: InsertPrescriptionLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertProgramEnrolmentArgs = {
  input: InsertProgramEnrolmentInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertProgramPatientArgs = {
  input: InsertProgramPatientInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertProgramRequestRequisitionArgs = {
  input: InsertProgramRequestRequisitionInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertRepackArgs = {
  input: InsertRepackInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertRequestRequisitionArgs = {
  input: InsertRequestRequisitionInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertRequestRequisitionLineArgs = {
  input: InsertRequestRequisitionLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertStockLineArgs = {
  input: InsertStockLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertStocktakeArgs = {
  input: InsertStocktakeInput;
  storeId: Scalars['String']['input'];
};


export type MutationsInsertStocktakeLineArgs = {
  input: InsertStocktakeLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsLinkPatientToStoreArgs = {
  nameId: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type MutationsSupplyRequestedQuantityArgs = {
  input: SupplyRequestedQuantityInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateAssetArgs = {
  input: UpdateAssetInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateContactTraceArgs = {
  input: UpdateContactTraceInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateDisplaySettingsArgs = {
  input: DisplaySettingsInput;
};


export type MutationsUpdateDocumentArgs = {
  input: UpdateDocumentInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateEncounterArgs = {
  input: UpdateEncounterInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateInboundReturnArgs = {
  input: UpdateInboundReturnInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateInboundReturnLinesArgs = {
  input: UpdateInboundReturnLinesInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateInboundShipmentArgs = {
  input: UpdateInboundShipmentInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateInboundShipmentLineArgs = {
  input: UpdateInboundShipmentLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateInboundShipmentServiceLineArgs = {
  input: UpdateInboundShipmentServiceLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateLabelPrinterSettingsArgs = {
  input: LabelPrinterSettingsInput;
};


export type MutationsUpdateLocationArgs = {
  input: UpdateLocationInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateLogLevelArgs = {
  input: UpsertLogLevelInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateOutboundReturnArgs = {
  input: UpdateOutboundReturnInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateOutboundReturnLinesArgs = {
  input: UpdateOutboundReturnLinesInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateOutboundShipmentArgs = {
  input: UpdateOutboundShipmentInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateOutboundShipmentLineArgs = {
  input: UpdateOutboundShipmentLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateOutboundShipmentNameArgs = {
  input: UpdateOutboundShipmentNameInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateOutboundShipmentServiceLineArgs = {
  input: UpdateOutboundShipmentServiceLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateOutboundShipmentUnallocatedLineArgs = {
  input: UpdateOutboundShipmentUnallocatedLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdatePatientArgs = {
  input: UpdatePatientInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdatePluginDataArgs = {
  input: UpdatePluginDataInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdatePrescriptionArgs = {
  input: UpdatePrescriptionInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdatePrescriptionLineArgs = {
  input: UpdatePrescriptionLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateProgramEnrolmentArgs = {
  input: UpdateProgramEnrolmentInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateProgramPatientArgs = {
  input: UpdateProgramPatientInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateRequestRequisitionArgs = {
  input: UpdateRequestRequisitionInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateRequestRequisitionLineArgs = {
  input: UpdateRequestRequisitionLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateResponseRequisitionArgs = {
  input: UpdateResponseRequisitionInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateResponseRequisitionLineArgs = {
  input: UpdateResponseRequisitionLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateSensorArgs = {
  input: UpdateSensorInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateStockLineArgs = {
  input: UpdateStockLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateStocktakeArgs = {
  input: UpdateStocktakeInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateStocktakeLineArgs = {
  input: UpdateStocktakeLineInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUpdateSyncSettingsArgs = {
  input: SyncSettingsInput;
};


export type MutationsUpdateTemperatureBreachArgs = {
  input: UpdateTemperatureBreachInput;
  storeId: Scalars['String']['input'];
};


export type MutationsUseSuggestedQuantityArgs = {
  input: UseSuggestedQuantityInput;
  storeId: Scalars['String']['input'];
};

export type NameConnector = {
  __typename: 'NameConnector';
  nodes: Array<NameNode>;
  totalCount: Scalars['Int']['output'];
};

export type NameFilterInput = {
  address1?: InputMaybe<StringFilterInput>;
  address2?: InputMaybe<StringFilterInput>;
  /** Filter by code */
  code?: InputMaybe<StringFilterInput>;
  country?: InputMaybe<StringFilterInput>;
  email?: InputMaybe<StringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  /** Filter by customer property */
  isCustomer?: InputMaybe<Scalars['Boolean']['input']>;
  isPatient?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is this name a store */
  isStore?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by supplier property */
  isSupplier?: InputMaybe<Scalars['Boolean']['input']>;
  /**
   * 	Show system names (defaults to false)
   * System names don't have name_store_join thus if queried with true filter, is_visible filter should also be true or null
   * if is_visible is set to true and is_system_name is also true no system names will be returned
   */
  isSystemName?: InputMaybe<Scalars['Boolean']['input']>;
  /** Visibility in current store (based on store_id parameter and existence of name_store_join record) */
  isVisible?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by name */
  name?: InputMaybe<StringFilterInput>;
  phone?: InputMaybe<StringFilterInput>;
  /** Code of the store if store is linked to name */
  storeCode?: InputMaybe<StringFilterInput>;
  /** Filter by the name type */
  type?: InputMaybe<EqualFilterTypeInput>;
};

export type NameNode = {
  __typename: 'NameNode';
  address1?: Maybe<Scalars['String']['output']>;
  address2?: Maybe<Scalars['String']['output']>;
  chargeCode?: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  comment?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  createdDatetime?: Maybe<Scalars['DateTime']['output']>;
  customData?: Maybe<Scalars['JSON']['output']>;
  dateOfBirth?: Maybe<Scalars['NaiveDate']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  gender?: Maybe<GenderType>;
  id: Scalars['String']['output'];
  isCustomer: Scalars['Boolean']['output'];
  isDonor: Scalars['Boolean']['output'];
  isManufacturer: Scalars['Boolean']['output'];
  isOnHold: Scalars['Boolean']['output'];
  isSupplier: Scalars['Boolean']['output'];
  isSystemName: Scalars['Boolean']['output'];
  isVisible: Scalars['Boolean']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  phone?: Maybe<Scalars['String']['output']>;
  store?: Maybe<StoreNode>;
  type: NameNodeType;
  website?: Maybe<Scalars['String']['output']>;
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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: NameSortFieldInput;
};

export type NameStoreJoinNode = {
  __typename: 'NameStoreJoinNode';
  id: Scalars['String']['output'];
  nameId: Scalars['String']['output'];
  storeId: Scalars['String']['output'];
};

export type NamesResponse = NameConnector;

export type NoPermissionForThisStore = InsertAssetErrorInterface & {
  __typename: 'NoPermissionForThisStore';
  description: Scalars['String']['output'];
};

export type NoRefreshTokenProvided = RefreshTokenErrorInterface & {
  __typename: 'NoRefreshTokenProvided';
  description: Scalars['String']['output'];
};

/** Generic Error Wrapper */
export type NodeError = {
  __typename: 'NodeError';
  error: NodeErrorInterface;
};

export type NodeErrorInterface = {
  description: Scalars['String']['output'];
};

export type NotARefreshToken = RefreshTokenErrorInterface & {
  __typename: 'NotARefreshToken';
  description: Scalars['String']['output'];
};

export type NotAnInboundShipment = UpdateInboundShipmentLineErrorInterface & {
  __typename: 'NotAnInboundShipment';
  description: Scalars['String']['output'];
};

export type NotAnOutboundShipmentError = UpdateErrorInterface & UpdateNameErrorInterface & {
  __typename: 'NotAnOutboundShipmentError';
  description: Scalars['String']['output'];
};

export type NotEnoughStockForReduction = InsertOutboundShipmentLineErrorInterface & InsertPrescriptionLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdatePrescriptionLineErrorInterface & {
  __typename: 'NotEnoughStockForReduction';
  batch: StockLineResponse;
  description: Scalars['String']['output'];
  line?: Maybe<InvoiceLineNode>;
};

export type NothingRemainingToSupply = CreateRequisitionShipmentErrorInterface & {
  __typename: 'NothingRemainingToSupply';
  description: Scalars['String']['output'];
};

/**
 * Update a nullable value
 *
 * This struct is usually used as an optional value.
 * For example, in an API update input object like `mutableValue:  NullableUpdate | null | undefined`.
 * This is done to encode the following cases (using `mutableValue` from previous example):
 * 1) if `mutableValue` is `null | undefined`, nothing is updated
 * 2) if `mutableValue` object is set:
 * a) if `NullableUpdate.value` is `undefined | null`, the `mutableValue` is set to `null`
 * b) if `NullableUpdate.value` is set, the `mutableValue` is set to the provided `NullableUpdate.value`
 */
export type NullableDateUpdate = {
  value?: InputMaybe<Scalars['NaiveDate']['input']>;
};

/**
 * Update a nullable value
 *
 * This struct is usually used as an optional value.
 * For example, in an API update input object like `mutableValue:  NullableUpdate | null | undefined`.
 * This is done to encode the following cases (using `mutableValue` from previous example):
 * 1) if `mutableValue` is `null | undefined`, nothing is updated
 * 2) if `mutableValue` object is set:
 * a) if `NullableUpdate.value` is `undefined | null`, the `mutableValue` is set to `null`
 * b) if `NullableUpdate.value` is set, the `mutableValue` is set to the provided `NullableUpdate.value`
 */
export type NullableStringUpdate = {
  value?: InputMaybe<Scalars['String']['input']>;
};

export type NumberNode = {
  __typename: 'NumberNode';
  number: Scalars['Int']['output'];
};

export type OtherPartyNotACustomer = InsertErrorInterface & InsertInboundReturnErrorInterface & UpdateNameErrorInterface & {
  __typename: 'OtherPartyNotACustomer';
  description: Scalars['String']['output'];
};

export type OtherPartyNotAPatient = InsertPrescriptionErrorInterface & UpdatePrescriptionErrorInterface & {
  __typename: 'OtherPartyNotAPatient';
  description: Scalars['String']['output'];
};

export type OtherPartyNotASupplier = InsertInboundShipmentErrorInterface & InsertOutboundReturnErrorInterface & InsertRequestRequisitionErrorInterface & UpdateInboundShipmentErrorInterface & UpdateRequestRequisitionErrorInterface & {
  __typename: 'OtherPartyNotASupplier';
  description: Scalars['String']['output'];
};

export type OtherPartyNotVisible = InsertErrorInterface & InsertInboundReturnErrorInterface & InsertInboundShipmentErrorInterface & InsertOutboundReturnErrorInterface & InsertPrescriptionErrorInterface & InsertRequestRequisitionErrorInterface & UpdateInboundShipmentErrorInterface & UpdateNameErrorInterface & UpdatePrescriptionErrorInterface & UpdateRequestRequisitionErrorInterface & {
  __typename: 'OtherPartyNotVisible';
  description: Scalars['String']['output'];
};

export type OutboundInvoiceCounts = {
  __typename: 'OutboundInvoiceCounts';
  created: InvoiceCountsSummary;
  /** Number of outbound shipments not shipped yet */
  notShipped: Scalars['Int']['output'];
};

export type OutboundReturnInput = {
  id: Scalars['String']['input'];
  inboundShipmentId?: InputMaybe<Scalars['String']['input']>;
  outboundReturnLines: Array<OutboundReturnLineInput>;
  supplierId: Scalars['String']['input'];
};

export type OutboundReturnLineConnector = {
  __typename: 'OutboundReturnLineConnector';
  nodes: Array<OutboundReturnLineNode>;
  totalCount: Scalars['Int']['output'];
};

export type OutboundReturnLineInput = {
  id: Scalars['String']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  numberOfPacksToReturn: Scalars['Float']['input'];
  reasonId?: InputMaybe<Scalars['String']['input']>;
  stockLineId: Scalars['String']['input'];
};

export type OutboundReturnLineNode = {
  __typename: 'OutboundReturnLineNode';
  availableNumberOfPacks: Scalars['Float']['output'];
  batch?: Maybe<Scalars['String']['output']>;
  expiryDate?: Maybe<Scalars['NaiveDate']['output']>;
  id: Scalars['String']['output'];
  item: ItemNode;
  itemCode: Scalars['String']['output'];
  itemName: Scalars['String']['output'];
  note?: Maybe<Scalars['String']['output']>;
  numberOfPacksToReturn: Scalars['Float']['output'];
  packSize: Scalars['Int']['output'];
  reasonId?: Maybe<Scalars['String']['output']>;
  stockLineId: Scalars['String']['output'];
};

export type PackVariantMutations = {
  __typename: 'PackVariantMutations';
  deletePackVariant: DeletePackVariantResponse;
  insertPackVariant: InsertPackVariantResponse;
  updatePackVariant: UpdatePackVariantResponse;
};


export type PackVariantMutationsDeletePackVariantArgs = {
  input: DeletePackVariantInput;
  storeId: Scalars['String']['input'];
};


export type PackVariantMutationsInsertPackVariantArgs = {
  input: InsertPackVariantInput;
  storeId: Scalars['String']['input'];
};


export type PackVariantMutationsUpdatePackVariantArgs = {
  input: UpdatePackVariantInput;
  storeId: Scalars['String']['input'];
};

/**
 * Pagination input.
 *
 * Option to limit the number of returned items and/or queries large lists in "pages".
 */
export type PaginationInput = {
  /** Max number of returned items */
  first?: InputMaybe<Scalars['Int']['input']>;
  /** First returned item is at the `offset` position in the full list */
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type PatientConnector = {
  __typename: 'PatientConnector';
  nodes: Array<PatientNode>;
  totalCount: Scalars['Int']['output'];
};

export type PatientFilterInput = {
  address1?: InputMaybe<StringFilterInput>;
  address2?: InputMaybe<StringFilterInput>;
  code?: InputMaybe<StringFilterInput>;
  code2?: InputMaybe<StringFilterInput>;
  country?: InputMaybe<StringFilterInput>;
  dateOfBirth?: InputMaybe<DateFilterInput>;
  dateOfDeath?: InputMaybe<DateFilterInput>;
  email?: InputMaybe<StringFilterInput>;
  firstName?: InputMaybe<StringFilterInput>;
  gender?: InputMaybe<EqualFilterGenderInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  identifier?: InputMaybe<StringFilterInput>;
  lastName?: InputMaybe<StringFilterInput>;
  name?: InputMaybe<StringFilterInput>;
  phone?: InputMaybe<StringFilterInput>;
  programEnrolmentName?: InputMaybe<StringFilterInput>;
};

export type PatientNode = {
  __typename: 'PatientNode';
  address1?: Maybe<Scalars['String']['output']>;
  address2?: Maybe<Scalars['String']['output']>;
  age?: Maybe<Scalars['Int']['output']>;
  code: Scalars['String']['output'];
  code2?: Maybe<Scalars['String']['output']>;
  contactTraces: ContactTraceResponse;
  country?: Maybe<Scalars['String']['output']>;
  dateOfBirth?: Maybe<Scalars['NaiveDate']['output']>;
  dateOfDeath?: Maybe<Scalars['NaiveDate']['output']>;
  document?: Maybe<DocumentNode>;
  /**
   * Returns a draft version of the document data.
   *
   * The draft version can differ from the current document data if a patient has been edited
   * remotely in mSupply.
   * In this case the draft version contains the mSupply patient changes, i.e. information from
   * the name row has been integrated into the current document version.
   * When editing a patient in omSupply the document draft version should be used.
   * This means when the document is eventually saved, the remote changes are incorporated into
   * the document data.
   */
  documentDraft?: Maybe<Scalars['JSON']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  gender?: Maybe<GenderType>;
  id: Scalars['String']['output'];
  isDeceased: Scalars['Boolean']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  phone?: Maybe<Scalars['String']['output']>;
  programEnrolments: ProgramEnrolmentResponse;
  website?: Maybe<Scalars['String']['output']>;
};


export type PatientNodeContactTracesArgs = {
  filter?: InputMaybe<ContactTraceFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<ContactTraceSortInput>;
};


export type PatientNodeProgramEnrolmentsArgs = {
  filter?: InputMaybe<ProgramEnrolmentFilterInput>;
};

export type PatientResponse = PatientConnector;

export type PatientSearchConnector = {
  __typename: 'PatientSearchConnector';
  nodes: Array<PatientSearchNode>;
  totalCount: Scalars['Int']['output'];
};

export type PatientSearchInput = {
  /** Patient code */
  code?: InputMaybe<Scalars['String']['input']>;
  /** Secondary patient code */
  code2?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['NaiveDate']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<GenderInput>;
  identifier?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
};

export type PatientSearchNode = {
  __typename: 'PatientSearchNode';
  patient: PatientNode;
  score: Scalars['Float']['output'];
};

export type PatientSearchResponse = PatientSearchConnector;

export enum PatientSortFieldInput {
  Address1 = 'address1',
  Address2 = 'address2',
  Code = 'code',
  Code2 = 'code2',
  Country = 'country',
  DateOfBirth = 'dateOfBirth',
  DateOfDeath = 'dateOfDeath',
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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: PatientSortFieldInput;
};

export type PeriodNode = {
  __typename: 'PeriodNode';
  endDate: Scalars['NaiveDate']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  startDate: Scalars['NaiveDate']['output'];
};

export type PluginDataFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  pluginName?: InputMaybe<EqualFilterStringInput>;
  relatedRecordId?: InputMaybe<EqualFilterStringInput>;
  relatedRecordType?: InputMaybe<EqualFilterRelatedRecordTypeInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
};

export type PluginDataNode = {
  __typename: 'PluginDataNode';
  data: Scalars['String']['output'];
  id: Scalars['String']['output'];
  pluginName: Scalars['String']['output'];
  relatedRecordId: Scalars['String']['output'];
  relatedRecordType: RelatedRecordNodeType;
  storeId: Scalars['String']['output'];
};

export type PluginDataResponse = NodeError | PluginDataNode;

export enum PluginDataSortFieldInput {
  Id = 'id',
  PluginName = 'pluginName',
  RelatedRecordId = 'relatedRecordId',
  RelatedRecordType = 'relatedRecordType'
}

export type PluginDataSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: PluginDataSortFieldInput;
};

export type PluginNode = {
  __typename: 'PluginNode';
  config: Scalars['String']['output'];
  name: Scalars['String']['output'];
  path: Scalars['String']['output'];
};

export type PricingNode = {
  __typename: 'PricingNode';
  foreignCurrencyTotalAfterTax?: Maybe<Scalars['Float']['output']>;
  serviceTotalAfterTax: Scalars['Float']['output'];
  serviceTotalBeforeTax: Scalars['Float']['output'];
  stockTotalAfterTax: Scalars['Float']['output'];
  stockTotalBeforeTax: Scalars['Float']['output'];
  taxPercentage?: Maybe<Scalars['Float']['output']>;
  totalAfterTax: Scalars['Float']['output'];
  totalBeforeTax: Scalars['Float']['output'];
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
  description: Scalars['String']['output'];
};

export type PrintReportNode = {
  __typename: 'PrintReportNode';
  /**
   * Return the file id of the printed report.
   * The file can be fetched using the /files?id={id} endpoint
   */
  fileId: Scalars['String']['output'];
};

export type PrintReportResponse = PrintReportError | PrintReportNode;

/** This struct is used to sort report data by a key and in descending or ascending order */
export type PrintReportSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: Scalars['String']['input'];
};

export type ProgramEnrolmentConnector = {
  __typename: 'ProgramEnrolmentConnector';
  nodes: Array<ProgramEnrolmentNode>;
  totalCount: Scalars['Int']['output'];
};

export type ProgramEnrolmentFilterInput = {
  documentName?: InputMaybe<EqualFilterStringInput>;
  enrolmentDatetime?: InputMaybe<DatetimeFilterInput>;
  patientId?: InputMaybe<EqualFilterStringInput>;
  programEnrolmentId?: InputMaybe<StringFilterInput>;
  /** The program id */
  programId?: InputMaybe<EqualFilterStringInput>;
  programName?: InputMaybe<StringFilterInput>;
  status?: InputMaybe<StringFilterInput>;
  /** Same as program enrolment document type */
  type?: InputMaybe<EqualFilterStringInput>;
};

export type ProgramEnrolmentNode = {
  __typename: 'ProgramEnrolmentNode';
  activeProgramEvents: ProgramEventResponse;
  contextId: Scalars['String']['output'];
  /** The encounter document */
  document: DocumentNode;
  /** The program document */
  encounters: EncounterConnector;
  enrolmentDatetime: Scalars['DateTime']['output'];
  /** The program document name */
  name: Scalars['String']['output'];
  patient: PatientNode;
  patientId: Scalars['String']['output'];
  programEnrolmentId?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  /** The program type */
  type: Scalars['String']['output'];
};


export type ProgramEnrolmentNodeActiveProgramEventsArgs = {
  at?: InputMaybe<Scalars['DateTime']['input']>;
  filter?: InputMaybe<ProgramEventFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<ProgramEventSortInput>;
};


export type ProgramEnrolmentNodeEncountersArgs = {
  filter?: InputMaybe<EncounterFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<EncounterSortInput>;
};

export type ProgramEnrolmentResponse = ProgramEnrolmentConnector;

export enum ProgramEnrolmentSortFieldInput {
  EnrolmentDatetime = 'enrolmentDatetime',
  PatientId = 'patientId',
  ProgramEnrolmentId = 'programEnrolmentId',
  Status = 'status',
  Type = 'type'
}

export type ProgramEnrolmentSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ProgramEnrolmentSortFieldInput;
};

export type ProgramEventConnector = {
  __typename: 'ProgramEventConnector';
  nodes: Array<ProgramEventNode>;
  totalCount: Scalars['Int']['output'];
};

export type ProgramEventFilterInput = {
  activeEndDatetime?: InputMaybe<DatetimeFilterInput>;
  activeStartDatetime?: InputMaybe<DatetimeFilterInput>;
  data?: InputMaybe<StringFilterInput>;
  documentName?: InputMaybe<EqualFilterStringInput>;
  documentType?: InputMaybe<EqualFilterStringInput>;
  patientId?: InputMaybe<EqualFilterStringInput>;
  /** The event type */
  type?: InputMaybe<EqualFilterStringInput>;
};

export type ProgramEventNode = {
  __typename: 'ProgramEventNode';
  activeEndDatetime: Scalars['DateTime']['output'];
  activeStartDatetime: Scalars['DateTime']['output'];
  data?: Maybe<Scalars['String']['output']>;
  datetime: Scalars['DateTime']['output'];
  /** The document associated with the document_name */
  document?: Maybe<DocumentNode>;
  documentName?: Maybe<Scalars['String']['output']>;
  documentType: Scalars['String']['output'];
  patient?: Maybe<PatientNode>;
  patientId?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type ProgramEventResponse = ProgramEventConnector;

export enum ProgramEventSortFieldInput {
  ActiveEndDatetime = 'activeEndDatetime',
  ActiveStartDatetime = 'activeStartDatetime',
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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ProgramEventSortFieldInput;
};

export type ProgramNode = {
  __typename: 'ProgramNode';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type ProgramRequisitionOrderTypeNode = {
  __typename: 'ProgramRequisitionOrderTypeNode';
  availablePeriods: Array<PeriodNode>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type ProgramRequisitionSettingNode = {
  __typename: 'ProgramRequisitionSettingNode';
  masterList: MasterListNode;
  orderTypes: Array<ProgramRequisitionOrderTypeNode>;
  programId: Scalars['String']['output'];
  programName: Scalars['String']['output'];
  suppliers: Array<NameNode>;
};

export enum PropertyNodeValueType {
  Boolean = 'BOOLEAN',
  Float = 'FLOAT',
  Integer = 'INTEGER',
  String = 'STRING'
}

export type Queries = {
  __typename: 'Queries';
  /**
   * Returns active program events at a given date time.
   * This can also be achieved by using the program_events endpoint with the filter:
   * `active_start_datetime <= at && active_end_datetime + 1 >= at`
   */
  activeProgramEvents: ProgramEventResponse;
  activityLogs: ActivityLogResponse;
  apiVersion: Scalars['String']['output'];
  assetCatalogueItem: AssetCatalogueItemResponse;
  assetCatalogueItems: AssetCatalogueItemsResponse;
  assetCatalogueProperties: AssetCataloguePropertyResponse;
  assetCategories: AssetCategoriesResponse;
  assetCategory: AssetCategoryResponse;
  assetClass: AssetClassResponse;
  assetClasses: AssetClassesResponse;
  assetLogReasons: AssetLogReasonsResponse;
  assetLogs: AssetLogsResponse;
  assetProperties: AssetPropertiesResponse;
  assetType: AssetTypeResponse;
  assetTypes: AssetTypesResponse;
  /** Query omSupply "assets" entries */
  assets: AssetsResponse;
  /**
   * Retrieves a new auth bearer and refresh token
   * The refresh token is returned as a cookie
   */
  authToken: AuthTokenResponse;
  barcodeByGtin: BarcodeResponse;
  centralPatientSearch: CentralPatientSearchResponse;
  clinicians: CliniciansResponse;
  contactTraces: ContactTraceResponse;
  currencies: CurrenciesResponse;
  databaseSettings: DatabaseSettingsNode;
  displaySettings: DisplaySettingsNode;
  document?: Maybe<DocumentNode>;
  documentHistory: DocumentHistoryResponse;
  documentRegistries: DocumentRegistryResponse;
  documents: DocumentResponse;
  encounterFields: EncounterFieldsResponse;
  encounters: EncounterResponse;
  formSchemas: FormSchemaResponse;
  /**
   * Generates new inbound return lines in memory, based on outbound return line ids.
   * Optionally includes existing inbound return lines for a specific item in a return.
   * Provides an friendly shape to edit these lines before calling the insert/update mutations.
   */
  generateInboundReturnLines: GenerateInboundReturnLinesResponse;
  /**
   * Generates new outbound return lines in memory, based on either stock line ids, or an item id.
   * Optionally includes existing outbound return lines for a specific item in a return.
   * Provides an friendly shape to edit these lines before calling the insert/update mutations.
   */
  generateOutboundReturnLines: GenerateOutboundReturnLinesResponse;
  /** Available without authorisation in operational and initialisation states */
  initialisationStatus: InitialisationStatusNode;
  insertPrescription: InsertPrescriptionResponse;
  inventoryAdjustmentReasons: InventoryAdjustmentReasonResponse;
  invoice: InvoiceResponse;
  invoiceByNumber: InvoiceResponse;
  invoiceCounts: InvoiceCounts;
  invoiceLines: InvoiceLinesResponse;
  invoices: InvoicesResponse;
  isCentralServer: Scalars['Boolean']['output'];
  itemCounts: ItemCounts;
  /** Query omSupply "item" entries */
  items: ItemsResponse;
  labelPrinterSettings?: Maybe<LabelPrinterSettingNode>;
  lastSuccessfulUserSync: UpdateUserNode;
  latestSyncStatus?: Maybe<FullSyncStatusNode>;
  ledger: LedgerResponse;
  /** Query omSupply "locations" entries */
  locations: LocationsResponse;
  logContents: LogNode;
  logFileNames: LogNode;
  logLevel: LogLevelNode;
  logout: LogoutResponse;
  masterListLines: MasterListLinesResponse;
  /** Query omSupply "master_lists" entries */
  masterLists: MasterListsResponse;
  me: UserResponse;
  /** Query omSupply "name" entries */
  names: NamesResponse;
  numberOfRecordsInPushQueue: Scalars['Int']['output'];
  packVariants: ItemPackVariantConnector;
  patient?: Maybe<PatientNode>;
  patientSearch: PatientSearchResponse;
  patients: PatientResponse;
  pluginData: PluginDataResponse;
  plugins: Array<PluginNode>;
  /**
   * Creates a printed report.
   *
   * All details about the report, e.g. the output format, are specified in the report definition
   * which is referred to by the report_id.
   * The printed report can be retrieved from the `/files` endpoint using the returned file id.
   */
  printReport: PrintReportResponse;
  /**
   * Can be used when developing reports, e.g. to print a report that is not already in the
   * system.
   */
  printReportDefinition: PrintReportResponse;
  programEnrolments: ProgramEnrolmentResponse;
  programEvents: ProgramEventResponse;
  programRequisitionSettings: Array<ProgramRequisitionSettingNode>;
  /**
   * Retrieves a new auth bearer and refresh token
   * The refresh token is returned as a cookie
   */
  refreshToken: RefreshTokenResponse;
  repack: RepackResponse;
  repacksByStockLine: RepackConnector;
  /** Queries a list of available reports */
  reports: ReportsResponse;
  requisition: RequisitionResponse;
  requisitionByNumber: RequisitionResponse;
  requisitionCounts: RequisitionCounts;
  requisitionLineChart: RequisitionLineChartResponse;
  requisitions: RequisitionsResponse;
  responseRequisitionStats: RequisitionLineStatsResponse;
  returnReasons: ReturnReasonResponse;
  /** Query omSupply "sensor" entries */
  sensors: SensorsResponse;
  stockCounts: StockCounts;
  /** Query for "stock_line" entries */
  stockLines: StockLinesResponse;
  stocktake: StocktakeResponse;
  stocktakeByNumber: StocktakeResponse;
  stocktakeLines: StocktakesLinesResponse;
  stocktakes: StocktakesResponse;
  store: StoreResponse;
  storePreferences: StorePreferenceNode;
  stores: StoresResponse;
  syncSettings?: Maybe<SyncSettingsNode>;
  /** Query omSupply "temperature_breach" entries */
  temperatureBreaches: TemperatureBreachesResponse;
  /** Query omSupply "temperature_log" entries */
  temperatureLogs: TemperatureLogsResponse;
  /** Query omSupply temperature notification entries */
  temperatureNotifications: TemperatureNotificationsResponse;
};


export type QueriesActiveProgramEventsArgs = {
  at?: InputMaybe<Scalars['DateTime']['input']>;
  filter?: InputMaybe<ProgramEventFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<ProgramEventSortInput>;
  storeId: Scalars['String']['input'];
};


export type QueriesActivityLogsArgs = {
  filter?: InputMaybe<ActivityLogFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<ActivityLogSortInput>>;
};


export type QueriesAssetCatalogueItemArgs = {
  id: Scalars['String']['input'];
};


export type QueriesAssetCatalogueItemsArgs = {
  filter?: InputMaybe<AssetCatalogueItemFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<AssetCatalogueItemSortInput>>;
};


export type QueriesAssetCataloguePropertiesArgs = {
  filter?: InputMaybe<AssetCataloguePropertyFilterInput>;
};


export type QueriesAssetCategoriesArgs = {
  filter?: InputMaybe<AssetCategoryFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<AssetCategorySortInput>>;
};


export type QueriesAssetCategoryArgs = {
  id: Scalars['String']['input'];
};


export type QueriesAssetClassArgs = {
  id: Scalars['String']['input'];
};


export type QueriesAssetClassesArgs = {
  filter?: InputMaybe<AssetClassFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<AssetClassSortInput>>;
};


export type QueriesAssetLogReasonsArgs = {
  filter?: InputMaybe<AssetLogReasonFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<AssetLogReasonSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesAssetLogsArgs = {
  filter?: InputMaybe<AssetLogFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<AssetLogSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesAssetPropertiesArgs = {
  filter?: InputMaybe<AssetPropertyFilterInput>;
  storeId: Scalars['String']['input'];
};


export type QueriesAssetTypeArgs = {
  id: Scalars['String']['input'];
};


export type QueriesAssetTypesArgs = {
  filter?: InputMaybe<AssetTypeFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<AssetTypeSortInput>>;
};


export type QueriesAssetsArgs = {
  filter?: InputMaybe<AssetFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<AssetSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesAuthTokenArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type QueriesBarcodeByGtinArgs = {
  gtin: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type QueriesCentralPatientSearchArgs = {
  input: CentralPatientSearchInput;
  storeId: Scalars['String']['input'];
};


export type QueriesCliniciansArgs = {
  filter?: InputMaybe<ClinicianFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<ClinicianSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesContactTracesArgs = {
  filter?: InputMaybe<ContactTraceFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<ContactTraceSortInput>;
  storeId: Scalars['String']['input'];
};


export type QueriesCurrenciesArgs = {
  filter?: InputMaybe<CurrencyFilterInput>;
  sort?: InputMaybe<Array<CurrencySortInput>>;
};


export type QueriesDisplaySettingsArgs = {
  input: DisplaySettingsHash;
};


export type QueriesDocumentArgs = {
  name: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type QueriesDocumentHistoryArgs = {
  name: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type QueriesDocumentRegistriesArgs = {
  filter?: InputMaybe<DocumentRegistryFilterInput>;
  sort?: InputMaybe<Array<DocumentRegistrySortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesDocumentsArgs = {
  filter?: InputMaybe<DocumentFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<DocumentSortInput>;
  storeId: Scalars['String']['input'];
};


export type QueriesEncounterFieldsArgs = {
  filter?: InputMaybe<EncounterFilterInput>;
  input: EncounterFieldsInput;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<EncounterSortInput>;
  storeId: Scalars['String']['input'];
};


export type QueriesEncountersArgs = {
  filter?: InputMaybe<EncounterFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<EncounterSortInput>;
  storeId: Scalars['String']['input'];
};


export type QueriesFormSchemasArgs = {
  filter?: InputMaybe<FormSchemaFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<FormSchemaSortInput>>;
};


export type QueriesGenerateInboundReturnLinesArgs = {
  input: GenerateInboundReturnLinesInput;
  storeId: Scalars['String']['input'];
};


export type QueriesGenerateOutboundReturnLinesArgs = {
  input: GenerateOutboundReturnLinesInput;
  storeId: Scalars['String']['input'];
};


export type QueriesInsertPrescriptionArgs = {
  input: InsertPrescriptionInput;
  storeId: Scalars['String']['input'];
};


export type QueriesInventoryAdjustmentReasonsArgs = {
  filter?: InputMaybe<InventoryAdjustmentReasonFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<InventoryAdjustmentReasonSortInput>>;
};


export type QueriesInvoiceArgs = {
  id: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type QueriesInvoiceByNumberArgs = {
  invoiceNumber: Scalars['Int']['input'];
  storeId: Scalars['String']['input'];
  type: InvoiceNodeType;
};


export type QueriesInvoiceCountsArgs = {
  storeId: Scalars['String']['input'];
  timezoneOffset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueriesInvoiceLinesArgs = {
  filter?: InputMaybe<InvoiceLineFilterInput>;
  invoiceId: Scalars['String']['input'];
  page?: InputMaybe<PaginationInput>;
  reportSort?: InputMaybe<PrintReportSortInput>;
  sort?: InputMaybe<Array<InvoiceLineSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesInvoicesArgs = {
  filter?: InputMaybe<InvoiceFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<InvoiceSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesItemCountsArgs = {
  lowStockThreshold?: InputMaybe<Scalars['Int']['input']>;
  storeId: Scalars['String']['input'];
};


export type QueriesItemsArgs = {
  filter?: InputMaybe<ItemFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<ItemSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesLedgerArgs = {
  filter?: InputMaybe<LedgerFilterInput>;
  sort?: InputMaybe<Array<LedgerSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesLocationsArgs = {
  filter?: InputMaybe<LocationFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<LocationSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesLogContentsArgs = {
  fileName?: InputMaybe<Scalars['String']['input']>;
};


export type QueriesMasterListLinesArgs = {
  filter?: InputMaybe<MasterListLineFilterInput>;
  masterListId: Scalars['String']['input'];
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<MasterListLineSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesMasterListsArgs = {
  filter?: InputMaybe<MasterListFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<MasterListSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesNamesArgs = {
  filter?: InputMaybe<NameFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<NameSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesPackVariantsArgs = {
  storeId: Scalars['String']['input'];
};


export type QueriesPatientArgs = {
  patientId: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type QueriesPatientSearchArgs = {
  input: PatientSearchInput;
  storeId: Scalars['String']['input'];
};


export type QueriesPatientsArgs = {
  filter?: InputMaybe<PatientFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<PatientSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesPluginDataArgs = {
  filter?: InputMaybe<PluginDataFilterInput>;
  sort?: InputMaybe<Array<PluginDataSortInput>>;
  storeId: Scalars['String']['input'];
  type: RelatedRecordNodeType;
};


export type QueriesPrintReportArgs = {
  arguments?: InputMaybe<Scalars['JSON']['input']>;
  dataId?: InputMaybe<Scalars['String']['input']>;
  format?: InputMaybe<PrintFormat>;
  reportId: Scalars['String']['input'];
  sort?: InputMaybe<PrintReportSortInput>;
  storeId: Scalars['String']['input'];
};


export type QueriesPrintReportDefinitionArgs = {
  arguments?: InputMaybe<Scalars['JSON']['input']>;
  dataId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  report: Scalars['JSON']['input'];
  storeId: Scalars['String']['input'];
};


export type QueriesProgramEnrolmentsArgs = {
  filter?: InputMaybe<ProgramEnrolmentFilterInput>;
  sort?: InputMaybe<ProgramEnrolmentSortInput>;
  storeId: Scalars['String']['input'];
};


export type QueriesProgramEventsArgs = {
  filter?: InputMaybe<ProgramEventFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<ProgramEventSortInput>;
  storeId: Scalars['String']['input'];
};


export type QueriesProgramRequisitionSettingsArgs = {
  storeId: Scalars['String']['input'];
};


export type QueriesRepackArgs = {
  invoiceId: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type QueriesRepacksByStockLineArgs = {
  stockLineId: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type QueriesReportsArgs = {
  filter?: InputMaybe<ReportFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<ReportSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesRequisitionArgs = {
  id: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type QueriesRequisitionByNumberArgs = {
  requisitionNumber: Scalars['Int']['input'];
  storeId: Scalars['String']['input'];
  type: RequisitionNodeType;
};


export type QueriesRequisitionCountsArgs = {
  storeId: Scalars['String']['input'];
};


export type QueriesRequisitionLineChartArgs = {
  consumptionOptionsInput?: InputMaybe<ConsumptionOptionsInput>;
  requestRequisitionLineId: Scalars['String']['input'];
  stockEvolutionOptionsInput?: InputMaybe<StockEvolutionOptionsInput>;
  storeId: Scalars['String']['input'];
};


export type QueriesRequisitionsArgs = {
  filter?: InputMaybe<RequisitionFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<RequisitionSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesResponseRequisitionStatsArgs = {
  requisitionLineId: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type QueriesReturnReasonsArgs = {
  filter?: InputMaybe<ReturnReasonFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<ReturnReasonSortInput>>;
};


export type QueriesSensorsArgs = {
  filter?: InputMaybe<SensorFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<SensorSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesStockCountsArgs = {
  daysTillExpired?: InputMaybe<Scalars['Int']['input']>;
  storeId: Scalars['String']['input'];
  timezoneOffset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueriesStockLinesArgs = {
  filter?: InputMaybe<StockLineFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<StockLineSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesStocktakeArgs = {
  id: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type QueriesStocktakeByNumberArgs = {
  stocktakeNumber: Scalars['Int']['input'];
  storeId: Scalars['String']['input'];
};


export type QueriesStocktakeLinesArgs = {
  filter?: InputMaybe<StocktakeLineFilterInput>;
  page?: InputMaybe<PaginationInput>;
  reportSort?: InputMaybe<PrintReportSortInput>;
  sort?: InputMaybe<Array<StocktakeLineSortInput>>;
  stocktakeId: Scalars['String']['input'];
  storeId: Scalars['String']['input'];
};


export type QueriesStocktakesArgs = {
  filter?: InputMaybe<StocktakeFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<StocktakeSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesStoreArgs = {
  id: Scalars['String']['input'];
};


export type QueriesStorePreferencesArgs = {
  storeId: Scalars['String']['input'];
};


export type QueriesStoresArgs = {
  filter?: InputMaybe<StoreFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<StoreSortInput>>;
};


export type QueriesTemperatureBreachesArgs = {
  filter?: InputMaybe<TemperatureBreachFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<TemperatureBreachSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesTemperatureLogsArgs = {
  filter?: InputMaybe<TemperatureLogFilterInput>;
  page?: InputMaybe<PaginationInput>;
  sort?: InputMaybe<Array<TemperatureLogSortInput>>;
  storeId: Scalars['String']['input'];
};


export type QueriesTemperatureNotificationsArgs = {
  page?: InputMaybe<PaginationInput>;
  storeId: Scalars['String']['input'];
};

export type RawDocumentNode = {
  __typename: 'RawDocumentNode';
  author: Scalars['String']['output'];
  data: Scalars['String']['output'];
  name: Scalars['String']['output'];
  parents: Array<Scalars['String']['output']>;
  schemaId?: Maybe<Scalars['String']['output']>;
  timestamp: Scalars['DateTime']['output'];
  type: Scalars['String']['output'];
};

export type RecordAlreadyExist = InsertAssetCatalogueItemErrorInterface & InsertAssetCatalogueItemPropertyErrorInterface & InsertAssetErrorInterface & InsertAssetLogErrorInterface & InsertAssetLogReasonErrorInterface & InsertLocationErrorInterface & {
  __typename: 'RecordAlreadyExist';
  description: Scalars['String']['output'];
};

export type RecordBelongsToAnotherStore = DeleteAssetErrorInterface & DeleteAssetLogReasonErrorInterface & DeleteLocationErrorInterface & UpdateAssetErrorInterface & UpdateLocationErrorInterface & UpdateSensorErrorInterface & {
  __typename: 'RecordBelongsToAnotherStore';
  description: Scalars['String']['output'];
};

export type RecordNotFound = AddFromMasterListErrorInterface & AddToInboundShipmentFromMasterListErrorInterface & AddToOutboundShipmentFromMasterListErrorInterface & AllocateOutboundShipmentUnallocatedLineErrorInterface & CreateRequisitionShipmentErrorInterface & DeleteAssetCatalogueItemErrorInterface & DeleteAssetErrorInterface & DeleteAssetLogReasonErrorInterface & DeleteErrorInterface & DeleteInboundReturnErrorInterface & DeleteInboundShipmentErrorInterface & DeleteInboundShipmentLineErrorInterface & DeleteInboundShipmentServiceLineErrorInterface & DeleteLocationErrorInterface & DeleteOutboundReturnErrorInterface & DeleteOutboundShipmentLineErrorInterface & DeleteOutboundShipmentServiceLineErrorInterface & DeleteOutboundShipmentUnallocatedLineErrorInterface & DeletePrescriptionErrorInterface & DeletePrescriptionLineErrorInterface & DeleteRequestRequisitionErrorInterface & DeleteRequestRequisitionLineErrorInterface & NodeErrorInterface & RequisitionLineChartErrorInterface & RequisitionLineStatsErrorInterface & SupplyRequestedQuantityErrorInterface & UpdateAssetErrorInterface & UpdateErrorInterface & UpdateInboundShipmentErrorInterface & UpdateInboundShipmentLineErrorInterface & UpdateInboundShipmentServiceLineErrorInterface & UpdateLocationErrorInterface & UpdateNameErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdateOutboundShipmentServiceLineErrorInterface & UpdateOutboundShipmentUnallocatedLineErrorInterface & UpdatePrescriptionErrorInterface & UpdatePrescriptionLineErrorInterface & UpdateRequestRequisitionErrorInterface & UpdateRequestRequisitionLineErrorInterface & UpdateResponseRequisitionErrorInterface & UpdateResponseRequisitionLineErrorInterface & UpdateSensorErrorInterface & UpdateStockLineErrorInterface & UseSuggestedQuantityErrorInterface & {
  __typename: 'RecordNotFound';
  description: Scalars['String']['output'];
};

export type RefreshToken = {
  __typename: 'RefreshToken';
  /** New Bearer token */
  token: Scalars['String']['output'];
};

export type RefreshTokenError = {
  __typename: 'RefreshTokenError';
  error: RefreshTokenErrorInterface;
};

export type RefreshTokenErrorInterface = {
  description: Scalars['String']['output'];
};

export type RefreshTokenResponse = RefreshToken | RefreshTokenError;

export enum RelatedRecordNodeType {
  StockLine = 'STOCK_LINE'
}

export type RepackConnector = {
  __typename: 'RepackConnector';
  nodes: Array<RepackNode>;
  totalCount: Scalars['Int']['output'];
};

export type RepackNode = {
  __typename: 'RepackNode';
  batch?: Maybe<Scalars['String']['output']>;
  datetime: Scalars['DateTime']['output'];
  from: RepackStockLineNode;
  id: Scalars['String']['output'];
  invoice: InvoiceNode;
  repackId: Scalars['String']['output'];
  to: RepackStockLineNode;
};

export type RepackResponse = NodeError | RepackNode;

export type RepackStockLineNode = {
  __typename: 'RepackStockLineNode';
  location?: Maybe<LocationNode>;
  numberOfPacks: Scalars['Float']['output'];
  packSize: Scalars['Int']['output'];
  stockLine?: Maybe<StockLineNode>;
};

export type ReportConnector = {
  __typename: 'ReportConnector';
  nodes: Array<ReportNode>;
  totalCount: Scalars['Int']['output'];
};

export enum ReportContext {
  Asset = 'ASSET',
  Dispensary = 'DISPENSARY',
  InboundReturn = 'INBOUND_RETURN',
  InboundShipment = 'INBOUND_SHIPMENT',
  OutboundReturn = 'OUTBOUND_RETURN',
  OutboundShipment = 'OUTBOUND_SHIPMENT',
  Patient = 'PATIENT',
  Repack = 'REPACK',
  Requisition = 'REQUISITION',
  Resource = 'RESOURCE',
  Stocktake = 'STOCKTAKE'
}

export type ReportFilterInput = {
  context?: InputMaybe<EqualFilterReportContextInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
  subContext?: InputMaybe<EqualFilterStringInput>;
};

export type ReportNode = {
  __typename: 'ReportNode';
  argumentSchema?: Maybe<FormSchemaNode>;
  context: ReportContext;
  id: Scalars['String']['output'];
  /** Human readable name of the report */
  name: Scalars['String']['output'];
  subContext?: Maybe<Scalars['String']['output']>;
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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ReportSortFieldInput;
};

export type ReportsResponse = ReportConnector;

export type RequestRequisitionCounts = {
  __typename: 'RequestRequisitionCounts';
  draft: Scalars['Int']['output'];
};

export type RequestStoreStatsNode = {
  __typename: 'RequestStoreStatsNode';
  averageMonthlyConsumption: Scalars['Int']['output'];
  maxMonthsOfStock: Scalars['Float']['output'];
  stockOnHand: Scalars['Int']['output'];
  suggestedQuantity: Scalars['Int']['output'];
};

export type RequisitionConnector = {
  __typename: 'RequisitionConnector';
  nodes: Array<RequisitionNode>;
  totalCount: Scalars['Int']['output'];
};

export type RequisitionCounts = {
  __typename: 'RequisitionCounts';
  request: RequestRequisitionCounts;
  response: ResponseRequisitionCounts;
};

export type RequisitionFilterInput = {
  colour?: InputMaybe<EqualFilterStringInput>;
  comment?: InputMaybe<StringFilterInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  expectedDeliveryDate?: InputMaybe<DateFilterInput>;
  finalisedDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  orderType?: InputMaybe<EqualFilterStringInput>;
  otherPartyId?: InputMaybe<EqualFilterStringInput>;
  otherPartyName?: InputMaybe<StringFilterInput>;
  requisitionNumber?: InputMaybe<EqualFilterBigNumberInput>;
  sentDatetime?: InputMaybe<DatetimeFilterInput>;
  status?: InputMaybe<EqualFilterRequisitionStatusInput>;
  theirReference?: InputMaybe<StringFilterInput>;
  type?: InputMaybe<EqualFilterRequisitionTypeInput>;
  userId?: InputMaybe<EqualFilterStringInput>;
};

export type RequisitionLineChartError = {
  __typename: 'RequisitionLineChartError';
  error: RequisitionLineChartErrorInterface;
};

export type RequisitionLineChartErrorInterface = {
  description: Scalars['String']['output'];
};

export type RequisitionLineChartResponse = ItemChartNode | RequisitionLineChartError;

export type RequisitionLineConnector = {
  __typename: 'RequisitionLineConnector';
  nodes: Array<RequisitionLineNode>;
  totalCount: Scalars['Int']['output'];
};

export type RequisitionLineNode = {
  __typename: 'RequisitionLineNode';
  /** Quantity already issued in outbound shipments */
  alreadyIssued: Scalars['Float']['output'];
  approvalComment?: Maybe<Scalars['String']['output']>;
  approvedQuantity: Scalars['Int']['output'];
  comment?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  /** InboundShipment lines linked to requisitions line */
  inboundShipmentLines: InvoiceLineConnector;
  item: ItemNode;
  itemId: Scalars['String']['output'];
  itemName: Scalars['String']['output'];
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
  remainingQuantityToSupply: Scalars['Float']['output'];
  /** Quantity requested */
  requestedQuantity: Scalars['Int']['output'];
  /**
   * Calculated quantity
   * When months_of_stock < requisition.min_months_of_stock, calculated = average_monthly_consumption * requisition.max_months_of_stock - months_of_stock
   */
  suggestedQuantity: Scalars['Int']['output'];
  /** Quantity to be supplied in the next shipment, only used in response requisition */
  supplyQuantity: Scalars['Int']['output'];
};


export type RequisitionLineNodeItemStatsArgs = {
  amcLookbackMonths?: InputMaybe<Scalars['Int']['input']>;
};

export type RequisitionLineStatsError = {
  __typename: 'RequisitionLineStatsError';
  error: RequisitionLineStatsErrorInterface;
};

export type RequisitionLineStatsErrorInterface = {
  description: Scalars['String']['output'];
};

export type RequisitionLineStatsResponse = RequisitionLineStatsError | ResponseRequisitionStatsNode;

export type RequisitionLineWithItemIdExists = InsertRequestRequisitionLineErrorInterface & {
  __typename: 'RequisitionLineWithItemIdExists';
  description: Scalars['String']['output'];
};

export type RequisitionNode = {
  __typename: 'RequisitionNode';
  approvalStatus: RequisitionNodeApprovalStatus;
  colour?: Maybe<Scalars['String']['output']>;
  comment?: Maybe<Scalars['String']['output']>;
  createdDatetime: Scalars['DateTime']['output'];
  expectedDeliveryDate?: Maybe<Scalars['NaiveDate']['output']>;
  finalisedDatetime?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  lines: RequisitionLineConnector;
  /**
   * All lines that have not been supplied
   * based on same logic as RequisitionLineNode.remainingQuantityToSupply
   * only applicable to Response requisition, Request requisition will empty connector
   */
  linesRemainingToSupply: RequisitionLineConnector;
  /** Linked requisition */
  linkedRequisition?: Maybe<RequisitionNode>;
  /** Maximum calculated quantity, used to deduce calculated quantity for each line, see calculated in requisition line */
  maxMonthsOfStock: Scalars['Float']['output'];
  /** Minimum quantity to have for stock to be ordered, used to deduce calculated quantity for each line, see calculated in requisition line */
  minMonthsOfStock: Scalars['Float']['output'];
  orderType?: Maybe<Scalars['String']['output']>;
  /**
   * Request Requisition: Supplying store (store that is supplying stock)
   * Response Requisition: Customer store (store that is ordering stock)
   */
  otherParty: NameNode;
  otherPartyId: Scalars['String']['output'];
  otherPartyName: Scalars['String']['output'];
  period?: Maybe<PeriodNode>;
  programName?: Maybe<Scalars['String']['output']>;
  requisitionNumber: Scalars['Int']['output'];
  /** Applicable to request requisition only */
  sentDatetime?: Maybe<Scalars['DateTime']['output']>;
  /**
   * Response Requisition: Outbound Shipments linked requisition
   * Request Requisition: Inbound Shipments linked to requisition
   */
  shipments: InvoiceConnector;
  status: RequisitionNodeStatus;
  theirReference?: Maybe<Scalars['String']['output']>;
  type: RequisitionNodeType;
  /**
   * User that last edited requisition, if user is not found in system default unknown user is returned
   * Null is returned for transfers, where response requisition has not been edited yet
   */
  user?: Maybe<UserNode>;
};


export type RequisitionNodeOtherPartyArgs = {
  storeId: Scalars['String']['input'];
};

/** Approval status is applicable to response requisition only */
export enum RequisitionNodeApprovalStatus {
  Approved = 'APPROVED',
  Denied = 'DENIED',
  None = 'NONE',
  Pending = 'PENDING'
}

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
  OrderType = 'orderType',
  OtherPartyName = 'otherPartyName',
  PeriodName = 'periodName',
  ProgramName = 'programName',
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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: RequisitionSortFieldInput;
};

export type RequisitionsResponse = RequisitionConnector;

export type ResponseRequisitionCounts = {
  __typename: 'ResponseRequisitionCounts';
  new: Scalars['Int']['output'];
};

export type ResponseRequisitionStatsNode = {
  __typename: 'ResponseRequisitionStatsNode';
  requestStoreStats: RequestStoreStatsNode;
  responseStoreStats: ResponseStoreStatsNode;
};

export type ResponseStoreStatsNode = {
  __typename: 'ResponseStoreStatsNode';
  incomingStock: Scalars['Int']['output'];
  otherRequestedQuantity: Scalars['Int']['output'];
  requestedQuantity: Scalars['Int']['output'];
  stockOnHand: Scalars['Float']['output'];
  stockOnOrder: Scalars['Int']['output'];
};

export type ReturnReasonConnector = {
  __typename: 'ReturnReasonConnector';
  nodes: Array<ReturnReasonNode>;
  totalCount: Scalars['Int']['output'];
};

export type ReturnReasonFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ReturnReasonNode = {
  __typename: 'ReturnReasonNode';
  id: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  reason: Scalars['String']['output'];
};

export type ReturnReasonResponse = ReturnReasonConnector;

export enum ReturnReasonSortFieldInput {
  Id = 'id',
  Reason = 'reason'
}

export type ReturnReasonSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ReturnReasonSortFieldInput;
};

export type SensorConnector = {
  __typename: 'SensorConnector';
  nodes: Array<SensorNode>;
  totalCount: Scalars['Int']['output'];
};

export type SensorFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StringFilterInput>;
  serial?: InputMaybe<EqualFilterStringInput>;
};

export type SensorNode = {
  __typename: 'SensorNode';
  assets: AssetConnector;
  batteryLevel?: Maybe<Scalars['Int']['output']>;
  breach?: Maybe<TemperatureBreachNodeType>;
  id: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  lastConnectionDatetime?: Maybe<Scalars['DateTime']['output']>;
  latestTemperatureLog?: Maybe<TemperatureLogConnector>;
  location?: Maybe<LocationNode>;
  logInterval?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  serial: Scalars['String']['output'];
  type: SensorNodeType;
};

export enum SensorNodeType {
  Berlinger = 'BERLINGER',
  BlueMaestro = 'BLUE_MAESTRO',
  Laird = 'LAIRD'
}

export enum SensorSortFieldInput {
  Name = 'name',
  Serial = 'serial'
}

export type SensorSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: SensorSortFieldInput;
};

export type SensorsResponse = SensorConnector;

export type SnapshotCountCurrentCountMismatch = UpdateStocktakeErrorInterface & {
  __typename: 'SnapshotCountCurrentCountMismatch';
  description: Scalars['String']['output'];
  lines: StocktakeLineConnector;
};

export enum StatusType {
  Decommissioned = 'DECOMMISSIONED',
  Functioning = 'FUNCTIONING',
  FunctioningButNeedsAttention = 'FUNCTIONING_BUT_NEEDS_ATTENTION',
  NotFunctioning = 'NOT_FUNCTIONING',
  NotInUse = 'NOT_IN_USE'
}

export type StockCounts = {
  __typename: 'StockCounts';
  expired: Scalars['Int']['output'];
  expiringSoon: Scalars['Int']['output'];
};

export type StockEvolutionConnector = {
  __typename: 'StockEvolutionConnector';
  nodes: Array<StockEvolutionNode>;
  totalCount: Scalars['Int']['output'];
};

export type StockEvolutionNode = {
  __typename: 'StockEvolutionNode';
  date: Scalars['NaiveDate']['output'];
  isHistoric: Scalars['Boolean']['output'];
  isProjected: Scalars['Boolean']['output'];
  maximumStockOnHand: Scalars['Int']['output'];
  minimumStockOnHand: Scalars['Int']['output'];
  stockOnHand: Scalars['Int']['output'];
};

export type StockEvolutionOptionsInput = {
  /** Defaults to 30, number of data points for historic stock on hand in stock evolution chart */
  numberOfHistoricDataPoints?: InputMaybe<Scalars['Int']['input']>;
  /** Defaults to 20, number of data points for projected stock on hand in stock evolution chart */
  numberOfProjectedDataPoints?: InputMaybe<Scalars['Int']['input']>;
};

export type StockLineAlreadyExistsInInvoice = InsertOutboundShipmentLineErrorInterface & InsertPrescriptionLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdatePrescriptionLineErrorInterface & {
  __typename: 'StockLineAlreadyExistsInInvoice';
  description: Scalars['String']['output'];
  line: InvoiceLineNode;
};

export type StockLineConnector = {
  __typename: 'StockLineConnector';
  nodes: Array<StockLineNode>;
  totalCount: Scalars['Int']['output'];
};

export type StockLineFilterInput = {
  expiryDate?: InputMaybe<DateFilterInput>;
  hasPacksInStore?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<EqualFilterStringInput>;
  isAvailable?: InputMaybe<Scalars['Boolean']['input']>;
  itemCodeOrName?: InputMaybe<StringFilterInput>;
  itemId?: InputMaybe<EqualFilterStringInput>;
  location?: InputMaybe<LocationFilterInput>;
  locationId?: InputMaybe<EqualFilterStringInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
};

export type StockLineIsOnHold = InsertOutboundShipmentLineErrorInterface & InsertPrescriptionLineErrorInterface & UpdateOutboundShipmentLineErrorInterface & UpdatePrescriptionLineErrorInterface & {
  __typename: 'StockLineIsOnHold';
  description: Scalars['String']['output'];
};

export type StockLineNode = {
  __typename: 'StockLineNode';
  availableNumberOfPacks: Scalars['Float']['output'];
  barcode?: Maybe<Scalars['String']['output']>;
  batch?: Maybe<Scalars['String']['output']>;
  costPricePerPack: Scalars['Float']['output'];
  expiryDate?: Maybe<Scalars['NaiveDate']['output']>;
  id: Scalars['String']['output'];
  item: ItemNode;
  itemId: Scalars['String']['output'];
  location?: Maybe<LocationNode>;
  locationId?: Maybe<Scalars['String']['output']>;
  locationName?: Maybe<Scalars['String']['output']>;
  note?: Maybe<Scalars['String']['output']>;
  onHold: Scalars['Boolean']['output'];
  packSize: Scalars['Int']['output'];
  sellPricePerPack: Scalars['Float']['output'];
  storeId: Scalars['String']['output'];
  supplierName?: Maybe<Scalars['String']['output']>;
  totalNumberOfPacks: Scalars['Float']['output'];
};

export type StockLineReducedBelowZero = InsertInventoryAdjustmentErrorInterface & InsertRepackErrorInterface & InsertStocktakeLineErrorInterface & UpdateStocktakeLineErrorInterface & {
  __typename: 'StockLineReducedBelowZero';
  description: Scalars['String']['output'];
  stockLine: StockLineNode;
};

export type StockLineResponse = NodeError | StockLineNode;

export enum StockLineSortFieldInput {
  Batch = 'batch',
  ExpiryDate = 'expiryDate',
  ItemCode = 'itemCode',
  ItemName = 'itemName',
  LocationCode = 'locationCode',
  NumberOfPacks = 'numberOfPacks',
  PackSize = 'packSize',
  SupplierName = 'supplierName'
}

export type StockLineSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: StockLineSortFieldInput;
};

export type StockLinesReducedBelowZero = UpdateStocktakeErrorInterface & {
  __typename: 'StockLinesReducedBelowZero';
  description: Scalars['String']['output'];
  errors: Array<StockLineReducedBelowZero>;
};

export type StockLinesResponse = StockLineConnector;

export type StocktakeConnector = {
  __typename: 'StocktakeConnector';
  nodes: Array<StocktakeNode>;
  totalCount: Scalars['Int']['output'];
};

export type StocktakeFilterInput = {
  comment?: InputMaybe<StringFilterInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  description?: InputMaybe<StringFilterInput>;
  finalisedDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  isLocked?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<EqualFilterStocktakeStatusInput>;
  stocktakeDate?: InputMaybe<DateFilterInput>;
  stocktakeNumber?: InputMaybe<EqualFilterBigNumberInput>;
  userId?: InputMaybe<EqualFilterStringInput>;
};

export type StocktakeIsLocked = UpdateStocktakeErrorInterface & {
  __typename: 'StocktakeIsLocked';
  description: Scalars['String']['output'];
};

export type StocktakeLineConnector = {
  __typename: 'StocktakeLineConnector';
  nodes: Array<StocktakeLineNode>;
  totalCount: Scalars['Int']['output'];
};

export type StocktakeLineFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  itemCodeOrName?: InputMaybe<StringFilterInput>;
  locationId?: InputMaybe<EqualFilterStringInput>;
  stocktakeId?: InputMaybe<EqualFilterStringInput>;
};

export type StocktakeLineNode = {
  __typename: 'StocktakeLineNode';
  batch?: Maybe<Scalars['String']['output']>;
  comment?: Maybe<Scalars['String']['output']>;
  costPricePerPack?: Maybe<Scalars['Float']['output']>;
  countedNumberOfPacks?: Maybe<Scalars['Float']['output']>;
  expiryDate?: Maybe<Scalars['NaiveDate']['output']>;
  id: Scalars['String']['output'];
  inventoryAdjustmentReason?: Maybe<InventoryAdjustmentReasonNode>;
  inventoryAdjustmentReasonId?: Maybe<Scalars['String']['output']>;
  item: ItemNode;
  itemId: Scalars['String']['output'];
  itemName: Scalars['String']['output'];
  location?: Maybe<LocationNode>;
  note?: Maybe<Scalars['String']['output']>;
  packSize?: Maybe<Scalars['Int']['output']>;
  sellPricePerPack?: Maybe<Scalars['Float']['output']>;
  snapshotNumberOfPacks: Scalars['Float']['output'];
  stockLine?: Maybe<StockLineNode>;
  stocktakeId: Scalars['String']['output'];
};

export enum StocktakeLineSortFieldInput {
  Batch = 'batch',
  ExpiryDate = 'expiryDate',
  ItemCode = 'itemCode',
  ItemName = 'itemName',
  LocationCode = 'locationCode',
  PackSize = 'packSize'
}

export type StocktakeLineSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: StocktakeLineSortFieldInput;
};

export type StocktakeNode = {
  __typename: 'StocktakeNode';
  comment?: Maybe<Scalars['String']['output']>;
  createdDatetime: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  finalisedDatetime?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  inventoryAddition?: Maybe<InvoiceNode>;
  inventoryAdditionId?: Maybe<Scalars['String']['output']>;
  inventoryReduction?: Maybe<InvoiceNode>;
  inventoryReductionId?: Maybe<Scalars['String']['output']>;
  isLocked: Scalars['Boolean']['output'];
  lines: StocktakeLineConnector;
  status: StocktakeNodeStatus;
  stocktakeDate?: Maybe<Scalars['NaiveDate']['output']>;
  stocktakeNumber: Scalars['Int']['output'];
  storeId: Scalars['String']['output'];
  user?: Maybe<UserNode>;
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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: StocktakeSortFieldInput;
};

export type StocktakesLinesResponse = StocktakeLineConnector;

export type StocktakesResponse = StocktakeConnector;

export type StoreConnector = {
  __typename: 'StoreConnector';
  nodes: Array<StoreNode>;
  totalCount: Scalars['Int']['output'];
};

export type StoreFilterInput = {
  code?: InputMaybe<StringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
  nameCode?: InputMaybe<StringFilterInput>;
  siteId?: InputMaybe<EqualFilterNumberInput>;
};

export enum StoreModeNodeType {
  Dispensary = 'DISPENSARY',
  Store = 'STORE'
}

export type StoreNode = {
  __typename: 'StoreNode';
  code: Scalars['String']['output'];
  createdDate?: Maybe<Scalars['NaiveDate']['output']>;
  id: Scalars['String']['output'];
  /**
   * Returns the associated store logo.
   * The logo is returned as a data URL schema, e.g. "data:image/png;base64,..."
   */
  logo?: Maybe<Scalars['String']['output']>;
  name: NameNode;
  siteId: Scalars['Int']['output'];
  storeName: Scalars['String']['output'];
};


export type StoreNodeNameArgs = {
  storeId: Scalars['String']['input'];
};

export type StorePreferenceNode = {
  __typename: 'StorePreferenceNode';
  id: Scalars['String']['output'];
  issueInForeignCurrency: Scalars['Boolean']['output'];
  omProgramModule: Scalars['Boolean']['output'];
  packToOne: Scalars['Boolean']['output'];
  requestRequisitionRequiresAuthorisation: Scalars['Boolean']['output'];
  responseRequisitionRequiresAuthorisation: Scalars['Boolean']['output'];
  vaccineModule: Scalars['Boolean']['output'];
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
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: StoreSortFieldInput;
};

export type StoresResponse = StoreConnector;

export type StringFilterInput = {
  /** Search term must be an exact match (case sensitive) */
  equalTo?: InputMaybe<Scalars['String']['input']>;
  /** Search term must be included in search candidate (case insensitive) */
  like?: InputMaybe<Scalars['String']['input']>;
};

export type SuggestedNextEncounterNode = {
  __typename: 'SuggestedNextEncounterNode';
  label?: Maybe<Scalars['String']['output']>;
  startDatetime: Scalars['DateTime']['output'];
};

export type SuggestedQuantityCalculationNode = {
  __typename: 'SuggestedQuantityCalculationNode';
  averageMonthlyConsumption: Scalars['Int']['output'];
  maximumStockOnHand: Scalars['Int']['output'];
  minimumStockOnHand: Scalars['Int']['output'];
  stockOnHand: Scalars['Int']['output'];
  suggestedQuantity: Scalars['Int']['output'];
};

export type SupplyRequestedQuantityError = {
  __typename: 'SupplyRequestedQuantityError';
  error: SupplyRequestedQuantityErrorInterface;
};

export type SupplyRequestedQuantityErrorInterface = {
  description: Scalars['String']['output'];
};

export type SupplyRequestedQuantityInput = {
  responseRequisitionId: Scalars['String']['input'];
};

export type SupplyRequestedQuantityResponse = RequisitionLineConnector | SupplyRequestedQuantityError;

export type SyncErrorNode = {
  __typename: 'SyncErrorNode';
  fullError: Scalars['String']['output'];
  variant: SyncErrorVariant;
};

export enum SyncErrorVariant {
  ApiVersionIncompatible = 'API_VERSION_INCOMPATIBLE',
  CentralV6NotConfigured = 'CENTRAL_V6_NOT_CONFIGURED',
  ConnectionError = 'CONNECTION_ERROR',
  HardwareIdMismatch = 'HARDWARE_ID_MISMATCH',
  IncorrectPassword = 'INCORRECT_PASSWORD',
  IntegrationError = 'INTEGRATION_ERROR',
  IntegrationTimeoutReached = 'INTEGRATION_TIMEOUT_REACHED',
  InvalidUrl = 'INVALID_URL',
  SiteAuthTimeout = 'SITE_AUTH_TIMEOUT',
  SiteHasNoStore = 'SITE_HAS_NO_STORE',
  SiteNameNotFound = 'SITE_NAME_NOT_FOUND',
  SiteUuidIsBeingChanged = 'SITE_UUID_IS_BEING_CHANGED',
  Unknown = 'UNKNOWN'
}

export type SyncFileReferenceConnector = {
  __typename: 'SyncFileReferenceConnector';
  nodes: Array<SyncFileReferenceNode>;
  totalCount: Scalars['Int']['output'];
};

export type SyncFileReferenceNode = {
  __typename: 'SyncFileReferenceNode';
  createdDatetime: Scalars['NaiveDateTime']['output'];
  fileName: Scalars['String']['output'];
  id: Scalars['String']['output'];
  mimeType?: Maybe<Scalars['String']['output']>;
  recordId: Scalars['String']['output'];
  tableName: Scalars['String']['output'];
};

export type SyncSettingsInput = {
  /** Sync interval */
  intervalSeconds: Scalars['Int']['input'];
  /** Plain text password */
  password: Scalars['String']['input'];
  url: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type SyncSettingsNode = {
  __typename: 'SyncSettingsNode';
  /** How frequently central data is synced */
  intervalSeconds: Scalars['Int']['output'];
  /** Central server url */
  url: Scalars['String']['output'];
  /** Central server username */
  username: Scalars['String']['output'];
};

export type SyncStatusNode = {
  __typename: 'SyncStatusNode';
  finished?: Maybe<Scalars['DateTime']['output']>;
  started: Scalars['DateTime']['output'];
};

export type SyncStatusWithProgressNode = {
  __typename: 'SyncStatusWithProgressNode';
  done?: Maybe<Scalars['Int']['output']>;
  finished?: Maybe<Scalars['DateTime']['output']>;
  started: Scalars['DateTime']['output'];
  total?: Maybe<Scalars['Int']['output']>;
};

export type TaxInput = {
  /** Set or unset the tax value (in percentage) */
  percentage?: InputMaybe<Scalars['Float']['input']>;
};

export type TemperatureBreachConnector = {
  __typename: 'TemperatureBreachConnector';
  nodes: Array<TemperatureBreachNode>;
  totalCount: Scalars['Int']['output'];
};

export type TemperatureBreachFilterInput = {
  endDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  location?: InputMaybe<LocationFilterInput>;
  sensor?: InputMaybe<SensorFilterInput>;
  startDatetime?: InputMaybe<DatetimeFilterInput>;
  type?: InputMaybe<EqualFilterTemperatureBreachRowTypeInput>;
  unacknowledged?: InputMaybe<Scalars['Boolean']['input']>;
};

export type TemperatureBreachNode = {
  __typename: 'TemperatureBreachNode';
  comment?: Maybe<Scalars['String']['output']>;
  durationMilliseconds: Scalars['Int']['output'];
  endDatetime?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['String']['output'];
  location?: Maybe<LocationNode>;
  maxOrMinTemperature?: Maybe<Scalars['Float']['output']>;
  sensor?: Maybe<SensorNode>;
  sensorId: Scalars['String']['output'];
  startDatetime: Scalars['DateTime']['output'];
  type: TemperatureBreachNodeType;
  unacknowledged: Scalars['Boolean']['output'];
};

export enum TemperatureBreachNodeType {
  ColdConsecutive = 'COLD_CONSECUTIVE',
  ColdCumulative = 'COLD_CUMULATIVE',
  HotConsecutive = 'HOT_CONSECUTIVE',
  HotCumulative = 'HOT_CUMULATIVE'
}

export enum TemperatureBreachSortFieldInput {
  EndDatetime = 'endDatetime',
  StartDatetime = 'startDatetime'
}

export type TemperatureBreachSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: TemperatureBreachSortFieldInput;
};

export type TemperatureBreachesResponse = TemperatureBreachConnector;

export type TemperatureExcursionConnector = {
  __typename: 'TemperatureExcursionConnector';
  nodes: Array<TemperatureExcursionNode>;
  totalCount: Scalars['Int']['output'];
};

export type TemperatureExcursionNode = {
  __typename: 'TemperatureExcursionNode';
  id: Scalars['String']['output'];
  location?: Maybe<LocationNode>;
  maxOrMinTemperature: Scalars['Float']['output'];
  sensor?: Maybe<SensorNode>;
  sensorId: Scalars['String']['output'];
  startDatetime: Scalars['DateTime']['output'];
};

export type TemperatureLogConnector = {
  __typename: 'TemperatureLogConnector';
  nodes: Array<TemperatureLogNode>;
  totalCount: Scalars['Int']['output'];
};

export type TemperatureLogFilterInput = {
  datetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  location?: InputMaybe<LocationFilterInput>;
  sensor?: InputMaybe<SensorFilterInput>;
  temperatureBreach?: InputMaybe<TemperatureBreachFilterInput>;
};

export type TemperatureLogNode = {
  __typename: 'TemperatureLogNode';
  datetime: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  location?: Maybe<LocationNode>;
  sensor?: Maybe<SensorNode>;
  sensorId: Scalars['String']['output'];
  temperature: Scalars['Float']['output'];
  temperatureBreach?: Maybe<TemperatureBreachNode>;
};

export enum TemperatureLogSortFieldInput {
  Datetime = 'datetime',
  Temperature = 'temperature'
}

export type TemperatureLogSortInput = {
  /**
   * 	Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: TemperatureLogSortFieldInput;
};

export type TemperatureLogsResponse = TemperatureLogConnector;

export type TemperatureNotificationConnector = {
  __typename: 'TemperatureNotificationConnector';
  breaches: TemperatureBreachConnector;
  excursions: TemperatureExcursionConnector;
};

export type TemperatureNotificationsResponse = TemperatureNotificationConnector;

export type TokenExpired = RefreshTokenErrorInterface & {
  __typename: 'TokenExpired';
  description: Scalars['String']['output'];
};

export type UnallocatedLineForItemAlreadyExists = InsertOutboundShipmentUnallocatedLineErrorInterface & {
  __typename: 'UnallocatedLineForItemAlreadyExists';
  description: Scalars['String']['output'];
};

export type UnallocatedLinesOnlyEditableInNewInvoice = InsertOutboundShipmentUnallocatedLineErrorInterface & {
  __typename: 'UnallocatedLinesOnlyEditableInNewInvoice';
  description: Scalars['String']['output'];
};

export enum UniqueCombinationKey {
  Manufacturer = 'manufacturer',
  Model = 'model'
}

export type UniqueCombinationViolation = InsertAssetCatalogueItemErrorInterface & {
  __typename: 'UniqueCombinationViolation';
  description: Scalars['String']['output'];
  fields: Array<UniqueCombinationKey>;
};

export enum UniqueValueKey {
  Code = 'code',
  Serial = 'serial'
}

export type UniqueValueViolation = InsertAssetCatalogueItemErrorInterface & InsertAssetErrorInterface & InsertAssetLogErrorInterface & InsertAssetLogReasonErrorInterface & InsertLocationErrorInterface & UpdateAssetErrorInterface & UpdateLocationErrorInterface & UpdateSensorErrorInterface & {
  __typename: 'UniqueValueViolation';
  description: Scalars['String']['output'];
  field: UniqueValueKey;
};

export type UpdateAssetError = {
  __typename: 'UpdateAssetError';
  error: UpdateAssetErrorInterface;
};

export type UpdateAssetErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateAssetInput = {
  assetNumber?: InputMaybe<Scalars['String']['input']>;
  catalogueItemId?: InputMaybe<NullableStringUpdate>;
  donorNameId?: InputMaybe<NullableStringUpdate>;
  id: Scalars['String']['input'];
  installationDate?: InputMaybe<NullableDateUpdate>;
  locationIds?: InputMaybe<Array<Scalars['String']['input']>>;
  notes?: InputMaybe<Scalars['String']['input']>;
  properties?: InputMaybe<Scalars['String']['input']>;
  replacementDate?: InputMaybe<NullableDateUpdate>;
  serialNumber?: InputMaybe<NullableStringUpdate>;
  storeId?: InputMaybe<NullableStringUpdate>;
  warrantyEnd?: InputMaybe<NullableDateUpdate>;
  warrantyStart?: InputMaybe<NullableDateUpdate>;
};

export type UpdateAssetResponse = AssetNode | UpdateAssetError;

export type UpdateContactTraceInput = {
  /** Contact trace document data */
  data: Scalars['JSON']['input'];
  /** The document ID of the contact trace document which should be updated */
  parent: Scalars['String']['input'];
  /** The patient ID the contact belongs to */
  patientId: Scalars['String']['input'];
  /** The schema id used for the contact trace data */
  schemaId: Scalars['String']['input'];
  /** The contact trace document type */
  type: Scalars['String']['input'];
};

export type UpdateContactTraceResponse = ContactTraceNode;

export type UpdateDisplaySettingsError = {
  __typename: 'UpdateDisplaySettingsError';
  error: Scalars['String']['output'];
};

export type UpdateDisplaySettingsResponse = UpdateDisplaySettingsError | UpdateResult;

export type UpdateDocumentError = {
  __typename: 'UpdateDocumentError';
  error: UpdateDocumentErrorInterface;
};

export type UpdateDocumentErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateDocumentInput = {
  author: Scalars['String']['input'];
  data: Scalars['JSON']['input'];
  name: Scalars['String']['input'];
  parents: Array<Scalars['String']['input']>;
  patientId?: InputMaybe<Scalars['String']['input']>;
  schemaId?: InputMaybe<Scalars['String']['input']>;
  timestamp: Scalars['DateTime']['input'];
  type: Scalars['String']['input'];
};

export type UpdateDocumentResponse = DocumentNode | UpdateDocumentError;

export type UpdateEncounterInput = {
  /** Encounter document data */
  data: Scalars['JSON']['input'];
  /** The document id of the encounter document which should be updated */
  parent: Scalars['String']['input'];
  /** The schema id used for the encounter data */
  schemaId: Scalars['String']['input'];
  /** The encounter type */
  type: Scalars['String']['input'];
};

export type UpdateEncounterResponse = EncounterNode;

export type UpdateErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateInboundReturnInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<UpdateInboundReturnStatusInput>;
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateInboundReturnLinesInput = {
  inboundReturnId: Scalars['String']['input'];
  inboundReturnLines: Array<InboundReturnLineInput>;
};

export type UpdateInboundReturnLinesResponse = InvoiceNode;

export type UpdateInboundReturnResponse = InvoiceNode;

export enum UpdateInboundReturnStatusInput {
  Delivered = 'DELIVERED',
  Verified = 'VERIFIED'
}

export type UpdateInboundShipmentError = {
  __typename: 'UpdateInboundShipmentError';
  error: UpdateInboundShipmentErrorInterface;
};

export type UpdateInboundShipmentErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateInboundShipmentInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  currencyId?: InputMaybe<Scalars['String']['input']>;
  currencyRate?: InputMaybe<Scalars['Float']['input']>;
  id: Scalars['String']['input'];
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  otherPartyId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UpdateInboundShipmentStatusInput>;
  tax?: InputMaybe<TaxInput>;
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateInboundShipmentLineError = {
  __typename: 'UpdateInboundShipmentLineError';
  error: UpdateInboundShipmentLineErrorInterface;
};

export type UpdateInboundShipmentLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateInboundShipmentLineInput = {
  batch?: InputMaybe<Scalars['String']['input']>;
  costPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  itemId?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<NullableStringUpdate>;
  numberOfPacks?: InputMaybe<Scalars['Float']['input']>;
  packSize?: InputMaybe<Scalars['Int']['input']>;
  sellPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  tax?: InputMaybe<TaxInput>;
  totalBeforeTax?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateInboundShipmentLineResponse = InvoiceLineNode | UpdateInboundShipmentLineError;

export type UpdateInboundShipmentLineResponseWithId = {
  __typename: 'UpdateInboundShipmentLineResponseWithId';
  id: Scalars['String']['output'];
  response: UpdateInboundShipmentLineResponse;
};

export type UpdateInboundShipmentResponse = InvoiceNode | UpdateInboundShipmentError;

export type UpdateInboundShipmentResponseWithId = {
  __typename: 'UpdateInboundShipmentResponseWithId';
  id: Scalars['String']['output'];
  response: UpdateInboundShipmentResponse;
};

export type UpdateInboundShipmentServiceLineError = {
  __typename: 'UpdateInboundShipmentServiceLineError';
  error: UpdateInboundShipmentServiceLineErrorInterface;
};

export type UpdateInboundShipmentServiceLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateInboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
  itemId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  tax?: InputMaybe<TaxInput>;
  totalBeforeTax?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateInboundShipmentServiceLineResponse = InvoiceLineNode | UpdateInboundShipmentServiceLineError;

export type UpdateInboundShipmentServiceLineResponseWithId = {
  __typename: 'UpdateInboundShipmentServiceLineResponseWithId';
  id: Scalars['String']['output'];
  response: UpdateInboundShipmentServiceLineResponse;
};

export enum UpdateInboundShipmentStatusInput {
  Delivered = 'DELIVERED',
  Verified = 'VERIFIED'
}

export type UpdateLabelPrinterSettingsError = {
  __typename: 'UpdateLabelPrinterSettingsError';
  error: Scalars['String']['output'];
};

export type UpdateLabelPrinterSettingsResponse = LabelPrinterUpdateResult | UpdateLabelPrinterSettingsError;

export type UpdateLocationError = {
  __typename: 'UpdateLocationError';
  error: UpdateLocationErrorInterface;
};

export type UpdateLocationErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateLocationInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateLocationResponse = LocationNode | UpdateLocationError;

export type UpdateNameErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateOutboundReturnInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<UpdateOutboundReturnStatusInput>;
  theirReference?: InputMaybe<Scalars['String']['input']>;
  transportReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOutboundReturnLinesInput = {
  outboundReturnId: Scalars['String']['input'];
  outboundReturnLines: Array<OutboundReturnLineInput>;
};

export type UpdateOutboundReturnLinesResponse = InvoiceNode;

export type UpdateOutboundReturnResponse = InvoiceNode;

export enum UpdateOutboundReturnStatusInput {
  Picked = 'PICKED',
  Shipped = 'SHIPPED'
}

export type UpdateOutboundShipmentError = {
  __typename: 'UpdateOutboundShipmentError';
  error: UpdateErrorInterface;
};

export type UpdateOutboundShipmentInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  currencyId?: InputMaybe<Scalars['String']['input']>;
  currencyRate?: InputMaybe<Scalars['Float']['input']>;
  /** The new invoice id provided by the client */
  id: Scalars['String']['input'];
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  /**
   * 	When changing the status from DRAFT to CONFIRMED or FINALISED the total_number_of_packs for
   * existing invoice items gets updated.
   */
  status?: InputMaybe<UpdateOutboundShipmentStatusInput>;
  tax?: InputMaybe<TaxInput>;
  /** External invoice reference, e.g. purchase or shipment number */
  theirReference?: InputMaybe<Scalars['String']['input']>;
  transportReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOutboundShipmentLineError = {
  __typename: 'UpdateOutboundShipmentLineError';
  error: UpdateOutboundShipmentLineErrorInterface;
};

export type UpdateOutboundShipmentLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateOutboundShipmentLineInput = {
  id: Scalars['String']['input'];
  numberOfPacks?: InputMaybe<Scalars['Float']['input']>;
  stockLineId?: InputMaybe<Scalars['String']['input']>;
  tax?: InputMaybe<TaxInput>;
  totalBeforeTax?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateOutboundShipmentLineResponse = InvoiceLineNode | UpdateOutboundShipmentLineError;

export type UpdateOutboundShipmentLineResponseWithId = {
  __typename: 'UpdateOutboundShipmentLineResponseWithId';
  id: Scalars['String']['output'];
  response: UpdateOutboundShipmentLineResponse;
};

export type UpdateOutboundShipmentNameError = {
  __typename: 'UpdateOutboundShipmentNameError';
  error: UpdateNameErrorInterface;
};

export type UpdateOutboundShipmentNameInput = {
  id: Scalars['String']['input'];
  otherPartyId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOutboundShipmentNameResponse = InvoiceNode | UpdateOutboundShipmentNameError;

export type UpdateOutboundShipmentResponse = InvoiceNode | NodeError | UpdateOutboundShipmentError;

export type UpdateOutboundShipmentResponseWithId = {
  __typename: 'UpdateOutboundShipmentResponseWithId';
  id: Scalars['String']['output'];
  response: UpdateOutboundShipmentResponse;
};

export type UpdateOutboundShipmentServiceLineError = {
  __typename: 'UpdateOutboundShipmentServiceLineError';
  error: UpdateOutboundShipmentServiceLineErrorInterface;
};

export type UpdateOutboundShipmentServiceLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateOutboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
  itemId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  tax?: InputMaybe<TaxInput>;
  totalBeforeTax?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateOutboundShipmentServiceLineResponse = InvoiceLineNode | UpdateOutboundShipmentServiceLineError;

export type UpdateOutboundShipmentServiceLineResponseWithId = {
  __typename: 'UpdateOutboundShipmentServiceLineResponseWithId';
  id: Scalars['String']['output'];
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
  description: Scalars['String']['output'];
};

export type UpdateOutboundShipmentUnallocatedLineInput = {
  id: Scalars['String']['input'];
  quantity: Scalars['Int']['input'];
};

export type UpdateOutboundShipmentUnallocatedLineResponse = InvoiceLineNode | UpdateOutboundShipmentUnallocatedLineError;

export type UpdateOutboundShipmentUnallocatedLineResponseWithId = {
  __typename: 'UpdateOutboundShipmentUnallocatedLineResponseWithId';
  id: Scalars['String']['output'];
  response: UpdateOutboundShipmentUnallocatedLineResponse;
};

export type UpdatePackVariantError = {
  __typename: 'UpdatePackVariantError';
  error: UpdatePackVariantErrorInterface;
};

export type UpdatePackVariantErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdatePackVariantInput = {
  id: Scalars['String']['input'];
  longName: Scalars['String']['input'];
  shortName: Scalars['String']['input'];
};

export type UpdatePackVariantResponse = UpdatePackVariantError | VariantNode;

/**
 * All fields in the input object will be used to update the patient record.
 * This means that the caller also has to provide the fields that are not going to change.
 * For example, if the last_name is not provided, the last_name in the patient record will be cleared.
 */
export type UpdatePatientInput = {
  address1?: InputMaybe<Scalars['String']['input']>;
  code: Scalars['String']['input'];
  code2?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['NaiveDate']['input']>;
  dateOfDeath?: InputMaybe<Scalars['NaiveDate']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<GenderInput>;
  id: Scalars['String']['input'];
  isDeceased?: InputMaybe<Scalars['Boolean']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePatientResponse = PatientNode;

export type UpdatePluginDataInput = {
  data: Scalars['String']['input'];
  id: Scalars['String']['input'];
  pluginName: Scalars['String']['input'];
  relatedRecordId: Scalars['String']['input'];
  relatedRecordType: RelatedRecordNodeType;
};

export type UpdatePluginDataResponse = PluginDataNode;

export type UpdatePrescriptionError = {
  __typename: 'UpdatePrescriptionError';
  error: UpdatePrescriptionErrorInterface;
};

export type UpdatePrescriptionErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdatePrescriptionInput = {
  clinicianId?: InputMaybe<Scalars['String']['input']>;
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  patientId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UpdatePrescriptionStatusInput>;
};

export type UpdatePrescriptionLineError = {
  __typename: 'UpdatePrescriptionLineError';
  error: UpdatePrescriptionLineErrorInterface;
};

export type UpdatePrescriptionLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdatePrescriptionLineInput = {
  id: Scalars['String']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  numberOfPacks?: InputMaybe<Scalars['Float']['input']>;
  stockLineId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePrescriptionLineResponse = InvoiceLineNode | UpdatePrescriptionLineError;

export type UpdatePrescriptionLineResponseWithId = {
  __typename: 'UpdatePrescriptionLineResponseWithId';
  id: Scalars['String']['output'];
  response: UpdatePrescriptionLineResponse;
};

export type UpdatePrescriptionResponse = InvoiceNode | NodeError | UpdatePrescriptionError;

export type UpdatePrescriptionResponseWithId = {
  __typename: 'UpdatePrescriptionResponseWithId';
  id: Scalars['String']['output'];
  response: UpdatePrescriptionResponse;
};

export enum UpdatePrescriptionStatusInput {
  Picked = 'PICKED',
  Verified = 'VERIFIED'
}

export type UpdateProgramEnrolmentInput = {
  /** Program document data */
  data: Scalars['JSON']['input'];
  parent: Scalars['String']['input'];
  patientId: Scalars['String']['input'];
  /** The schema id used for the program data */
  schemaId: Scalars['String']['input'];
  /** The program type */
  type: Scalars['String']['input'];
};

export type UpdateProgramEnrolmentResponse = ProgramEnrolmentNode;

export type UpdateProgramPatientInput = {
  /** Patient document data */
  data: Scalars['JSON']['input'];
  parent: Scalars['String']['input'];
  /** The schema id used for the patient data */
  schemaId: Scalars['String']['input'];
};

export type UpdateProgramPatientResponse = PatientNode;

export type UpdateRequestRequisitionError = {
  __typename: 'UpdateRequestRequisitionError';
  error: UpdateRequestRequisitionErrorInterface;
};

export type UpdateRequestRequisitionErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateRequestRequisitionInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  expectedDeliveryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  maxMonthsOfStock?: InputMaybe<Scalars['Float']['input']>;
  minMonthsOfStock?: InputMaybe<Scalars['Float']['input']>;
  otherPartyId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UpdateRequestRequisitionStatusInput>;
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRequestRequisitionLineError = {
  __typename: 'UpdateRequestRequisitionLineError';
  error: UpdateRequestRequisitionLineErrorInterface;
};

export type UpdateRequestRequisitionLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateRequestRequisitionLineInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  requestedQuantity?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateRequestRequisitionLineResponse = RequisitionLineNode | UpdateRequestRequisitionLineError;

export type UpdateRequestRequisitionLineResponseWithId = {
  __typename: 'UpdateRequestRequisitionLineResponseWithId';
  id: Scalars['String']['output'];
  response: UpdateRequestRequisitionLineResponse;
};

export type UpdateRequestRequisitionResponse = RequisitionNode | UpdateRequestRequisitionError;

export type UpdateRequestRequisitionResponseWithId = {
  __typename: 'UpdateRequestRequisitionResponseWithId';
  id: Scalars['String']['output'];
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
  description: Scalars['String']['output'];
};

export type UpdateResponseRequisitionInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  status?: InputMaybe<UpdateResponseRequisitionStatusInput>;
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateResponseRequisitionLineError = {
  __typename: 'UpdateResponseRequisitionLineError';
  error: UpdateResponseRequisitionLineErrorInterface;
};

export type UpdateResponseRequisitionLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateResponseRequisitionLineInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  supplyQuantity?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateResponseRequisitionLineResponse = RequisitionLineNode | UpdateResponseRequisitionLineError;

export type UpdateResponseRequisitionResponse = RequisitionNode | UpdateResponseRequisitionError;

export enum UpdateResponseRequisitionStatusInput {
  Finalised = 'FINALISED'
}

export type UpdateResult = {
  __typename: 'UpdateResult';
  logo?: Maybe<Scalars['String']['output']>;
  theme?: Maybe<Scalars['String']['output']>;
};

export type UpdateSensorError = {
  __typename: 'UpdateSensorError';
  error: UpdateSensorErrorInterface;
};

export type UpdateSensorErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateSensorInput = {
  id: Scalars['String']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  locationId?: InputMaybe<NullableStringUpdate>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSensorResponse = SensorNode | UpdateSensorError;

export type UpdateStockLineError = {
  __typename: 'UpdateStockLineError';
  error: UpdateStockLineErrorInterface;
};

export type UpdateStockLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateStockLineInput = {
  /** Empty barcode will unlink barcode from StockLine */
  barcode?: InputMaybe<Scalars['String']['input']>;
  batch?: InputMaybe<Scalars['String']['input']>;
  costPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  location?: InputMaybe<NullableStringUpdate>;
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  sellPricePerPack?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateStockLineLineResponse = StockLineNode | UpdateStockLineError;

export type UpdateStocktakeError = {
  __typename: 'UpdateStocktakeError';
  error: UpdateStocktakeErrorInterface;
};

export type UpdateStocktakeErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateStocktakeInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  isLocked?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<UpdateStocktakeStatusInput>;
  stocktakeDate?: InputMaybe<Scalars['NaiveDate']['input']>;
};

export type UpdateStocktakeLineError = {
  __typename: 'UpdateStocktakeLineError';
  error: UpdateStocktakeLineErrorInterface;
};

export type UpdateStocktakeLineErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateStocktakeLineInput = {
  batch?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  costPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  countedNumberOfPacks?: InputMaybe<Scalars['Float']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  inventoryAdjustmentReasonId?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<NullableStringUpdate>;
  note?: InputMaybe<Scalars['String']['input']>;
  packSize?: InputMaybe<Scalars['Int']['input']>;
  sellPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  snapshotNumberOfPacks?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateStocktakeLineResponse = StocktakeLineNode | UpdateStocktakeLineError;

export type UpdateStocktakeLineResponseWithId = {
  __typename: 'UpdateStocktakeLineResponseWithId';
  id: Scalars['String']['output'];
  response: UpdateStocktakeLineResponse;
};

export type UpdateStocktakeResponse = StocktakeNode | UpdateStocktakeError;

export type UpdateStocktakeResponseWithId = {
  __typename: 'UpdateStocktakeResponseWithId';
  id: Scalars['String']['output'];
  response: UpdateStocktakeResponse;
};

export enum UpdateStocktakeStatusInput {
  Finalised = 'FINALISED'
}

export type UpdateSyncSettingsResponse = SyncErrorNode | SyncSettingsNode;

export type UpdateTemperatureBreachInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  unacknowledged: Scalars['Boolean']['input'];
};

export type UpdateTemperatureBreachResponse = TemperatureBreachNode;

export type UpdateUserError = {
  __typename: 'UpdateUserError';
  error: UpdateUserErrorInterface;
};

export type UpdateUserErrorInterface = {
  description: Scalars['String']['output'];
};

export type UpdateUserNode = {
  __typename: 'UpdateUserNode';
  lastSuccessfulSync?: Maybe<Scalars['DateTime']['output']>;
};

export type UpdateUserResponse = UpdateUserError | UpdateUserNode;

export type UpsertLogLevelInput = {
  level: LogLevelEnum;
};

export type UpsertLogLevelResponse = {
  __typename: 'UpsertLogLevelResponse';
  level: LogLevelEnum;
};

export type UseSuggestedQuantityError = {
  __typename: 'UseSuggestedQuantityError';
  error: UseSuggestedQuantityErrorInterface;
};

export type UseSuggestedQuantityErrorInterface = {
  description: Scalars['String']['output'];
};

export type UseSuggestedQuantityInput = {
  requestRequisitionId: Scalars['String']['input'];
};

export type UseSuggestedQuantityResponse = RequisitionLineConnector | UseSuggestedQuantityError;

export type UserNode = {
  __typename: 'UserNode';
  defaultStore?: Maybe<UserStoreNode>;
  /** The user's email address */
  email?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  jobTitle?: Maybe<Scalars['String']['output']>;
  language: LanguageType;
  lastName?: Maybe<Scalars['String']['output']>;
  permissions: UserStorePermissionConnector;
  phoneNumber?: Maybe<Scalars['String']['output']>;
  stores: UserStoreConnector;
  /** Internal user id */
  userId: Scalars['String']['output'];
  username: Scalars['String']['output'];
};


export type UserNodePermissionsArgs = {
  storeId?: InputMaybe<Scalars['String']['input']>;
};

export enum UserPermission {
  AssetCatalogueItemMutate = 'ASSET_CATALOGUE_ITEM_MUTATE',
  AssetMutate = 'ASSET_MUTATE',
  AssetQuery = 'ASSET_QUERY',
  ColdChainApi = 'COLD_CHAIN_API',
  CreateRepack = 'CREATE_REPACK',
  DocumentMutate = 'DOCUMENT_MUTATE',
  DocumentQuery = 'DOCUMENT_QUERY',
  InboundReturnMutate = 'INBOUND_RETURN_MUTATE',
  InboundReturnQuery = 'INBOUND_RETURN_QUERY',
  InboundShipmentMutate = 'INBOUND_SHIPMENT_MUTATE',
  InboundShipmentQuery = 'INBOUND_SHIPMENT_QUERY',
  InventoryAdjustmentMutate = 'INVENTORY_ADJUSTMENT_MUTATE',
  ItemMutate = 'ITEM_MUTATE',
  ItemNamesCodesAndUnitsMutate = 'ITEM_NAMES_CODES_AND_UNITS_MUTATE',
  LocationMutate = 'LOCATION_MUTATE',
  LogQuery = 'LOG_QUERY',
  OutboundReturnMutate = 'OUTBOUND_RETURN_MUTATE',
  OutboundReturnQuery = 'OUTBOUND_RETURN_QUERY',
  OutboundShipmentMutate = 'OUTBOUND_SHIPMENT_MUTATE',
  OutboundShipmentQuery = 'OUTBOUND_SHIPMENT_QUERY',
  PatientMutate = 'PATIENT_MUTATE',
  PatientQuery = 'PATIENT_QUERY',
  PrescriptionMutate = 'PRESCRIPTION_MUTATE',
  PrescriptionQuery = 'PRESCRIPTION_QUERY',
  Report = 'REPORT',
  RequisitionMutate = 'REQUISITION_MUTATE',
  RequisitionQuery = 'REQUISITION_QUERY',
  RequisitionSend = 'REQUISITION_SEND',
  SensorMutate = 'SENSOR_MUTATE',
  SensorQuery = 'SENSOR_QUERY',
  ServerAdmin = 'SERVER_ADMIN',
  StocktakeMutate = 'STOCKTAKE_MUTATE',
  StocktakeQuery = 'STOCKTAKE_QUERY',
  StockLineMutate = 'STOCK_LINE_MUTATE',
  StockLineQuery = 'STOCK_LINE_QUERY',
  StoreAccess = 'STORE_ACCESS',
  TemperatureBreachQuery = 'TEMPERATURE_BREACH_QUERY',
  TemperatureLogQuery = 'TEMPERATURE_LOG_QUERY'
}

export type UserResponse = UserNode;

export type UserStoreConnector = {
  __typename: 'UserStoreConnector';
  nodes: Array<UserStoreNode>;
  totalCount: Scalars['Int']['output'];
};

export type UserStoreNode = {
  __typename: 'UserStoreNode';
  code: Scalars['String']['output'];
  createdDate?: Maybe<Scalars['NaiveDate']['output']>;
  homeCurrencyCode?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  preferences: StorePreferenceNode;
  storeMode: StoreModeNodeType;
};

export type UserStorePermissionConnector = {
  __typename: 'UserStorePermissionConnector';
  nodes: Array<UserStorePermissionNode>;
  totalCount: Scalars['Int']['output'];
};

export type UserStorePermissionNode = {
  __typename: 'UserStorePermissionNode';
  context: Array<Scalars['String']['output']>;
  permissions: Array<UserPermission>;
  storeId: Scalars['String']['output'];
};

export type VariantNode = {
  __typename: 'VariantNode';
  id: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  itemId: Scalars['String']['output'];
  longName: Scalars['String']['output'];
  packSize: Scalars['Int']['output'];
  shortName: Scalars['String']['output'];
};

export type VariantWithPackSizeAlreadyExists = InsertPackVariantErrorInterface & {
  __typename: 'VariantWithPackSizeAlreadyExists';
  description: Scalars['String']['output'];
};
