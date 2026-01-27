import * as Types from '../../codegenTypes';

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
export type AllocateBatchOutboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: BatchOutboundShipmentInput;
}>;

export type AllocateBatchOutboundShipmentMutation = {
  __typename?: 'Mutations';
  batchOutboundShipment: {
    __typename?: 'BatchOutboundShipmentResponse';
    allocateOutboundShipmentUnallocatedLines?: Array<{
      __typename?: 'AllocateOutboundShipmentUnallocatedLineResponseWithId';
      id: string;
      response:
        | {
            __typename: 'AllocateOutboundShipmentUnallocatedLineError';
            error: { __typename?: 'RecordNotFound'; description: string };
          }
        | {
            __typename: 'AllocateOutboundShipmentUnallocatedLineNode';
            inserts: {
              __typename?: 'InvoiceLineConnector';
              nodes: Array<{
                __typename?: 'InvoiceLineNode';
                id: string;
                numberOfPacks: number;
                stockLine?: {
                  __typename?: 'StockLineNode';
                  batch?: string | null;
                } | null;
              }>;
            };
            updates: {
              __typename?: 'InvoiceLineConnector';
              nodes: Array<{ __typename?: 'InvoiceLineNode'; id: string }>;
            };
          };
    }> | null;
  };
};

export type BatchOutboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: BatchOutboundShipmentInput;
}>;

export type BatchOutboundShipmentMutation = {
  __typename?: 'Mutations';
  batchOutboundShipment: {
    __typename?: 'BatchOutboundShipmentResponse';
    insertOutboundShipments?: Array<{
      __typename?: 'InsertOutboundShipmentResponseWithId';
      id: string;
      response:
        | {
            __typename: 'InsertOutboundShipmentError';
            error:
              | { __typename?: 'OtherPartyNotACustomer'; description: string }
              | { __typename?: 'OtherPartyNotVisible'; description: string };
          }
        | { __typename: 'InvoiceNode'; id: string; invoiceNumber: number }
        | { __typename: 'NodeError' };
    }> | null;
    insertOutboundShipmentUnallocatedLines?: Array<{
      __typename?: 'InsertOutboundShipmentUnallocatedLineResponseWithId';
      id: string;
      response:
        | {
            __typename: 'InsertOutboundShipmentUnallocatedLineError';
            error:
              | { __typename?: 'ForeignKeyError'; description: string }
              | {
                  __typename?: 'UnallocatedLineForItemAlreadyExists';
                  description: string;
                }
              | {
                  __typename?: 'UnallocatedLinesOnlyEditableInNewInvoice';
                  description: string;
                };
          }
        | { __typename: 'InvoiceLineNode'; id: string };
    }> | null;
  };
};

export type NamesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<NameFilterInput>;
}>;

export type NamesQuery = {
  __typename?: 'Queries';
  names: {
    __typename: 'NameConnector';
    nodes: Array<{
      __typename?: 'NameNode';
      id: string;
      name: string;
      isCustomer: boolean;
    }>;
  };
};

export type ItemsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<ItemFilterInput>;
}>;

export type ItemsQuery = {
  __typename?: 'Queries';
  items: {
    __typename: 'ItemConnector';
    totalCount: number;
    nodes: Array<{
      __typename?: 'ItemNode';
      id: string;
      code: string;
      name: string;
      availableStockOnHand: number;
      stats: {
        __typename?: 'ItemStatsNode';
        availableStockOnHand: number;
        averageMonthlyConsumption: number;
      };
    }>;
  };
};

/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: any; output: any };
  JSON: { input: any; output: any };
  JSONObject: { input: any; output: any };
  NaiveDate: { input: any; output: any };
  NaiveDateTime: { input: any; output: any };
};

export type AbbreviationFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  text?: InputMaybe<StringFilterInput>;
};

export type ActiveEncounterEventFilterInput = {
  data?: InputMaybe<StringFilterInput>;
  /**
   * Only include events that are for the current encounter, i.e. have matching encounter type
   * and matching encounter name of the current encounter. If not set all events with matching
   * encounter type are returned.
   */
  isCurrentEncounter?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export type ActivityLogFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  recordId?: InputMaybe<EqualFilterStringInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterActivityLogTypeInput>;
  userId?: InputMaybe<EqualFilterStringInput>;
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
  DemographicIndicatorCreated = 'DEMOGRAPHIC_INDICATOR_CREATED',
  DemographicIndicatorUpdated = 'DEMOGRAPHIC_INDICATOR_UPDATED',
  DemographicProjectionCreated = 'DEMOGRAPHIC_PROJECTION_CREATED',
  DemographicProjectionUpdated = 'DEMOGRAPHIC_PROJECTION_UPDATED',
  GoodsReceivedCreated = 'GOODS_RECEIVED_CREATED',
  GoodsReceivedDeleted = 'GOODS_RECEIVED_DELETED',
  GoodsReceivedStatusFinalised = 'GOODS_RECEIVED_STATUS_FINALISED',
  InventoryAdjustment = 'INVENTORY_ADJUSTMENT',
  InvoiceCreated = 'INVOICE_CREATED',
  InvoiceDeleted = 'INVOICE_DELETED',
  InvoiceNumberAllocated = 'INVOICE_NUMBER_ALLOCATED',
  InvoiceStatusAllocated = 'INVOICE_STATUS_ALLOCATED',
  InvoiceStatusCancelled = 'INVOICE_STATUS_CANCELLED',
  InvoiceStatusDelivered = 'INVOICE_STATUS_DELIVERED',
  InvoiceStatusPicked = 'INVOICE_STATUS_PICKED',
  InvoiceStatusReceived = 'INVOICE_STATUS_RECEIVED',
  InvoiceStatusShipped = 'INVOICE_STATUS_SHIPPED',
  InvoiceStatusVerified = 'INVOICE_STATUS_VERIFIED',
  ItemVariantCreated = 'ITEM_VARIANT_CREATED',
  ItemVariantDeleted = 'ITEM_VARIANT_DELETED',
  ItemVariantUpdatedName = 'ITEM_VARIANT_UPDATED_NAME',
  ItemVariantUpdateDosePerUnit = 'ITEM_VARIANT_UPDATE_DOSE_PER_UNIT',
  ItemVariantUpdateLocationType = 'ITEM_VARIANT_UPDATE_LOCATION_TYPE',
  ItemVariantUpdateManufacturer = 'ITEM_VARIANT_UPDATE_MANUFACTURER',
  ItemVariantUpdateVvmType = 'ITEM_VARIANT_UPDATE_VVM_TYPE',
  PatientCreated = 'PATIENT_CREATED',
  PatientUpdated = 'PATIENT_UPDATED',
  PrescriptionCreated = 'PRESCRIPTION_CREATED',
  PrescriptionDeleted = 'PRESCRIPTION_DELETED',
  PrescriptionStatusCancelled = 'PRESCRIPTION_STATUS_CANCELLED',
  PrescriptionStatusPicked = 'PRESCRIPTION_STATUS_PICKED',
  PrescriptionStatusVerified = 'PRESCRIPTION_STATUS_VERIFIED',
  ProgramCreated = 'PROGRAM_CREATED',
  ProgramUpdated = 'PROGRAM_UPDATED',
  PurchaseOrderConfirmed = 'PURCHASE_ORDER_CONFIRMED',
  PurchaseOrderCreated = 'PURCHASE_ORDER_CREATED',
  PurchaseOrderDeleted = 'PURCHASE_ORDER_DELETED',
  PurchaseOrderFinalised = 'PURCHASE_ORDER_FINALISED',
  PurchaseOrderLineCreated = 'PURCHASE_ORDER_LINE_CREATED',
  PurchaseOrderLineDeleted = 'PURCHASE_ORDER_LINE_DELETED',
  PurchaseOrderLineStatusChangedFromSentToNew = 'PURCHASE_ORDER_LINE_STATUS_CHANGED_FROM_SENT_TO_NEW',
  PurchaseOrderLineStatusClosed = 'PURCHASE_ORDER_LINE_STATUS_CLOSED',
  PurchaseOrderLineUpdated = 'PURCHASE_ORDER_LINE_UPDATED',
  PurchaseOrderRequestApproval = 'PURCHASE_ORDER_REQUEST_APPROVAL',
  PurchaseOrderSent = 'PURCHASE_ORDER_SENT',
  PurchaseOrderStatusChangedFromSentToConfirmed = 'PURCHASE_ORDER_STATUS_CHANGED_FROM_SENT_TO_CONFIRMED',
  PurchaseOrderUnauthorised = 'PURCHASE_ORDER_UNAUTHORISED',
  QuantityForLineHasBeenSetToZero = 'QUANTITY_FOR_LINE_HAS_BEEN_SET_TO_ZERO',
  Repack = 'REPACK',
  RequisitionApproved = 'REQUISITION_APPROVED',
  RequisitionCreated = 'REQUISITION_CREATED',
  RequisitionDeleted = 'REQUISITION_DELETED',
  RequisitionNumberAllocated = 'REQUISITION_NUMBER_ALLOCATED',
  RequisitionStatusFinalised = 'REQUISITION_STATUS_FINALISED',
  RequisitionStatusSent = 'REQUISITION_STATUS_SENT',
  RnrFormCreated = 'RNR_FORM_CREATED',
  RnrFormDeleted = 'RNR_FORM_DELETED',
  RnrFormFinalised = 'RNR_FORM_FINALISED',
  RnrFormUpdated = 'RNR_FORM_UPDATED',
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
  UserLoggedIn = 'USER_LOGGED_IN',
  VaccinationCreated = 'VACCINATION_CREATED',
  VaccinationDeleted = 'VACCINATION_DELETED',
  VaccinationUpdated = 'VACCINATION_UPDATED',
  VaccineCourseCreated = 'VACCINE_COURSE_CREATED',
  VaccineCourseUpdated = 'VACCINE_COURSE_UPDATED',
  VolumePerPackChanged = 'VOLUME_PER_PACK_CHANGED',
  VvmStatusLogUpdated = 'VVM_STATUS_LOG_UPDATED',
}

export enum ActivityLogSortFieldInput {
  ActivityLogType = 'activityLogType',
  Id = 'id',
  RecordId = 'recordId',
  UserId = 'userId',
}

export type ActivityLogSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ActivityLogSortFieldInput;
};

export type AddFromMasterListInput = {
  masterListId: Scalars['String']['input'];
  requestRequisitionId: Scalars['String']['input'];
};

export type AddToPurchaseOrderFromMasterListInput = {
  masterListId: Scalars['String']['input'];
  purchaseOrderId: Scalars['String']['input'];
};

export type AddToShipmentFromMasterListInput = {
  masterListId: Scalars['String']['input'];
  shipmentId: Scalars['String']['input'];
};

export enum AdjustmentTypeInput {
  Addition = 'ADDITION',
  Reduction = 'REDUCTION',
}

export type AllocateProgramNumberInput = {
  numberName: Scalars['String']['input'];
};

export enum ApplyToLinesInput {
  AssignIfNone = 'ASSIGN_IF_NONE',
  AssignToAll = 'ASSIGN_TO_ALL',
  None = 'NONE',
  UpdateExistingDonor = 'UPDATE_EXISTING_DONOR',
}

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

export enum AssetCatalogueItemSortFieldInput {
  Catalogue = 'catalogue',
  Code = 'code',
  Manufacturer = 'manufacturer',
  Model = 'model',
}

export type AssetCatalogueItemSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  key: AssetCatalogueItemSortFieldInput;
};

export type AssetCategoryFilterInput = {
  classId?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
};

export enum AssetCategorySortFieldInput {
  Name = 'name',
}

export type AssetCategorySortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  key: AssetCategorySortFieldInput;
};

export type AssetClassFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
};

export enum AssetClassSortFieldInput {
  Name = 'name',
}

export type AssetClassSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  key: AssetClassSortFieldInput;
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
  storeCodeOrName?: InputMaybe<StringFilterInput>;
  storeId?: InputMaybe<StringFilterInput>;
  typeId?: InputMaybe<EqualFilterStringInput>;
};

export type AssetLogFilterInput = {
  assetId?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  logDatetime?: InputMaybe<DatetimeFilterInput>;
  reasonId?: InputMaybe<EqualFilterStringInput>;
  status?: InputMaybe<EqualFilterStatusInput>;
  user?: InputMaybe<StringFilterInput>;
};

export type AssetLogReasonFilterInput = {
  assetLogStatus?: InputMaybe<EqualFilterStatusInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  reason?: InputMaybe<StringFilterInput>;
};

export enum AssetLogReasonSortFieldInput {
  Status = 'status',
}

export type AssetLogReasonSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: AssetLogReasonSortFieldInput;
};

export enum AssetLogSortFieldInput {
  LogDatetime = 'logDatetime',
  Status = 'status',
}

export type AssetLogSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: AssetLogSortFieldInput;
};

export enum AssetLogStatusNodeType {
  Decommissioned = 'DECOMMISSIONED',
  Functioning = 'FUNCTIONING',
  FunctioningButNeedsAttention = 'FUNCTIONING_BUT_NEEDS_ATTENTION',
  NotFunctioning = 'NOT_FUNCTIONING',
  NotInUse = 'NOT_IN_USE',
  Unserviceable = 'UNSERVICEABLE',
}

export type AssetPropertyFilterInput = {
  assetCategoryId?: InputMaybe<EqualFilterStringInput>;
  assetClassId?: InputMaybe<EqualFilterStringInput>;
  assetTypeId?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  key?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
};

export enum AssetSortFieldInput {
  AssetNumber = 'assetNumber',
  InstallationDate = 'installationDate',
  ModifiedDatetime = 'modifiedDatetime',
  Notes = 'notes',
  ReplacementDate = 'replacementDate',
  SerialNumber = 'serialNumber',
  Store = 'store',
}

export type AssetSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: AssetSortFieldInput;
};

export type AssetTypeFilterInput = {
  categoryId?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
};

export enum AssetTypeSortFieldInput {
  Name = 'name',
}

export type AssetTypeSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  key: AssetTypeSortFieldInput;
};

export type BatchInboundShipmentInput = {
  continueOnError?: InputMaybe<Scalars['Boolean']['input']>;
  deleteInboundShipmentLines?: InputMaybe<
    Array<DeleteInboundShipmentLineInput>
  >;
  deleteInboundShipmentServiceLines?: InputMaybe<
    Array<DeleteInboundShipmentServiceLineInput>
  >;
  deleteInboundShipments?: InputMaybe<Array<DeleteInboundShipmentInput>>;
  insertFromInternalOrderLines?: InputMaybe<
    Array<InsertInboundShipmentLineFromInternalOrderLineInput>
  >;
  insertInboundShipmentLines?: InputMaybe<
    Array<InsertInboundShipmentLineInput>
  >;
  insertInboundShipmentServiceLines?: InputMaybe<
    Array<InsertInboundShipmentServiceLineInput>
  >;
  insertInboundShipments?: InputMaybe<Array<InsertInboundShipmentInput>>;
  updateInboundShipmentLines?: InputMaybe<
    Array<UpdateInboundShipmentLineInput>
  >;
  updateInboundShipmentServiceLines?: InputMaybe<
    Array<UpdateInboundShipmentServiceLineInput>
  >;
  updateInboundShipments?: InputMaybe<Array<UpdateInboundShipmentInput>>;
};

export type BatchOutboundShipmentInput = {
  allocatedOutboundShipmentUnallocatedLines?: InputMaybe<
    Array<Scalars['String']['input']>
  >;
  continueOnError?: InputMaybe<Scalars['Boolean']['input']>;
  deleteOutboundShipmentLines?: InputMaybe<
    Array<DeleteOutboundShipmentLineInput>
  >;
  deleteOutboundShipmentServiceLines?: InputMaybe<
    Array<DeleteOutboundShipmentServiceLineInput>
  >;
  deleteOutboundShipmentUnallocatedLines?: InputMaybe<
    Array<DeleteOutboundShipmentUnallocatedLineInput>
  >;
  deleteOutboundShipments?: InputMaybe<Array<Scalars['String']['input']>>;
  insertOutboundShipmentLines?: InputMaybe<
    Array<InsertOutboundShipmentLineInput>
  >;
  insertOutboundShipmentServiceLines?: InputMaybe<
    Array<InsertOutboundShipmentServiceLineInput>
  >;
  insertOutboundShipmentUnallocatedLines?: InputMaybe<
    Array<InsertOutboundShipmentUnallocatedLineInput>
  >;
  insertOutboundShipments?: InputMaybe<Array<InsertOutboundShipmentInput>>;
  updateOutboundShipmentLines?: InputMaybe<
    Array<UpdateOutboundShipmentLineInput>
  >;
  updateOutboundShipmentServiceLines?: InputMaybe<
    Array<UpdateOutboundShipmentServiceLineInput>
  >;
  updateOutboundShipmentUnallocatedLines?: InputMaybe<
    Array<UpdateOutboundShipmentUnallocatedLineInput>
  >;
  updateOutboundShipments?: InputMaybe<Array<UpdateOutboundShipmentInput>>;
};

export type BatchPrescriptionInput = {
  continueOnError?: InputMaybe<Scalars['Boolean']['input']>;
  deletePrescriptionLines?: InputMaybe<Array<DeletePrescriptionLineInput>>;
  deletePrescriptions?: InputMaybe<Array<Scalars['String']['input']>>;
  insertPrescriptionLines?: InputMaybe<Array<InsertPrescriptionLineInput>>;
  insertPrescriptions?: InputMaybe<Array<InsertPrescriptionInput>>;
  setPrescribedQuantity?: InputMaybe<Array<SetPrescribedQuantityInput>>;
  updatePrescriptionLines?: InputMaybe<Array<UpdatePrescriptionLineInput>>;
  updatePrescriptions?: InputMaybe<Array<UpdatePrescriptionInput>>;
};

export type BatchRequestRequisitionInput = {
  continueOnError?: InputMaybe<Scalars['Boolean']['input']>;
  deleteRequestRequisitionLines?: InputMaybe<
    Array<DeleteRequestRequisitionLineInput>
  >;
  deleteRequestRequisitions?: InputMaybe<Array<DeleteRequestRequisitionInput>>;
  insertRequestRequisitionLines?: InputMaybe<
    Array<InsertRequestRequisitionLineInput>
  >;
  insertRequestRequisitions?: InputMaybe<Array<InsertRequestRequisitionInput>>;
  updateRequestRequisitionLines?: InputMaybe<
    Array<UpdateRequestRequisitionLineInput>
  >;
  updateRequestRequisitions?: InputMaybe<Array<UpdateRequestRequisitionInput>>;
};

export type BatchResponseRequisitionInput = {
  continueOnError?: InputMaybe<Scalars['Boolean']['input']>;
  deleteResponseRequisitionLines?: InputMaybe<
    Array<DeleteResponseRequisitionLineInput>
  >;
  deleteResponseRequisitions?: InputMaybe<
    Array<DeleteResponseRequisitionInput>
  >;
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

export type BoolStorePrefInput = {
  storeId: Scalars['String']['input'];
  value: Scalars['Boolean']['input'];
};

export type CampaignFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
};

export enum CampaignSortFieldInput {
  Name = 'name',
}

export type CampaignSortInput = {
  /** Sort query result is sorted descending or ascending (if not provided the default is ascending) */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: CampaignSortFieldInput;
};

export type CentralPatientSearchInput = {
  /** Patient code */
  code?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['NaiveDate']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
};

export type ClinicianFilterInput = {
  address1?: InputMaybe<StringFilterInput>;
  address2?: InputMaybe<StringFilterInput>;
  code?: InputMaybe<StringFilterInput>;
  email?: InputMaybe<StringFilterInput>;
  firstName?: InputMaybe<StringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  initials?: InputMaybe<StringFilterInput>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  lastName?: InputMaybe<StringFilterInput>;
  mobile?: InputMaybe<StringFilterInput>;
  phone?: InputMaybe<StringFilterInput>;
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
  Phone = 'phone',
}

export type ClinicianSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ClinicianSortFieldInput;
};

export type ConfigureNamePropertyInput = {
  allowedValues?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  key: Scalars['String']['input'];
  name: Scalars['String']['input'];
  propertyId: Scalars['String']['input'];
  remoteEditable: Scalars['Boolean']['input'];
  valueType: PropertyNodeValueType;
};

export type ConsumptionOptionsInput = {
  /** Defaults to store preference amc_lookback_months */
  amcLookbackMonths?: InputMaybe<Scalars['Float']['input']>;
  /** Defaults to 12 */
  numberOfDataPoints?: InputMaybe<Scalars['Int']['input']>;
};

export enum ContactFormNodeType {
  Feedback = 'FEEDBACK',
  Support = 'SUPPORT',
}

export type ContactTraceFilterInput = {
  contactPatientId?: InputMaybe<EqualFilterStringInput>;
  contactTraceId?: InputMaybe<StringFilterInput>;
  dateOfBirth?: InputMaybe<DateFilterInput>;
  datetime?: InputMaybe<DatetimeFilterInput>;
  documentName?: InputMaybe<StringFilterInput>;
  firstName?: InputMaybe<StringFilterInput>;
  gender?: InputMaybe<EqualFilterGenderType>;
  id?: InputMaybe<EqualFilterStringInput>;
  lastName?: InputMaybe<StringFilterInput>;
  patientId?: InputMaybe<EqualFilterStringInput>;
  programId?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<StringFilterInput>;
};

export enum ContactTraceSortFieldInput {
  ContactTraceId = 'contactTraceId',
  DateOfBirth = 'dateOfBirth',
  Datetime = 'datetime',
  FirstName = 'firstName',
  Gender = 'gender',
  LastName = 'lastName',
  PatientId = 'patientId',
  ProgramId = 'programId',
}

export type ContactTraceSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ContactTraceSortFieldInput;
};

export type CreateInventoryAdjustmentInput = {
  adjustment: Scalars['Float']['input'];
  adjustmentType: AdjustmentTypeInput;
  reasonOptionId?: InputMaybe<Scalars['String']['input']>;
  stockLineId: Scalars['String']['input'];
};

export type CreateRequisitionShipmentInput = {
  responseRequisitionId: Scalars['String']['input'];
};

export type CurrencyFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isHomeCurrency?: InputMaybe<Scalars['Boolean']['input']>;
};

export enum CurrencySortFieldInput {
  CurrencyCode = 'currencyCode',
  Id = 'id',
  IsHomeCurrency = 'isHomeCurrency',
}

export type CurrencySortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: CurrencySortFieldInput;
};

export type CustomerReturnInput = {
  customerId: Scalars['String']['input'];
  customerReturnLines: Array<CustomerReturnLineInput>;
  id: Scalars['String']['input'];
  outboundShipmentId?: InputMaybe<Scalars['String']['input']>;
};

export type CustomerReturnLineInput = {
  batch?: InputMaybe<Scalars['String']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  itemVariantId?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  numberOfPacksReturned: Scalars['Float']['input'];
  packSize: Scalars['Float']['input'];
  reasonId?: InputMaybe<Scalars['String']['input']>;
  volumePerPack?: InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: InputMaybe<Scalars['String']['input']>;
};

export enum DatabaseType {
  Postgres = 'POSTGRES',
  SqLite = 'SQ_LITE',
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

export type DeleteBundledItemInput = {
  id: Scalars['String']['input'];
};

export type DeleteCampaignInput = {
  id: Scalars['String']['input'];
};

export type DeleteInboundShipmentInput = {
  id: Scalars['String']['input'];
};

export type DeleteInboundShipmentLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteInboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteItemVariantInput = {
  id: Scalars['String']['input'];
};

export type DeleteLocationInput = {
  id: Scalars['String']['input'];
};

export type DeleteOutboundShipmentLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteOutboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteOutboundShipmentUnallocatedLineInput = {
  id: Scalars['String']['input'];
};

export type DeletePrescriptionLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteRequestRequisitionInput = {
  id: Scalars['String']['input'];
};

export type DeleteRequestRequisitionLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteResponseRequisitionInput = {
  id: Scalars['String']['input'];
};

export type DeleteResponseRequisitionLineInput = {
  id: Scalars['String']['input'];
};

export type DeleteRnRFormInput = {
  id: Scalars['String']['input'];
};

export type DeleteStocktakeInput = {
  id: Scalars['String']['input'];
};

export type DeleteStocktakeLineInput = {
  id: Scalars['String']['input'];
};

export type DemographicFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
};

export type DemographicIndicatorFilterInput = {
  baseYear?: InputMaybe<EqualFilterNumberInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
};

export enum DemographicIndicatorSortFieldInput {
  Id = 'id',
  Name = 'name',
}

export type DemographicIndicatorSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  key: DemographicIndicatorSortFieldInput;
};

export type DemographicProjectionFilterInput = {
  baseYear?: InputMaybe<EqualFilterNumberInput>;
  id?: InputMaybe<EqualFilterStringInput>;
};

export enum DemographicProjectionSortFieldInput {
  Id = 'id',
}

export type DemographicProjectionSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  key: DemographicProjectionSortFieldInput;
};

export enum DemographicSortFieldInput {
  Id = 'id',
  Name = 'name',
}

export type DemographicSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  key: DemographicSortFieldInput;
};

export type DisplaySettingsHash = {
  logo: Scalars['String']['input'];
  theme: Scalars['String']['input'];
};

export type DisplaySettingsInput = {
  customLogo?: InputMaybe<Scalars['String']['input']>;
  customTheme?: InputMaybe<Scalars['String']['input']>;
};

export type DocumentFilterInput = {
  contextId?: InputMaybe<EqualFilterStringInput>;
  /**
   * This filter makes it possible to search the raw text json data.
   * Be beware of potential performance issues.
   */
  data?: InputMaybe<StringFilterInput>;
  datetime?: InputMaybe<DatetimeFilterInput>;
  name?: InputMaybe<StringFilterInput>;
  owner?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export enum DocumentRegistryCategoryNode {
  ContactTrace = 'CONTACT_TRACE',
  Custom = 'CUSTOM',
  Encounter = 'ENCOUNTER',
  Patient = 'PATIENT',
  ProgramEnrolment = 'PROGRAM_ENROLMENT',
}

export type DocumentRegistryFilterInput = {
  category?: InputMaybe<EqualFilterDocumentRegistryCategoryInput>;
  contextId?: InputMaybe<EqualFilterStringInput>;
  documentType?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
};

export enum DocumentRegistrySortFieldInput {
  DocumentType = 'documentType',
  Type = 'type',
}

export type DocumentRegistrySortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: DocumentRegistrySortFieldInput;
};

export enum DocumentSortFieldInput {
  Context = 'context',
  Datetime = 'datetime',
  Name = 'name',
  Owner = 'owner',
  Type = 'type',
}

export type DocumentSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: DocumentSortFieldInput;
};

export type EncounterEventFilterInput = {
  activeEndDatetime?: InputMaybe<DatetimeFilterInput>;
  activeStartDatetime?: InputMaybe<DatetimeFilterInput>;
  data?: InputMaybe<StringFilterInput>;
  datetime?: InputMaybe<DatetimeFilterInput>;
  /**
   * Only include events that are for the current encounter, i.e. have matching encounter type
   * and matching encounter name of the current encounter. If not set all events with matching
   * encounter type are returned.
   */
  isCurrentEncounter?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export type EncounterFieldsInput = {
  fields: Array<Scalars['String']['input']>;
};

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
  programId?: InputMaybe<EqualFilterStringInput>;
  startDatetime?: InputMaybe<DatetimeFilterInput>;
  status?: InputMaybe<EqualFilterEncounterStatusInput>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export enum EncounterNodeStatus {
  Cancelled = 'CANCELLED',
  Deleted = 'DELETED',
  Pending = 'PENDING',
  Visited = 'VISITED',
}

export enum EncounterSortFieldInput {
  Program = 'Program',
  Type = 'Type',
  CreatedDatetime = 'createdDatetime',
  EndDatetime = 'endDatetime',
  PatientId = 'patientId',
  StartDatetime = 'startDatetime',
  Status = 'status',
}

export type EncounterSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: EncounterSortFieldInput;
};

export type EqualFilterActivityLogTypeInput = {
  equalAny?: InputMaybe<Array<ActivityLogNodeType>>;
  equalTo?: InputMaybe<ActivityLogNodeType>;
  notEqualAll?: InputMaybe<Array<ActivityLogNodeType>>;
  notEqualTo?: InputMaybe<ActivityLogNodeType>;
};

export type EqualFilterBigFloatingNumberInput = {
  equalAny?: InputMaybe<Array<Scalars['Float']['input']>>;
  equalAnyOrNull?: InputMaybe<Array<Scalars['Float']['input']>>;
  equalTo?: InputMaybe<Scalars['Float']['input']>;
  notEqualAll?: InputMaybe<Array<Scalars['Float']['input']>>;
  notEqualTo?: InputMaybe<Scalars['Float']['input']>;
};

export type EqualFilterBigNumberInput = {
  equalAny?: InputMaybe<Array<Scalars['Int']['input']>>;
  equalAnyOrNull?: InputMaybe<Array<Scalars['Int']['input']>>;
  equalTo?: InputMaybe<Scalars['Int']['input']>;
  notEqualAll?: InputMaybe<Array<Scalars['Int']['input']>>;
  notEqualTo?: InputMaybe<Scalars['Int']['input']>;
};

export type EqualFilterDocumentRegistryCategoryInput = {
  equalAny?: InputMaybe<Array<DocumentRegistryCategoryNode>>;
  equalTo?: InputMaybe<DocumentRegistryCategoryNode>;
  notEqualAll?: InputMaybe<Array<DocumentRegistryCategoryNode>>;
  notEqualTo?: InputMaybe<DocumentRegistryCategoryNode>;
};

export type EqualFilterEncounterStatusInput = {
  equalAny?: InputMaybe<Array<EncounterNodeStatus>>;
  equalTo?: InputMaybe<EncounterNodeStatus>;
  notEqualAll?: InputMaybe<Array<EncounterNodeStatus>>;
  notEqualTo?: InputMaybe<EncounterNodeStatus>;
};

export type EqualFilterGenderType = {
  equalAny?: InputMaybe<Array<GenderTypeNode>>;
  equalTo?: InputMaybe<GenderTypeNode>;
  notEqualAll?: InputMaybe<Array<GenderTypeNode>>;
  notEqualTo?: InputMaybe<GenderTypeNode>;
};

export type EqualFilterGoodsReceivedStatusInput = {
  equalAny?: InputMaybe<Array<GoodsReceivedNodeStatus>>;
  equalTo?: InputMaybe<GoodsReceivedNodeStatus>;
  notEqualAll?: InputMaybe<Array<GoodsReceivedNodeStatus>>;
  notEqualTo?: InputMaybe<GoodsReceivedNodeStatus>;
};

export type EqualFilterInventoryAdjustmentReasonTypeInput = {
  equalAny?: InputMaybe<Array<InventoryAdjustmentReasonNodeType>>;
  equalTo?: InputMaybe<InventoryAdjustmentReasonNodeType>;
  notEqualAll?: InputMaybe<Array<InventoryAdjustmentReasonNodeType>>;
  notEqualTo?: InputMaybe<InventoryAdjustmentReasonNodeType>;
};

export type EqualFilterInvoiceLineTypeInput = {
  equalAny?: InputMaybe<Array<InvoiceLineNodeType>>;
  equalTo?: InputMaybe<InvoiceLineNodeType>;
  notEqualAll?: InputMaybe<Array<InvoiceLineNodeType>>;
  notEqualTo?: InputMaybe<InvoiceLineNodeType>;
};

export type EqualFilterInvoiceStatusInput = {
  equalAny?: InputMaybe<Array<InvoiceNodeStatus>>;
  equalTo?: InputMaybe<InvoiceNodeStatus>;
  notEqualAll?: InputMaybe<Array<InvoiceNodeStatus>>;
  notEqualTo?: InputMaybe<InvoiceNodeStatus>;
};

export type EqualFilterInvoiceTypeInput = {
  equalAny?: InputMaybe<Array<InvoiceNodeType>>;
  equalTo?: InputMaybe<InvoiceNodeType>;
  notEqualAll?: InputMaybe<Array<InvoiceNodeType>>;
  notEqualTo?: InputMaybe<InvoiceNodeType>;
};

export type EqualFilterItemTypeInput = {
  equalAny?: InputMaybe<Array<ItemNodeType>>;
  equalTo?: InputMaybe<ItemNodeType>;
  notEqualAll?: InputMaybe<Array<ItemNodeType>>;
  notEqualTo?: InputMaybe<ItemNodeType>;
};

export type EqualFilterNumberInput = {
  equalAny?: InputMaybe<Array<Scalars['Int']['input']>>;
  equalAnyOrNull?: InputMaybe<Array<Scalars['Int']['input']>>;
  equalTo?: InputMaybe<Scalars['Int']['input']>;
  notEqualAll?: InputMaybe<Array<Scalars['Int']['input']>>;
  notEqualTo?: InputMaybe<Scalars['Int']['input']>;
};

export type EqualFilterPurchaseOrderLineStatusInput = {
  equalAny?: InputMaybe<Array<PurchaseOrderLineStatusNode>>;
  equalTo?: InputMaybe<PurchaseOrderLineStatusNode>;
  notEqualAll?: InputMaybe<Array<PurchaseOrderLineStatusNode>>;
  notEqualTo?: InputMaybe<PurchaseOrderLineStatusNode>;
};

export type EqualFilterPurchaseOrderStatusInput = {
  equalAny?: InputMaybe<Array<PurchaseOrderNodeStatus>>;
  equalTo?: InputMaybe<PurchaseOrderNodeStatus>;
  notEqualAll?: InputMaybe<Array<PurchaseOrderNodeStatus>>;
  notEqualTo?: InputMaybe<PurchaseOrderNodeStatus>;
};

export type EqualFilterReasonOptionTypeInput = {
  equalAny?: InputMaybe<Array<ReasonOptionNodeType>>;
  equalTo?: InputMaybe<ReasonOptionNodeType>;
  notEqualAll?: InputMaybe<Array<ReasonOptionNodeType>>;
  notEqualTo?: InputMaybe<ReasonOptionNodeType>;
};

export type EqualFilterReportContextInput = {
  equalAny?: InputMaybe<Array<ReportContext>>;
  equalTo?: InputMaybe<ReportContext>;
  notEqualAll?: InputMaybe<Array<ReportContext>>;
  notEqualTo?: InputMaybe<ReportContext>;
};

export type EqualFilterRequisitionStatusInput = {
  equalAny?: InputMaybe<Array<RequisitionNodeStatus>>;
  equalTo?: InputMaybe<RequisitionNodeStatus>;
  notEqualAll?: InputMaybe<Array<RequisitionNodeStatus>>;
  notEqualTo?: InputMaybe<RequisitionNodeStatus>;
};

export type EqualFilterRequisitionTypeInput = {
  equalAny?: InputMaybe<Array<RequisitionNodeType>>;
  equalTo?: InputMaybe<RequisitionNodeType>;
  notEqualAll?: InputMaybe<Array<RequisitionNodeType>>;
  notEqualTo?: InputMaybe<RequisitionNodeType>;
};

export type EqualFilterStatusInput = {
  equalAny?: InputMaybe<Array<AssetLogStatusNodeType>>;
  equalTo?: InputMaybe<AssetLogStatusNodeType>;
  notEqualAll?: InputMaybe<Array<AssetLogStatusNodeType>>;
  notEqualTo?: InputMaybe<AssetLogStatusNodeType>;
};

export type EqualFilterStocktakeStatusInput = {
  equalAny?: InputMaybe<Array<StocktakeNodeStatus>>;
  equalTo?: InputMaybe<StocktakeNodeStatus>;
  notEqualAll?: InputMaybe<Array<StocktakeNodeStatus>>;
  notEqualTo?: InputMaybe<StocktakeNodeStatus>;
};

export type EqualFilterStringInput = {
  equalAny?: InputMaybe<Array<Scalars['String']['input']>>;
  equalAnyOrNull?: InputMaybe<Array<Scalars['String']['input']>>;
  equalTo?: InputMaybe<Scalars['String']['input']>;
  notEqualAll?: InputMaybe<Array<Scalars['String']['input']>>;
  notEqualTo?: InputMaybe<Scalars['String']['input']>;
};

export type EqualFilterTemperatureBreachRowTypeInput = {
  equalAny?: InputMaybe<Array<TemperatureBreachNodeType>>;
  equalTo?: InputMaybe<TemperatureBreachNodeType>;
  notEqualAll?: InputMaybe<Array<TemperatureBreachNodeType>>;
  notEqualTo?: InputMaybe<TemperatureBreachNodeType>;
};

export type EqualFilterTypeInput = {
  equalAny?: InputMaybe<Array<NameNodeType>>;
  equalTo?: InputMaybe<NameNodeType>;
  notEqualAll?: InputMaybe<Array<NameNodeType>>;
  notEqualTo?: InputMaybe<NameNodeType>;
};

export type ExistingLinesInput = {
  itemId: Scalars['String']['input'];
  returnId: Scalars['String']['input'];
};

export type FinaliseRnRFormInput = {
  id: Scalars['String']['input'];
};

export enum ForeignKey {
  GoodsReceivedId = 'goodsReceivedId',
  InvoiceId = 'invoiceId',
  ItemId = 'itemId',
  LocationId = 'locationId',
  OtherPartyId = 'otherPartyId',
  PurchaseOrderId = 'purchaseOrderId',
  RequisitionId = 'requisitionId',
  StockLineId = 'stockLineId',
}

export type FormSchemaFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterStringInput>;
};

export enum FormSchemaSortFieldInput {
  Id = 'id',
}

export type FormSchemaSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: FormSchemaSortFieldInput;
};

export enum GenderTypeNode {
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
  Unknown = 'UNKNOWN',
}

export type GenerateCustomerReturnLinesInput = {
  existingLinesInput?: InputMaybe<ExistingLinesInput>;
  /** The ids of the outbound shipment lines to generate new return lines for */
  outboundShipmentLineIds: Array<Scalars['String']['input']>;
};

/** At least one input is required. */
export type GenerateSupplierReturnLinesInput = {
  /** Generate new return lines for all the available stock lines of a specific item */
  itemId?: InputMaybe<Scalars['String']['input']>;
  /** Include existing return lines in the response. Only has an effect when either `stock_line_ids` or `item_id` is set. */
  returnId?: InputMaybe<Scalars['String']['input']>;
  /** The stock line ids to generate new return lines for */
  stockLineIds: Array<Scalars['String']['input']>;
};

export type GoodsReceivedFilterInput = {
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  purchaseOrderId?: InputMaybe<EqualFilterStringInput>;
  status?: InputMaybe<EqualFilterGoodsReceivedStatusInput>;
};

export type GoodsReceivedLineFilterInput = {
  goodsReceivedId?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
};

export enum GoodsReceivedLineNodeStatus {
  Authorised = 'AUTHORISED',
  Unauthorised = 'UNAUTHORISED',
}

export enum GoodsReceivedLineSortFieldInput {
  ExpiryDate = 'expiryDate',
  ItemName = 'itemName',
  LineNumber = 'lineNumber',
}

export type GoodsReceivedLineSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: GoodsReceivedLineSortFieldInput;
};

export enum GoodsReceivedNodeStatus {
  Finalised = 'FINALISED',
  New = 'NEW',
}

export enum GoodsReceivedNodeType {
  Finalised = 'FINALISED',
  New = 'NEW',
}

export enum GoodsReceivedSortFieldInput {
  CreatedDatetime = 'createdDatetime',
  Number = 'number',
  ReceivedDate = 'receivedDate',
  Status = 'status',
}

export type GoodsReceivedSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: GoodsReceivedSortFieldInput;
};

export type Gs1DataElement = {
  ai: Scalars['String']['input'];
  data: Scalars['String']['input'];
};

export enum IndicatorValueTypeNode {
  Number = 'NUMBER',
  String = 'STRING',
}

export enum InitialisationStatusType {
  /** Fuly initialised */
  Initialised = 'INITIALISED',
  /** Sync settings were set and sync was attempted at least once */
  Initialising = 'INITIALISING',
  /** Sync settings are not set and sync was not attempted */
  PreInitialisation = 'PRE_INITIALISATION',
}

export type InsertAssetCatalogueItemInput = {
  categoryId: Scalars['String']['input'];
  classId: Scalars['String']['input'];
  code: Scalars['String']['input'];
  id: Scalars['String']['input'];
  manufacturer?: InputMaybe<Scalars['String']['input']>;
  model: Scalars['String']['input'];
  properties?: InputMaybe<Scalars['String']['input']>;
  subCatalogue: Scalars['String']['input'];
  typeId: Scalars['String']['input'];
};

export type InsertAssetInput = {
  assetNumber?: InputMaybe<Scalars['String']['input']>;
  catalogueItemId?: InputMaybe<Scalars['String']['input']>;
  categoryId?: InputMaybe<Scalars['String']['input']>;
  classId?: InputMaybe<Scalars['String']['input']>;
  donorNameId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  installationDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  lockedFieldsJson?: InputMaybe<Scalars['String']['input']>;
  needsReplacement?: InputMaybe<Scalars['Boolean']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  properties?: InputMaybe<Scalars['String']['input']>;
  replacementDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  serialNumber?: InputMaybe<Scalars['String']['input']>;
  storeId?: InputMaybe<Scalars['String']['input']>;
  typeId?: InputMaybe<Scalars['String']['input']>;
  warrantyEnd?: InputMaybe<Scalars['NaiveDate']['input']>;
  warrantyStart?: InputMaybe<Scalars['NaiveDate']['input']>;
};

export type InsertAssetLogInput = {
  assetId: Scalars['String']['input'];
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  reasonId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<AssetLogStatusNodeType>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type InsertAssetLogReasonInput = {
  assetLogStatus: AssetLogStatusNodeType;
  id: Scalars['String']['input'];
  reason: Scalars['String']['input'];
};

export type InsertBarcodeInput = {
  gtin: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  packSize?: InputMaybe<Scalars['Float']['input']>;
};

export type InsertClinicianInput = {
  code: Scalars['String']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<GenderTypeNode>;
  id: Scalars['String']['input'];
  initials: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  mobile?: InputMaybe<Scalars['String']['input']>;
};

export type InsertContactFormInput = {
  body: Scalars['String']['input'];
  contactType: ContactFormNodeType;
  id: Scalars['String']['input'];
  replyEmail: Scalars['String']['input'];
};

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

export type InsertDemographicIndicatorInput = {
  basePopulation?: InputMaybe<Scalars['Int']['input']>;
  baseYear: Scalars['Int']['input'];
  id: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  populationPercentage?: InputMaybe<Scalars['Float']['input']>;
  year1Projection?: InputMaybe<Scalars['Int']['input']>;
  year2Projection?: InputMaybe<Scalars['Int']['input']>;
  year3Projection?: InputMaybe<Scalars['Int']['input']>;
  year4Projection?: InputMaybe<Scalars['Int']['input']>;
  year5Projection?: InputMaybe<Scalars['Int']['input']>;
};

export type InsertDemographicProjectionInput = {
  baseYear: Scalars['Int']['input'];
  id: Scalars['String']['input'];
  year1?: InputMaybe<Scalars['Float']['input']>;
  year2?: InputMaybe<Scalars['Float']['input']>;
  year3?: InputMaybe<Scalars['Float']['input']>;
  year4?: InputMaybe<Scalars['Float']['input']>;
  year5?: InputMaybe<Scalars['Float']['input']>;
};

export type InsertDocumentRegistryInput = {
  category: DocumentRegistryCategoryNode;
  contextId: Scalars['String']['input'];
  documentType: Scalars['String']['input'];
  formSchemaId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type InsertEncounterInput = {
  /** Encounter document data */
  data: Scalars['JSON']['input'];
  patientId: Scalars['String']['input'];
  /** The schema id used for the encounter data */
  schemaId: Scalars['String']['input'];
  /** The encounter type */
  type: Scalars['String']['input'];
};

export type InsertFormSchemaInput = {
  id: Scalars['String']['input'];
  jsonSchema: Scalars['JSON']['input'];
  type: Scalars['String']['input'];
  uiSchema: Scalars['JSON']['input'];
};

export type InsertFromResponseRequisitionInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  otherPartyId: Scalars['String']['input'];
  responseRequisitionId: Scalars['String']['input'];
};

export type InsertGoodsReceivedInput = {
  id: Scalars['String']['input'];
  purchaseOrderId: Scalars['String']['input'];
};

export type InsertGoodsReceivedLineInput = {
  batch?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  goodsReceivedId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  manufacturerId?: InputMaybe<Scalars['String']['input']>;
  numberOfPacksReceived?: InputMaybe<Scalars['Float']['input']>;
  purchaseOrderLineId: Scalars['String']['input'];
  receivedPackSize?: InputMaybe<Scalars['Float']['input']>;
};

export type InsertGoodsReceivedLinesFromPurchaseOrderInput = {
  goodsReceivedId: Scalars['String']['input'];
  purchaseOrderId: Scalars['String']['input'];
};

export type InsertInboundShipmentInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  otherPartyId: Scalars['String']['input'];
  requisitionId?: InputMaybe<Scalars['String']['input']>;
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type InsertInboundShipmentLineFromInternalOrderLineInput = {
  invoiceId: Scalars['String']['input'];
  requisitionLineId: Scalars['String']['input'];
};

export type InsertInboundShipmentLineInput = {
  batch?: InputMaybe<Scalars['String']['input']>;
  campaignId?: InputMaybe<Scalars['String']['input']>;
  costPricePerPack: Scalars['Float']['input'];
  donorId?: InputMaybe<Scalars['String']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  itemVariantId?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<NullableStringUpdate>;
  note?: InputMaybe<Scalars['String']['input']>;
  numberOfPacks: Scalars['Float']['input'];
  packSize: Scalars['Float']['input'];
  programId?: InputMaybe<Scalars['String']['input']>;
  sellPricePerPack: Scalars['Float']['input'];
  shippedNumberOfPacks?: InputMaybe<Scalars['Float']['input']>;
  shippedPackSize?: InputMaybe<Scalars['Float']['input']>;
  taxPercentage?: InputMaybe<Scalars['Float']['input']>;
  totalBeforeTax?: InputMaybe<Scalars['Float']['input']>;
  volumePerPack?: InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: InputMaybe<Scalars['String']['input']>;
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

export type InsertInsuranceInput = {
  discountPercentage: Scalars['Float']['input'];
  expiryDate: Scalars['NaiveDate']['input'];
  id: Scalars['String']['input'];
  insuranceProviderId: Scalars['String']['input'];
  isActive: Scalars['Boolean']['input'];
  nameId: Scalars['String']['input'];
  nameOfInsured?: InputMaybe<Scalars['String']['input']>;
  policyNumberFamily: Scalars['String']['input'];
  policyNumberPerson: Scalars['String']['input'];
  policyType: InsurancePolicyNodeType;
};

export type InsertLocationInput = {
  code: Scalars['String']['input'];
  id: Scalars['String']['input'];
  locationTypeId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  volume?: InputMaybe<Scalars['Float']['input']>;
};

export type InsertOutboundShipmentInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  /** The new invoice id provided by the client */
  id: Scalars['String']['input'];
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  /** The other party must be a customer of the current store */
  otherPartyId: Scalars['String']['input'];
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type InsertOutboundShipmentLineInput = {
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  numberOfPacks: Scalars['Float']['input'];
  stockLineId: Scalars['String']['input'];
  taxPercentage?: InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: InputMaybe<Scalars['String']['input']>;
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

export type InsertOutboundShipmentUnallocatedLineInput = {
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  quantity: Scalars['Int']['input'];
};

export type InsertPatientInput = {
  address1?: InputMaybe<Scalars['String']['input']>;
  code: Scalars['String']['input'];
  code2?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['NaiveDate']['input']>;
  dateOfDeath?: InputMaybe<Scalars['NaiveDate']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<GenderTypeNode>;
  id: Scalars['String']['input'];
  isDeceased?: InputMaybe<Scalars['Boolean']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  nextOfKinId?: InputMaybe<Scalars['String']['input']>;
  nextOfKinName?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type InsertPluginDataInput = {
  data: Scalars['String']['input'];
  dataIdentifier: Scalars['String']['input'];
  id: Scalars['String']['input'];
  pluginCode: Scalars['String']['input'];
  relatedRecordId?: InputMaybe<Scalars['String']['input']>;
  storeId?: InputMaybe<Scalars['String']['input']>;
};

export type InsertPrescriptionInput = {
  clinicianId?: InputMaybe<Scalars['String']['input']>;
  diagnosisId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  patientId: Scalars['String']['input'];
  prescriptionDate?: InputMaybe<Scalars['DateTime']['input']>;
  programId?: InputMaybe<Scalars['String']['input']>;
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type InsertPrescriptionLineInput = {
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  numberOfPacks: Scalars['Float']['input'];
  stockLineId: Scalars['String']['input'];
};

export type InsertPrinterInput = {
  address: Scalars['String']['input'];
  description: Scalars['String']['input'];
  id: Scalars['String']['input'];
  labelHeight: Scalars['Int']['input'];
  labelWidth: Scalars['Int']['input'];
  port: Scalars['Int']['input'];
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

export type InsertProgramPatientInput = {
  /** Patient document data */
  data: Scalars['JSON']['input'];
  /** The schema id used for the patient data */
  schemaId: Scalars['String']['input'];
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

export type InsertProgramResponseRequisitionInput = {
  id: Scalars['String']['input'];
  otherPartyId: Scalars['String']['input'];
  periodId: Scalars['String']['input'];
  programOrderTypeId: Scalars['String']['input'];
};

export type InsertPurchaseOrderInput = {
  id: Scalars['String']['input'];
  supplierId: Scalars['String']['input'];
};

export type InsertPurchaseOrderLineInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  expectedDeliveryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  itemIdOrCode: Scalars['String']['input'];
  manufacturerId?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  pricePerPackAfterDiscount?: InputMaybe<Scalars['Float']['input']>;
  pricePerPackBeforeDiscount?: InputMaybe<Scalars['Float']['input']>;
  purchaseOrderId: Scalars['String']['input'];
  requestedDeliveryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  requestedNumberOfUnits?: InputMaybe<Scalars['Float']['input']>;
  requestedPackSize?: InputMaybe<Scalars['Float']['input']>;
  supplierItemCode?: InputMaybe<Scalars['String']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
};

export type InsertRepackInput = {
  newLocationId?: InputMaybe<Scalars['String']['input']>;
  newPackSize: Scalars['Float']['input'];
  numberOfPacks: Scalars['Float']['input'];
  stockLineId: Scalars['String']['input'];
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

export type InsertRequestRequisitionLineInput = {
  id: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  requisitionId: Scalars['String']['input'];
};

export type InsertResponseRequisitionInput = {
  id: Scalars['String']['input'];
  maxMonthsOfStock: Scalars['Float']['input'];
  minMonthsOfStock: Scalars['Float']['input'];
  otherPartyId: Scalars['String']['input'];
};

export type InsertResponseRequisitionLineInput = {
  id: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  requisitionId: Scalars['String']['input'];
};

export type InsertRnRFormInput = {
  id: Scalars['String']['input'];
  periodId: Scalars['String']['input'];
  programId: Scalars['String']['input'];
  supplierId: Scalars['String']['input'];
};

export type InsertStockLineInput = {
  /** Empty barcode will unlink barcode from StockLine */
  barcode?: InputMaybe<Scalars['String']['input']>;
  batch?: InputMaybe<Scalars['String']['input']>;
  campaignId?: InputMaybe<Scalars['String']['input']>;
  costPricePerPack: Scalars['Float']['input'];
  donorId?: InputMaybe<Scalars['String']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  itemVariantId?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<NullableStringUpdate>;
  numberOfPacks: Scalars['Float']['input'];
  onHold: Scalars['Boolean']['input'];
  packSize: Scalars['Float']['input'];
  programId?: InputMaybe<Scalars['String']['input']>;
  reasonOptionId?: InputMaybe<Scalars['String']['input']>;
  sellPricePerPack: Scalars['Float']['input'];
  volumePerPack?: InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: InputMaybe<Scalars['String']['input']>;
};

export type InsertStocktakeInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  createBlankStocktake?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  expiresBefore?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  includeAllMasterListItems?: InputMaybe<Scalars['Boolean']['input']>;
  isAllItemsStocktake?: InputMaybe<Scalars['Boolean']['input']>;
  isInitialStocktake?: InputMaybe<Scalars['Boolean']['input']>;
  locationId?: InputMaybe<Scalars['String']['input']>;
  masterListId?: InputMaybe<Scalars['String']['input']>;
  vvmStatusId?: InputMaybe<Scalars['String']['input']>;
};

export type InsertStocktakeLineInput = {
  batch?: InputMaybe<Scalars['String']['input']>;
  campaignId?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  costPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  countedNumberOfPacks?: InputMaybe<Scalars['Float']['input']>;
  donorId?: InputMaybe<Scalars['String']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  itemId?: InputMaybe<Scalars['String']['input']>;
  itemVariantId?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<NullableStringUpdate>;
  note?: InputMaybe<Scalars['String']['input']>;
  packSize?: InputMaybe<Scalars['Float']['input']>;
  programId?: InputMaybe<Scalars['String']['input']>;
  reasonOptionId?: InputMaybe<Scalars['String']['input']>;
  sellPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  stockLineId?: InputMaybe<Scalars['String']['input']>;
  stocktakeId: Scalars['String']['input'];
  volumePerPack?: InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: InputMaybe<Scalars['String']['input']>;
};

export type InsertVvmStatusLogInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  statusId: Scalars['String']['input'];
  stockLineId: Scalars['String']['input'];
};

export type InsertVaccinationInput = {
  clinicianId?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  encounterId: Scalars['String']['input'];
  facilityFreeText?: InputMaybe<Scalars['String']['input']>;
  facilityNameId?: InputMaybe<Scalars['String']['input']>;
  given: Scalars['Boolean']['input'];
  id: Scalars['String']['input'];
  itemId?: InputMaybe<Scalars['String']['input']>;
  notGivenReason?: InputMaybe<Scalars['String']['input']>;
  stockLineId?: InputMaybe<Scalars['String']['input']>;
  vaccinationDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  vaccineCourseDoseId: Scalars['String']['input'];
};

export type InsertVaccineCourseInput = {
  canSkipDose: Scalars['Boolean']['input'];
  coverageRate: Scalars['Float']['input'];
  demographicId?: InputMaybe<Scalars['String']['input']>;
  doses: Array<UpsertVaccineCourseDoseInput>;
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
  programId: Scalars['String']['input'];
  useInGapsCalculations: Scalars['Boolean']['input'];
  vaccineItems: Array<UpsertVaccineCourseItemInput>;
  wastageRate: Scalars['Float']['input'];
};

export enum InsurancePolicyNodeType {
  Business = 'BUSINESS',
  Personal = 'PERSONAL',
}

export enum InsuranceSortFieldInput {
  ExpiryDate = 'expiryDate',
  IsActive = 'isActive',
}

export type InsuranceSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: InsuranceSortFieldInput;
};

export type IntegerStorePrefInput = {
  storeId: Scalars['String']['input'];
  value: Scalars['Int']['input'];
};

export type InventoryAdjustmentReasonFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<EqualFilterInventoryAdjustmentReasonTypeInput>;
};

export enum InventoryAdjustmentReasonNodeType {
  Negative = 'NEGATIVE',
  Positive = 'POSITIVE',
}

export enum InventoryAdjustmentReasonSortFieldInput {
  Id = 'id',
  InventoryAdjustmentReasonType = 'inventoryAdjustmentReasonType',
  Reason = 'reason',
}

export type InventoryAdjustmentReasonSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: InventoryAdjustmentReasonSortFieldInput;
};

export type InvoiceFilterInput = {
  allocatedDatetime?: InputMaybe<DatetimeFilterInput>;
  colour?: InputMaybe<EqualFilterStringInput>;
  comment?: InputMaybe<StringFilterInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  createdOrBackdatedDatetime?: InputMaybe<DatetimeFilterInput>;
  deliveredDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  invoiceNumber?: InputMaybe<EqualFilterBigNumberInput>;
  isProgramInvoice?: InputMaybe<Scalars['Boolean']['input']>;
  linkedInvoiceId?: InputMaybe<EqualFilterStringInput>;
  nameId?: InputMaybe<EqualFilterStringInput>;
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  otherPartyId?: InputMaybe<EqualFilterStringInput>;
  otherPartyName?: InputMaybe<StringFilterInput>;
  pickedDatetime?: InputMaybe<DatetimeFilterInput>;
  programId?: InputMaybe<EqualFilterStringInput>;
  receivedDatetime?: InputMaybe<DatetimeFilterInput>;
  requisitionId?: InputMaybe<EqualFilterStringInput>;
  shippedDatetime?: InputMaybe<DatetimeFilterInput>;
  status?: InputMaybe<EqualFilterInvoiceStatusInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
  theirReference?: InputMaybe<StringFilterInput>;
  transportReference?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterInvoiceTypeInput>;
  userId?: InputMaybe<EqualFilterStringInput>;
  verifiedDatetime?: InputMaybe<DatetimeFilterInput>;
};

export type InvoiceLineFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  invoiceId?: InputMaybe<EqualFilterStringInput>;
  invoiceStatus?: InputMaybe<EqualFilterInvoiceStatusInput>;
  invoiceType?: InputMaybe<EqualFilterInvoiceTypeInput>;
  isProgramInvoice?: InputMaybe<Scalars['Boolean']['input']>;
  itemId?: InputMaybe<EqualFilterStringInput>;
  locationId?: InputMaybe<EqualFilterStringInput>;
  numberOfPacks?: InputMaybe<EqualFilterBigFloatingNumberInput>;
  programId?: InputMaybe<EqualFilterStringInput>;
  reasonOption?: InputMaybe<EqualFilterStringInput>;
  requisitionId?: InputMaybe<EqualFilterStringInput>;
  stockLineId?: InputMaybe<EqualFilterStringInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
  type?: InputMaybe<EqualFilterInvoiceLineTypeInput>;
  verifiedDatetime?: InputMaybe<DatetimeFilterInput>;
};

export enum InvoiceLineNodeType {
  Service = 'SERVICE',
  StockIn = 'STOCK_IN',
  StockOut = 'STOCK_OUT',
  UnallocatedStock = 'UNALLOCATED_STOCK',
}

export enum InvoiceLineSortFieldInput {
  /** Invoice line batch */
  Batch = 'batch',
  /** Invoice line expiry date */
  ExpiryDate = 'expiryDate',
  ItemCode = 'itemCode',
  ItemName = 'itemName',
  /** Invoice line item stock location name */
  LocationName = 'locationName',
  /** Invoice line pack size */
  PackSize = 'packSize',
}

export type InvoiceLineSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: InvoiceLineSortFieldInput;
};

export enum InvoiceNodeStatus {
  /**
   * General description: Outbound Shipment is ready for picking (all unallocated lines need to be fullfilled)
   * Outbound Shipment: Invoice can only be turned to allocated status when
   * all unallocated lines are fullfilled
   * Inbound Shipment: not applicable
   */
  Allocated = 'ALLOCATED',
  Cancelled = 'CANCELLED',
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
   * General description: Received inbound Shipment has arrived, not counted or verified yet
   * Outbound Shipment: Status is updated based on corresponding inbound Shipment
   * Inbound Shipment: Status update, doesn't affect stock levels or restrict access to edit
   */
  Received = 'RECEIVED',
  /**
   * General description: Outbound Shipment is sent out for delivery
   * Outbound Shipment: Becomes not editable
   * Inbound Shipment: For inter store stock transfers an inbound Shipment
   * becomes editable when this status is set as a result of corresponding
   * outbound Shipment being changed to shipped (this is similar to New status)
   */
  Shipped = 'SHIPPED',
  /**
   * General description: Received inbound Shipment was counted and verified
   * Outbound Shipment: Status is updated based on corresponding inbound Shipment
   * Inbound Shipment: Becomes not editable
   */
  Verified = 'VERIFIED',
}

export enum InvoiceNodeType {
  CustomerReturn = 'CUSTOMER_RETURN',
  InboundShipment = 'INBOUND_SHIPMENT',
  InventoryAddition = 'INVENTORY_ADDITION',
  InventoryReduction = 'INVENTORY_REDUCTION',
  OutboundShipment = 'OUTBOUND_SHIPMENT',
  Prescription = 'PRESCRIPTION',
  Repack = 'REPACK',
  SupplierReturn = 'SUPPLIER_RETURN',
}

export enum InvoiceSortFieldInput {
  AllocatedDatetime = 'allocatedDatetime',
  Comment = 'comment',
  CreatedDatetime = 'createdDatetime',
  DeliveredDatetime = 'deliveredDatetime',
  InvoiceDatetime = 'invoiceDatetime',
  InvoiceNumber = 'invoiceNumber',
  OtherPartyName = 'otherPartyName',
  PickedDatetime = 'pickedDatetime',
  ShippedDatetime = 'shippedDatetime',
  Status = 'status',
  TheirReference = 'theirReference',
  TransportReference = 'transportReference',
  Type = 'type',
  VerifiedDatetime = 'verifiedDatetime',
}

export type InvoiceSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: InvoiceSortFieldInput;
};

export type InvoiceStatusOptionsInput = {
  storeId: Scalars['String']['input'];
  value: Array<InvoiceNodeStatus>;
};

export type ItemFilterInput = {
  categoryId?: InputMaybe<Scalars['String']['input']>;
  categoryName?: InputMaybe<Scalars['String']['input']>;
  code?: InputMaybe<StringFilterInput>;
  codeOrName?: InputMaybe<StringFilterInput>;
  /** Items with available stock on hand, regardless of item visibility. This filter is ignored if `is_visible_or_on_hand` is true */
  hasStockOnHand?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<EqualFilterStringInput>;
  ignoreForOrders?: InputMaybe<Scalars['Boolean']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isProgramItem?: InputMaybe<Scalars['Boolean']['input']>;
  isVaccine?: InputMaybe<Scalars['Boolean']['input']>;
  /** Items that are part of a masterlist which is visible in this store. This filter is ignored if `is_visible_or_on_hand` is true */
  isVisible?: InputMaybe<Scalars['Boolean']['input']>;
  /** Items that are part of a masterlist which is visible in this store OR there is available stock of that item in this store */
  isVisibleOrOnHand?: InputMaybe<Scalars['Boolean']['input']>;
  masterListId?: InputMaybe<EqualFilterStringInput>;
  maxMonthsOfStock?: InputMaybe<Scalars['Float']['input']>;
  minMonthsOfStock?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<StringFilterInput>;
  productsAtRiskOfBeingOutOfStock?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<EqualFilterItemTypeInput>;
  withRecentConsumption?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ItemLedgerFilterInput = {
  datetime?: InputMaybe<DatetimeFilterInput>;
  invoiceStatus?: InputMaybe<EqualFilterInvoiceStatusInput>;
  invoiceType?: InputMaybe<EqualFilterInvoiceTypeInput>;
  itemId?: InputMaybe<EqualFilterStringInput>;
};

export enum ItemNodeType {
  NonStock = 'NON_STOCK',
  Service = 'SERVICE',
  Stock = 'STOCK',
}

export type ItemPriceInput = {
  itemId: Scalars['String']['input'];
  nameId?: InputMaybe<Scalars['String']['input']>;
};

export enum ItemSortFieldInput {
  Code = 'code',
  Name = 'name',
  Type = 'type',
}

export type ItemSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ItemSortFieldInput;
};

export type LabelPrinterSettingsInput = {
  address: Scalars['String']['input'];
  labelHeight: Scalars['Int']['input'];
  labelWidth: Scalars['Int']['input'];
  port: Scalars['Int']['input'];
};

export enum LanguageTypeNode {
  English = 'ENGLISH',
  French = 'FRENCH',
  Khmer = 'KHMER',
  Laos = 'LAOS',
  Portuguese = 'PORTUGUESE',
  Russian = 'RUSSIAN',
  Spanish = 'SPANISH',
  Tetum = 'TETUM',
}

export type LedgerFilterInput = {
  datetime?: InputMaybe<DatetimeFilterInput>;
  itemId?: InputMaybe<EqualFilterStringInput>;
  masterListId?: InputMaybe<EqualFilterStringInput>;
  stockLineId?: InputMaybe<EqualFilterStringInput>;
};

export enum LedgerSortFieldInput {
  Datetime = 'datetime',
  InvoiceType = 'invoiceType',
  ItemId = 'itemId',
  Name = 'name',
  Quantity = 'quantity',
  StockLineId = 'stockLineId',
}

export type LedgerSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the
   * default is ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: LedgerSortFieldInput;
};

export type LocationFilterInput = {
  assignedToAsset?: InputMaybe<Scalars['Boolean']['input']>;
  code?: InputMaybe<StringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  locationTypeId?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  storeId?: InputMaybe<EqualFilterStringInput>;
};

export enum LocationSortFieldInput {
  Code = 'code',
  Name = 'name',
}

export type LocationSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: LocationSortFieldInput;
};

export type LocationTypeFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<EqualFilterStringInput>;
};

export enum LocationTypeSortFieldInput {
  Id = 'id',
  MinTemperature = 'minTemperature',
  Name = 'name',
}

export type LocationTypeSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: LocationTypeSortFieldInput;
};

export enum LogLevelEnum {
  Debug = 'DEBUG',
  Error = 'ERROR',
  Info = 'INFO',
  Trace = 'TRACE',
  Warn = 'WARN',
}

export enum LowStockStatus {
  BelowHalf = 'BELOW_HALF',
  BelowQuarter = 'BELOW_QUARTER',
  Ok = 'OK',
}

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

export type MasterListLineFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  ignoreForOrders?: InputMaybe<Scalars['Boolean']['input']>;
  itemId?: InputMaybe<EqualFilterStringInput>;
  masterList?: InputMaybe<MasterListFilterInput>;
  masterListId?: InputMaybe<EqualFilterStringInput>;
};

export enum MasterListLineSortFieldInput {
  Code = 'code',
  Name = 'name',
}

export type MasterListLineSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: MasterListLineSortFieldInput;
};

export enum MasterListSortFieldInput {
  Code = 'code',
  Description = 'description',
  DiscountPercentage = 'discountPercentage',
  Name = 'name',
}

export type MasterListSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: MasterListSortFieldInput;
};

export type NameFilterInput = {
  address1?: InputMaybe<StringFilterInput>;
  address2?: InputMaybe<StringFilterInput>;
  /** Filter by code */
  code?: InputMaybe<StringFilterInput>;
  /** Search filter across name or code */
  codeOrName?: InputMaybe<StringFilterInput>;
  country?: InputMaybe<StringFilterInput>;
  email?: InputMaybe<StringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  /** Filter by customer property */
  isCustomer?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by donor property */
  isDonor?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by manufacturer property */
  isManufacturer?: InputMaybe<Scalars['Boolean']['input']>;
  /** Is this name a store */
  isStore?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by supplier property */
  isSupplier?: InputMaybe<Scalars['Boolean']['input']>;
  /**
   * Show system names (defaults to false)
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
  supplyingStoreId?: InputMaybe<EqualFilterStringInput>;
  /** Filter by the name type */
  type?: InputMaybe<EqualFilterTypeInput>;
};

export enum NameNodeType {
  Facility = 'FACILITY',
  Invad = 'INVAD',
  Repack = 'REPACK',
  Store = 'STORE',
}

export enum NameSortFieldInput {
  Code = 'code',
  Name = 'name',
}

export type NameSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: NameSortFieldInput;
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
export type NullableDatetimeUpdate = {
  value?: InputMaybe<Scalars['NaiveDateTime']['input']>;
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

export type OutboundShipmentLineInput = {
  campaignId?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  numberOfPacks: Scalars['Float']['input'];
  programId?: InputMaybe<Scalars['String']['input']>;
  stockLineId: Scalars['String']['input'];
  vvmStatusId?: InputMaybe<Scalars['String']['input']>;
};

export type PackagingVariantInput = {
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
  packSize?: InputMaybe<Scalars['Float']['input']>;
  packagingLevel: Scalars['Int']['input'];
  volumePerUnit?: InputMaybe<Scalars['Float']['input']>;
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
  gender?: InputMaybe<EqualFilterGenderType>;
  id?: InputMaybe<EqualFilterStringInput>;
  identifier?: InputMaybe<StringFilterInput>;
  lastName?: InputMaybe<StringFilterInput>;
  name?: InputMaybe<StringFilterInput>;
  nextOfKinName?: InputMaybe<StringFilterInput>;
  phone?: InputMaybe<StringFilterInput>;
  programEnrolmentName?: InputMaybe<StringFilterInput>;
};

export type PatientSearchInput = {
  /** Patient code */
  code?: InputMaybe<Scalars['String']['input']>;
  /** Secondary patient code */
  code2?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['NaiveDate']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<GenderTypeNode>;
  identifier?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export enum PatientSortFieldInput {
  Address1 = 'address1',
  Address2 = 'address2',
  Code = 'code',
  Code2 = 'code2',
  Country = 'country',
  CreatedDatetime = 'createdDatetime',
  DateOfBirth = 'dateOfBirth',
  DateOfDeath = 'dateOfDeath',
  Email = 'email',
  FirstName = 'firstName',
  Gender = 'gender',
  LastName = 'lastName',
  Name = 'name',
  Phone = 'phone',
}

export type PatientSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: PatientSortFieldInput;
};

export type PeriodFilterInput = {
  endDate?: InputMaybe<DateFilterInput>;
  startDate?: InputMaybe<DateFilterInput>;
};

export type PluginDataFilterInput = {
  dataIdentifier?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  relatedRecordId?: InputMaybe<EqualFilterStringInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
};

export enum PluginDataSortFieldInput {
  Id = 'id',
  PluginCode = 'pluginCode',
}

export type PluginDataSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: PluginDataSortFieldInput;
};

/** The context we are editing pref within (e.g. prefs for given store, user, etc.) */
export type PreferenceDescriptionContext = {
  storeId?: InputMaybe<Scalars['String']['input']>;
};

export enum PreferenceKey {
  AdjustForNumberOfDaysOutOfStock = 'adjustForNumberOfDaysOutOfStock',
  AllowTrackingOfStockByDonor = 'allowTrackingOfStockByDonor',
  AuthoriseGoodsReceived = 'authoriseGoodsReceived',
  AuthorisePurchaseOrder = 'authorisePurchaseOrder',
  CanCreateInternalOrderFromARequisition = 'canCreateInternalOrderFromARequisition',
  CustomTranslations = 'customTranslations',
  DaysInMonth = 'daysInMonth',
  DisableManualReturns = 'disableManualReturns',
  ExpiredStockIssueThreshold = 'expiredStockIssueThreshold',
  ExpiredStockPreventIssue = 'expiredStockPreventIssue',
  FirstThresholdForExpiringItems = 'firstThresholdForExpiringItems',
  GenderOptions = 'genderOptions',
  InboundShipmentAutoVerify = 'inboundShipmentAutoVerify',
  InvoiceStatusOptions = 'invoiceStatusOptions',
  IsGaps = 'isGaps',
  ItemMarginOverridesSupplierMargin = 'itemMarginOverridesSupplierMargin',
  ManageVaccinesInDoses = 'manageVaccinesInDoses',
  ManageVvmStatusForStock = 'manageVvmStatusForStock',
  NumberOfMonthsThresholdToShowLowStockAlertsForProducts = 'numberOfMonthsThresholdToShowLowStockAlertsForProducts',
  NumberOfMonthsThresholdToShowOverStockAlertsForProducts = 'numberOfMonthsThresholdToShowOverStockAlertsForProducts',
  NumberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts = 'numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts',
  OrderInPacks = 'orderInPacks',
  PreventTransfersMonthsBeforeInitialisation = 'preventTransfersMonthsBeforeInitialisation',
  RequisitionAutoFinalise = 'requisitionAutoFinalise',
  SecondThresholdForExpiringItems = 'secondThresholdForExpiringItems',
  SelectDestinationStoreForAnInternalOrder = 'selectDestinationStoreForAnInternalOrder',
  ShowContactTracing = 'showContactTracing',
  ShowIndicativePriceInRequisitions = 'showIndicativePriceInRequisitions',
  SkipIntermediateStatusesInOutbound = 'skipIntermediateStatusesInOutbound',
  SortByVvmStatusThenExpiry = 'sortByVvmStatusThenExpiry',
  StoreCustomColour = 'storeCustomColour',
  SyncRecordsDisplayThreshold = 'syncRecordsDisplayThreshold',
  UseProcurementFunctionality = 'useProcurementFunctionality',
  UseSimplifiedMobileUi = 'useSimplifiedMobileUi',
  WarnWhenMissingRecentStocktake = 'warnWhenMissingRecentStocktake',
  WarningForExcessRequest = 'warningForExcessRequest',
}

export enum PreferenceNodeType {
  Global = 'GLOBAL',
  Store = 'STORE',
}

export enum PreferenceValueNodeType {
  Boolean = 'BOOLEAN',
  CustomTranslations = 'CUSTOM_TRANSLATIONS',
  Integer = 'INTEGER',
  MultiChoice = 'MULTI_CHOICE',
  String = 'STRING',
  WarnWhenMissingRecentStocktakeData = 'WARN_WHEN_MISSING_RECENT_STOCKTAKE_DATA',
}

export type PrescriptionLineInput = {
  id: Scalars['String']['input'];
  numberOfPacks: Scalars['Float']['input'];
  stockLineId: Scalars['String']['input'];
};

export enum PrintFormat {
  Excel = 'EXCEL',
  Html = 'HTML',
  Pdf = 'PDF',
}

/** This struct is used to sort report data by a key and in descending or ascending order */
export type PrintReportSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: Scalars['String']['input'];
};

export type PrinterFilterInput = {
  address?: InputMaybe<EqualFilterStringInput>;
  description?: InputMaybe<StringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
};

export type ProgramEnrolmentFilterInput = {
  documentName?: InputMaybe<EqualFilterStringInput>;
  enrolmentDatetime?: InputMaybe<DatetimeFilterInput>;
  isImmunisationProgram?: InputMaybe<Scalars['Boolean']['input']>;
  patientId?: InputMaybe<EqualFilterStringInput>;
  programEnrolmentId?: InputMaybe<StringFilterInput>;
  /** The program id */
  programId?: InputMaybe<EqualFilterStringInput>;
  programName?: InputMaybe<StringFilterInput>;
  status?: InputMaybe<StringFilterInput>;
  /** Same as program enrolment document type */
  type?: InputMaybe<EqualFilterStringInput>;
};

export enum ProgramEnrolmentSortFieldInput {
  EnrolmentDatetime = 'enrolmentDatetime',
  PatientId = 'patientId',
  ProgramEnrolmentId = 'programEnrolmentId',
  Status = 'status',
  Type = 'type',
}

export type ProgramEnrolmentSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ProgramEnrolmentSortFieldInput;
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

export enum ProgramEventSortFieldInput {
  ActiveEndDatetime = 'activeEndDatetime',
  ActiveStartDatetime = 'activeStartDatetime',
  Datetime = 'datetime',
  DocumentName = 'documentName',
  DocumentType = 'documentType',
  Type = 'type',
}

export type ProgramEventSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ProgramEventSortFieldInput;
};

export type ProgramFilterInput = {
  contextId?: InputMaybe<EqualFilterStringInput>;
  elmisCode?: InputMaybe<EqualFilterStringInput>;
  existsForStoreId?: InputMaybe<EqualFilterStringInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  isImmunisation?: InputMaybe<Scalars['Boolean']['input']>;
  itemId?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
};

export type ProgramIndicatorFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  programId?: InputMaybe<EqualFilterStringInput>;
};

export enum ProgramIndicatorSortFieldInput {
  Code = 'code',
  ProgramId = 'programId',
}

export type ProgramIndicatorSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  key: ProgramIndicatorSortFieldInput;
};

export enum ProgramSortFieldInput {
  Name = 'name',
}

export type ProgramSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ProgramSortFieldInput;
};

export enum PropertyNodeValueType {
  Boolean = 'BOOLEAN',
  Float = 'FLOAT',
  Integer = 'INTEGER',
  String = 'STRING',
}

export type PurchaseOrderFilterInput = {
  confirmedDatetime?: InputMaybe<DatetimeFilterInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  requestedDeliveryDate?: InputMaybe<DateFilterInput>;
  sentDatetime?: InputMaybe<DatetimeFilterInput>;
  status?: InputMaybe<EqualFilterPurchaseOrderStatusInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
  supplier?: InputMaybe<StringFilterInput>;
};

export type PurchaseOrderLineFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  purchaseOrderId?: InputMaybe<EqualFilterStringInput>;
  receivedLessThanAdjusted?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<EqualFilterPurchaseOrderLineStatusInput>;
};

export enum PurchaseOrderLineSortFieldInput {
  ExpectedDeliveryDate = 'expectedDeliveryDate',
  ItemName = 'itemName',
  LineNumber = 'lineNumber',
  PurchaseOrderNumber = 'purchaseOrderNumber',
  RequestedDeliveryDate = 'requestedDeliveryDate',
}

export type PurchaseOrderLineSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: PurchaseOrderLineSortFieldInput;
};

export enum PurchaseOrderLineStatusNode {
  Closed = 'CLOSED',
  New = 'NEW',
  Sent = 'SENT',
}

export enum PurchaseOrderNodeStatus {
  Confirmed = 'CONFIRMED',
  Finalised = 'FINALISED',
  New = 'NEW',
  RequestApproval = 'REQUEST_APPROVAL',
  Sent = 'SENT',
}

export enum PurchaseOrderSortFieldInput {
  CreatedDatetime = 'createdDatetime',
  Number = 'number',
  Status = 'status',
  TargetMonths = 'targetMonths',
}

export type PurchaseOrderSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: PurchaseOrderSortFieldInput;
};

export type ReasonOptionFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  type?: InputMaybe<EqualFilterReasonOptionTypeInput>;
};

export enum ReasonOptionNodeType {
  ClosedVialWastage = 'CLOSED_VIAL_WASTAGE',
  NegativeInventoryAdjustment = 'NEGATIVE_INVENTORY_ADJUSTMENT',
  OpenVialWastage = 'OPEN_VIAL_WASTAGE',
  PositiveInventoryAdjustment = 'POSITIVE_INVENTORY_ADJUSTMENT',
  RequisitionLineVariance = 'REQUISITION_LINE_VARIANCE',
  ReturnReason = 'RETURN_REASON',
}

export enum ReasonOptionSortFieldInput {
  Reason = 'reason',
  ReasonOptionType = 'reasonOptionType',
}

export type ReasonOptionSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ReasonOptionSortFieldInput;
};

export enum ReportContext {
  Asset = 'ASSET',
  CustomerReturn = 'CUSTOMER_RETURN',
  Dispensary = 'DISPENSARY',
  GoodsReceived = 'GOODS_RECEIVED',
  InboundReturn = 'INBOUND_RETURN',
  InboundShipment = 'INBOUND_SHIPMENT',
  InternalOrder = 'INTERNAL_ORDER',
  OutboundReturn = 'OUTBOUND_RETURN',
  OutboundShipment = 'OUTBOUND_SHIPMENT',
  Patient = 'PATIENT',
  Prescription = 'PRESCRIPTION',
  PurchaseOrder = 'PURCHASE_ORDER',
  Repack = 'REPACK',
  Report = 'REPORT',
  Requisition = 'REQUISITION',
  Resource = 'RESOURCE',
  Stocktake = 'STOCKTAKE',
  SupplierReturn = 'SUPPLIER_RETURN',
}

export type ReportFilterInput = {
  context?: InputMaybe<EqualFilterReportContextInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StringFilterInput>;
  subContext?: InputMaybe<EqualFilterStringInput>;
};

export enum ReportSortFieldInput {
  Code = 'code',
  Id = 'id',
  Name = 'name',
  Version = 'version',
}

export type ReportSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ReportSortFieldInput;
};

export type RequisitionFilterInput = {
  aShipmentHasBeenCreated?: InputMaybe<Scalars['Boolean']['input']>;
  automaticallyCreated?: InputMaybe<Scalars['Boolean']['input']>;
  colour?: InputMaybe<EqualFilterStringInput>;
  comment?: InputMaybe<StringFilterInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  elmisCode?: InputMaybe<EqualFilterStringInput>;
  expectedDeliveryDate?: InputMaybe<DateFilterInput>;
  finalisedDatetime?: InputMaybe<DatetimeFilterInput>;
  hasOutstandingLines?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<EqualFilterStringInput>;
  isEmergency?: InputMaybe<Scalars['Boolean']['input']>;
  isProgramRequisition?: InputMaybe<Scalars['Boolean']['input']>;
  orderType?: InputMaybe<EqualFilterStringInput>;
  otherPartyId?: InputMaybe<EqualFilterStringInput>;
  otherPartyName?: InputMaybe<StringFilterInput>;
  periodId?: InputMaybe<EqualFilterStringInput>;
  programId?: InputMaybe<EqualFilterStringInput>;
  requisitionNumber?: InputMaybe<EqualFilterBigNumberInput>;
  sentDatetime?: InputMaybe<DatetimeFilterInput>;
  status?: InputMaybe<EqualFilterRequisitionStatusInput>;
  theirReference?: InputMaybe<StringFilterInput>;
  type?: InputMaybe<EqualFilterRequisitionTypeInput>;
  userId?: InputMaybe<EqualFilterStringInput>;
};

/** Approval status is applicable to response requisition only */
export enum RequisitionNodeApprovalStatus {
  /** Approved */
  Approved = 'APPROVED',
  ApprovedByAnother = 'APPROVED_BY_ANOTHER',
  AutoApproved = 'AUTO_APPROVED',
  /** Approval was denied, requisition is not editable */
  Denied = 'DENIED',
  DeniedByAnother = 'DENIED_BY_ANOTHER',
  None = 'NONE',
  /** Pending authorisation, requisition should not be editable */
  Pending = 'PENDING',
}

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
  Sent = 'SENT',
}

export enum RequisitionNodeType {
  /** Requisition created by store that is ordering stock */
  Request = 'REQUEST',
  /** Supplying store requisition in response to request requisition */
  Response = 'RESPONSE',
}

export enum RequisitionSortFieldInput {
  Comment = 'comment',
  CreatedDatetime = 'createdDatetime',
  ExpectedDeliveryDate = 'expectedDeliveryDate',
  FinalisedDatetime = 'finalisedDatetime',
  OrderType = 'orderType',
  OtherPartyName = 'otherPartyName',
  PeriodStartDate = 'periodStartDate',
  ProgramName = 'programName',
  RequisitionNumber = 'requisitionNumber',
  SentDatetime = 'sentDatetime',
  Status = 'status',
  TheirReference = 'theirReference',
  Type = 'type',
}

export type RequisitionSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: RequisitionSortFieldInput;
};

export type ResponseAddFromMasterListInput = {
  masterListId: Scalars['String']['input'];
  responseRequisitionId: Scalars['String']['input'];
};

export type ReturnReasonFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
};

export enum ReturnReasonSortFieldInput {
  Id = 'id',
  Reason = 'reason',
}

export type ReturnReasonSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ReturnReasonSortFieldInput;
};

export type RnRFormFilterInput = {
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  periodScheduleId?: InputMaybe<EqualFilterStringInput>;
  programId?: InputMaybe<EqualFilterStringInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
};

export enum RnRFormNodeStatus {
  Draft = 'DRAFT',
  Finalised = 'FINALISED',
}

export enum RnRFormSortFieldInput {
  CreatedDatetime = 'createdDatetime',
  Period = 'period',
  Program = 'program',
  Status = 'status',
  SupplierName = 'supplierName',
}

export type RnRFormSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: RnRFormSortFieldInput;
};

export type SaveGoodsReceivedLine = {
  batch?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  manufacturerId?: InputMaybe<Scalars['String']['input']>;
  numberOfPacksReceived?: InputMaybe<Scalars['Float']['input']>;
  receivedPackSize?: InputMaybe<Scalars['Float']['input']>;
};

export type SaveGoodsReceivedLinesInput = {
  goodsReceivedId: Scalars['String']['input'];
  lines: Array<SaveGoodsReceivedLine>;
  purchaseOrderLineId: Scalars['String']['input'];
};

export type SaveOutboundShipmentLinesInput = {
  invoiceId: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  lines: Array<OutboundShipmentLineInput>;
  placeholderQuantity?: InputMaybe<Scalars['Float']['input']>;
};

export type SavePrescriptionLinesInput = {
  invoiceId: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  lines: Array<PrescriptionLineInput>;
  note?: InputMaybe<Scalars['String']['input']>;
  prescribedQuantity?: InputMaybe<Scalars['Float']['input']>;
};

export type SensorFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StringFilterInput>;
  serial?: InputMaybe<EqualFilterStringInput>;
};

export enum SensorNodeType {
  Berlinger = 'BERLINGER',
  BlueMaestro = 'BLUE_MAESTRO',
  Laird = 'LAIRD',
  LogTag = 'LOG_TAG',
}

export enum SensorSortFieldInput {
  Name = 'name',
  Serial = 'serial',
}

export type SensorSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: SensorSortFieldInput;
};

export type SetPrescribedQuantityInput = {
  invoiceId: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  prescribedQuantity: Scalars['Float']['input'];
};

export type ShippingMethodFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  method?: InputMaybe<StringFilterInput>;
};

export type StockEvolutionOptionsInput = {
  /** Defaults to 30, number of data points for historic stock on hand in stock evolution chart */
  numberOfHistoricDataPoints?: InputMaybe<Scalars['Int']['input']>;
  /** Defaults to 20, number of data points for projected stock on hand in stock evolution chart */
  numberOfProjectedDataPoints?: InputMaybe<Scalars['Int']['input']>;
};

export type StockLineFilterInput = {
  code?: InputMaybe<StringFilterInput>;
  expiryDate?: InputMaybe<DateFilterInput>;
  hasPacksInStore?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<EqualFilterStringInput>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  isAvailable?: InputMaybe<Scalars['Boolean']['input']>;
  isProgramStockLine?: InputMaybe<Scalars['Boolean']['input']>;
  itemCodeOrName?: InputMaybe<StringFilterInput>;
  itemId?: InputMaybe<EqualFilterStringInput>;
  location?: InputMaybe<LocationFilterInput>;
  locationId?: InputMaybe<EqualFilterStringInput>;
  masterList?: InputMaybe<MasterListFilterInput>;
  name?: InputMaybe<StringFilterInput>;
  search?: InputMaybe<StringFilterInput>;
  storeId?: InputMaybe<EqualFilterStringInput>;
  vvmStatusId?: InputMaybe<EqualFilterStringInput>;
};

export enum StockLineSortFieldInput {
  Batch = 'batch',
  CostPricePerPack = 'costPricePerPack',
  ExpiryDate = 'expiryDate',
  ItemCode = 'itemCode',
  ItemName = 'itemName',
  LocationCode = 'locationCode',
  NumberOfPacks = 'numberOfPacks',
  PackSize = 'packSize',
  SupplierName = 'supplierName',
  VvmStatusThenExpiry = 'vvmStatusThenExpiry',
}

export type StockLineSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: StockLineSortFieldInput;
};

export type StocktakeFilterInput = {
  comment?: InputMaybe<StringFilterInput>;
  createdDatetime?: InputMaybe<DatetimeFilterInput>;
  description?: InputMaybe<StringFilterInput>;
  finalisedDatetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  isLocked?: InputMaybe<Scalars['Boolean']['input']>;
  isProgramStocktake?: InputMaybe<Scalars['Boolean']['input']>;
  programId?: InputMaybe<EqualFilterStringInput>;
  status?: InputMaybe<EqualFilterStocktakeStatusInput>;
  stocktakeDate?: InputMaybe<DateFilterInput>;
  stocktakeNumber?: InputMaybe<EqualFilterBigNumberInput>;
  userId?: InputMaybe<EqualFilterStringInput>;
};

export type StocktakeLineFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  itemCodeOrName?: InputMaybe<StringFilterInput>;
  itemId?: InputMaybe<EqualFilterStringInput>;
  locationId?: InputMaybe<EqualFilterStringInput>;
  stockLineId?: InputMaybe<EqualFilterStringInput>;
  stocktakeId?: InputMaybe<EqualFilterStringInput>;
};

export enum StocktakeLineSortFieldInput {
  Batch = 'batch',
  CountedNumberOfPacks = 'countedNumberOfPacks',
  ExpiryDate = 'expiryDate',
  ItemCode = 'itemCode',
  ItemName = 'itemName',
  LocationCode = 'locationCode',
  PackSize = 'packSize',
  ReasonOption = 'reasonOption',
  SnapshotNumberOfPacks = 'snapshotNumberOfPacks',
}

export type StocktakeLineSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: StocktakeLineSortFieldInput;
};

export enum StocktakeNodeStatus {
  Finalised = 'FINALISED',
  New = 'NEW',
}

export enum StocktakeSortFieldInput {
  Comment = 'comment',
  CreatedDatetime = 'createdDatetime',
  Description = 'description',
  FinalisedDatetime = 'finalisedDatetime',
  Status = 'status',
  StocktakeDate = 'stocktakeDate',
  StocktakeNumber = 'stocktakeNumber',
}

export type StocktakeSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: StocktakeSortFieldInput;
};

export type StoreFilterInput = {
  code?: InputMaybe<StringFilterInput>;
  codeOrName?: InputMaybe<StringFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
  nameCode?: InputMaybe<StringFilterInput>;
  siteId?: InputMaybe<EqualFilterNumberInput>;
};

export enum StoreModeNodeType {
  Dispensary = 'DISPENSARY',
  Store = 'STORE',
}

export enum StoreSortFieldInput {
  Code = 'code',
  Name = 'name',
  NameCode = 'nameCode',
}

export type StoreSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: StoreSortFieldInput;
};

export type StringFilterInput = {
  /** Search term must be an exact match (case sensitive) */
  equalTo?: InputMaybe<Scalars['String']['input']>;
  /** Search term must be included in search candidate (case insensitive) */
  like?: InputMaybe<Scalars['String']['input']>;
};

export type StringStorePrefInput = {
  storeId: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type SupplierReturnInput = {
  id: Scalars['String']['input'];
  inboundShipmentId?: InputMaybe<Scalars['String']['input']>;
  supplierId: Scalars['String']['input'];
  supplierReturnLines: Array<SupplierReturnLineInput>;
};

export type SupplierReturnLineInput = {
  id: Scalars['String']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  numberOfPacksToReturn: Scalars['Float']['input'];
  reasonId?: InputMaybe<Scalars['String']['input']>;
  stockLineId: Scalars['String']['input'];
};

export type SupplyRequestedQuantityInput = {
  responseRequisitionId: Scalars['String']['input'];
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
  Unknown = 'UNKNOWN',
  V6ApiVersionIncompatible = 'V6_API_VERSION_INCOMPATIBLE',
}

export type SyncSettingsInput = {
  /** Sync interval */
  intervalSeconds: Scalars['Int']['input'];
  /** Plain text password */
  password: Scalars['String']['input'];
  url: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type TaxInput = {
  /** Set or unset the tax value (in percentage) */
  percentage?: InputMaybe<Scalars['Float']['input']>;
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

export enum TemperatureBreachNodeType {
  ColdConsecutive = 'COLD_CONSECUTIVE',
  ColdCumulative = 'COLD_CUMULATIVE',
  Excursion = 'EXCURSION',
  HotConsecutive = 'HOT_CONSECUTIVE',
  HotCumulative = 'HOT_CUMULATIVE',
}

export enum TemperatureBreachSortFieldInput {
  EndDatetime = 'endDatetime',
  StartDatetime = 'startDatetime',
}

export type TemperatureBreachSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: TemperatureBreachSortFieldInput;
};

export type TemperatureLogFilterInput = {
  datetime?: InputMaybe<DatetimeFilterInput>;
  id?: InputMaybe<EqualFilterStringInput>;
  location?: InputMaybe<LocationFilterInput>;
  sensor?: InputMaybe<SensorFilterInput>;
  temperatureBreach?: InputMaybe<TemperatureBreachFilterInput>;
};

export enum TemperatureLogSortFieldInput {
  Datetime = 'datetime',
  Temperature = 'temperature',
}

export type TemperatureLogSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: TemperatureLogSortFieldInput;
};

export enum UniqueCombinationKey {
  Manufacturer = 'manufacturer',
  Model = 'model',
}

export enum UniqueValueKey {
  Code = 'code',
  Name = 'name',
  Serial = 'serial',
}

export type UpdateAssetInput = {
  assetNumber?: InputMaybe<Scalars['String']['input']>;
  catalogueItemId?: InputMaybe<NullableStringUpdate>;
  donorNameId?: InputMaybe<NullableStringUpdate>;
  id: Scalars['String']['input'];
  installationDate?: InputMaybe<NullableDateUpdate>;
  locationIds?: InputMaybe<Array<Scalars['String']['input']>>;
  needsReplacement?: InputMaybe<Scalars['Boolean']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  properties?: InputMaybe<Scalars['String']['input']>;
  replacementDate?: InputMaybe<NullableDateUpdate>;
  serialNumber?: InputMaybe<NullableStringUpdate>;
  storeId?: InputMaybe<NullableStringUpdate>;
  warrantyEnd?: InputMaybe<NullableDateUpdate>;
  warrantyStart?: InputMaybe<NullableDateUpdate>;
};

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

export type UpdateCustomerReturnInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  otherPartyId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UpdateCustomerReturnStatusInput>;
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateCustomerReturnLinesInput = {
  customerReturnId: Scalars['String']['input'];
  customerReturnLines: Array<CustomerReturnLineInput>;
};

export enum UpdateCustomerReturnStatusInput {
  Received = 'RECEIVED',
  Verified = 'VERIFIED',
}

export type UpdateDemographicIndicatorInput = {
  basePopulation?: InputMaybe<Scalars['Int']['input']>;
  baseYear?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  populationPercentage?: InputMaybe<Scalars['Float']['input']>;
  year1Projection?: InputMaybe<Scalars['Int']['input']>;
  year2Projection?: InputMaybe<Scalars['Int']['input']>;
  year3Projection?: InputMaybe<Scalars['Int']['input']>;
  year4Projection?: InputMaybe<Scalars['Int']['input']>;
  year5Projection?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateDemographicProjectionInput = {
  baseYear?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['String']['input'];
  year1?: InputMaybe<Scalars['Float']['input']>;
  year2?: InputMaybe<Scalars['Float']['input']>;
  year3?: InputMaybe<Scalars['Float']['input']>;
  year4?: InputMaybe<Scalars['Float']['input']>;
  year5?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateDonorInput = {
  applyToLines: ApplyToLinesInput;
  donorId?: InputMaybe<Scalars['String']['input']>;
};

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

export type UpdateGoodsReceivedInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  donorId?: InputMaybe<NullableStringUpdate>;
  id: Scalars['String']['input'];
  receivedDate?: InputMaybe<NullableDateUpdate>;
  status?: InputMaybe<GoodsReceivedNodeType>;
  supplierReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateGoodsReceivedLineInput = {
  batch?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  manufacturerId?: InputMaybe<Scalars['String']['input']>;
  numberOfPacksReceived?: InputMaybe<Scalars['Float']['input']>;
  receivedPackSize?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateInboundShipmentInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  currencyId?: InputMaybe<Scalars['String']['input']>;
  currencyRate?: InputMaybe<Scalars['Float']['input']>;
  defaultDonor?: InputMaybe<UpdateDonorInput>;
  id: Scalars['String']['input'];
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  otherPartyId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UpdateInboundShipmentStatusInput>;
  tax?: InputMaybe<TaxInput>;
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateInboundShipmentLineInput = {
  batch?: InputMaybe<Scalars['String']['input']>;
  campaignId?: InputMaybe<NullableStringUpdate>;
  costPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  donorId?: InputMaybe<NullableStringUpdate>;
  expiryDate?: InputMaybe<NullableDateUpdate>;
  id: Scalars['String']['input'];
  itemId?: InputMaybe<Scalars['String']['input']>;
  itemVariantId?: InputMaybe<NullableStringUpdate>;
  location?: InputMaybe<NullableStringUpdate>;
  note?: InputMaybe<NullableStringUpdate>;
  numberOfPacks?: InputMaybe<Scalars['Float']['input']>;
  packSize?: InputMaybe<Scalars['Float']['input']>;
  programId?: InputMaybe<NullableStringUpdate>;
  sellPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  shippedNumberOfPacks?: InputMaybe<Scalars['Float']['input']>;
  shippedPackSize?: InputMaybe<Scalars['Float']['input']>;
  tax?: InputMaybe<TaxInput>;
  totalBeforeTax?: InputMaybe<Scalars['Float']['input']>;
  volumePerPack?: InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateInboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
  itemId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  tax?: InputMaybe<TaxInput>;
  totalBeforeTax?: InputMaybe<Scalars['Float']['input']>;
};

export enum UpdateInboundShipmentStatusInput {
  Delivered = 'DELIVERED',
  Received = 'RECEIVED',
  Verified = 'VERIFIED',
}

export type UpdateIndicatorValueInput = {
  id: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type UpdateInsuranceInput = {
  discountPercentage?: InputMaybe<Scalars['Float']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  insuranceProviderId?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  nameOfInsured?: InputMaybe<Scalars['String']['input']>;
  policyType?: InputMaybe<InsurancePolicyNodeType>;
};

export type UpdateLocationInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  locationTypeId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  volume?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateNamePropertiesInput = {
  id: Scalars['String']['input'];
  properties?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOutboundShipmentInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  currencyId?: InputMaybe<Scalars['String']['input']>;
  currencyRate?: InputMaybe<Scalars['Float']['input']>;
  expectedDeliveryDate?: InputMaybe<NullableDateUpdate>;
  /** The new invoice id provided by the client */
  id: Scalars['String']['input'];
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  shippingMethodId?: InputMaybe<NullableStringUpdate>;
  /**
   * When changing the status from DRAFT to CONFIRMED or FINALISED the total_number_of_packs for
   * existing invoice items gets updated.
   */
  status?: InputMaybe<UpdateOutboundShipmentStatusInput>;
  tax?: InputMaybe<TaxInput>;
  /** External invoice reference, e.g. purchase or shipment number */
  theirReference?: InputMaybe<Scalars['String']['input']>;
  transportReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOutboundShipmentLineInput = {
  id: Scalars['String']['input'];
  numberOfPacks?: InputMaybe<Scalars['Float']['input']>;
  prescribedQuantity?: InputMaybe<Scalars['Float']['input']>;
  stockLineId?: InputMaybe<Scalars['String']['input']>;
  tax?: InputMaybe<TaxInput>;
  vvmStatusId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOutboundShipmentNameInput = {
  id: Scalars['String']['input'];
  otherPartyId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOutboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
  itemId?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  tax?: InputMaybe<TaxInput>;
  totalBeforeTax?: InputMaybe<Scalars['Float']['input']>;
};

export enum UpdateOutboundShipmentStatusInput {
  Allocated = 'ALLOCATED',
  Picked = 'PICKED',
  Shipped = 'SHIPPED',
}

export type UpdateOutboundShipmentUnallocatedLineInput = {
  id: Scalars['String']['input'];
  quantity: Scalars['Float']['input'];
};

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
  gender?: InputMaybe<GenderTypeNode>;
  id: Scalars['String']['input'];
  isDeceased?: InputMaybe<Scalars['Boolean']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  nextOfKinId?: InputMaybe<Scalars['String']['input']>;
  nextOfKinName?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePluginDataInput = {
  data: Scalars['String']['input'];
  dataIdentifier: Scalars['String']['input'];
  id: Scalars['String']['input'];
  pluginCode: Scalars['String']['input'];
  relatedRecordId?: InputMaybe<Scalars['String']['input']>;
  storeId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePrescriptionInput = {
  clinicianId?: InputMaybe<NullableStringUpdate>;
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  diagnosisId?: InputMaybe<NullableStringUpdate>;
  id: Scalars['String']['input'];
  insuranceDiscountAmount?: InputMaybe<Scalars['Float']['input']>;
  insuranceDiscountPercentage?: InputMaybe<Scalars['Float']['input']>;
  nameInsuranceJoinId?: InputMaybe<NullableStringUpdate>;
  patientId?: InputMaybe<Scalars['String']['input']>;
  prescriptionDate?: InputMaybe<Scalars['DateTime']['input']>;
  programId?: InputMaybe<NullableStringUpdate>;
  status?: InputMaybe<UpdatePrescriptionStatusInput>;
  theirReference?: InputMaybe<NullableStringUpdate>;
};

export type UpdatePrescriptionLineInput = {
  id: Scalars['String']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  numberOfPacks?: InputMaybe<Scalars['Float']['input']>;
  stockLineId?: InputMaybe<Scalars['String']['input']>;
};

export enum UpdatePrescriptionStatusInput {
  Cancelled = 'CANCELLED',
  Picked = 'PICKED',
  Verified = 'VERIFIED',
}

export type UpdatePrinterInput = {
  address: Scalars['String']['input'];
  description: Scalars['String']['input'];
  id: Scalars['String']['input'];
  labelHeight: Scalars['Int']['input'];
  labelWidth: Scalars['Int']['input'];
  port: Scalars['Int']['input'];
};

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

export type UpdateProgramPatientInput = {
  /** Patient document data */
  data: Scalars['JSON']['input'];
  parent: Scalars['String']['input'];
  /** The schema id used for the patient data */
  schemaId: Scalars['String']['input'];
};

export type UpdatePurchaseOrderInput = {
  additionalInstructions?: InputMaybe<Scalars['String']['input']>;
  advancePaidDate?: InputMaybe<NullableDateUpdate>;
  agentCommission?: InputMaybe<Scalars['Float']['input']>;
  authorisingOfficer1?: InputMaybe<Scalars['String']['input']>;
  authorisingOfficer2?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  communicationsCharge?: InputMaybe<Scalars['Float']['input']>;
  confirmedDatetime?: InputMaybe<NullableDatetimeUpdate>;
  contractSignedDate?: InputMaybe<NullableDateUpdate>;
  currencyId?: InputMaybe<Scalars['String']['input']>;
  documentCharge?: InputMaybe<Scalars['Float']['input']>;
  donorId?: InputMaybe<NullableStringUpdate>;
  foreignExchangeRate?: InputMaybe<Scalars['Float']['input']>;
  freightCharge?: InputMaybe<Scalars['Float']['input']>;
  freightConditions?: InputMaybe<Scalars['String']['input']>;
  headingMessage?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  insuranceCharge?: InputMaybe<Scalars['Float']['input']>;
  receivedAtPortDate?: InputMaybe<NullableDateUpdate>;
  reference?: InputMaybe<Scalars['String']['input']>;
  requestedDeliveryDate?: InputMaybe<NullableDateUpdate>;
  sentDatetime?: InputMaybe<NullableDatetimeUpdate>;
  shippingMethod?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<PurchaseOrderNodeStatus>;
  supplierAgent?: InputMaybe<Scalars['String']['input']>;
  supplierDiscountAmount?: InputMaybe<Scalars['Float']['input']>;
  supplierDiscountPercentage?: InputMaybe<Scalars['Float']['input']>;
  supplierId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePurchaseOrderLineInput = {
  adjustedNumberOfUnits?: InputMaybe<Scalars['Float']['input']>;
  comment?: InputMaybe<NullableStringUpdate>;
  expectedDeliveryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  itemId?: InputMaybe<Scalars['String']['input']>;
  manufacturerId?: InputMaybe<NullableStringUpdate>;
  note?: InputMaybe<NullableStringUpdate>;
  pricePerPackAfterDiscount?: InputMaybe<Scalars['Float']['input']>;
  pricePerPackBeforeDiscount?: InputMaybe<Scalars['Float']['input']>;
  requestedDeliveryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  requestedNumberOfUnits?: InputMaybe<Scalars['Float']['input']>;
  requestedPackSize?: InputMaybe<Scalars['Float']['input']>;
  status?: InputMaybe<PurchaseOrderLineStatusNode>;
  supplierItemCode?: InputMaybe<NullableStringUpdate>;
  unit?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRequestRequisitionInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  expectedDeliveryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  maxMonthsOfStock?: InputMaybe<Scalars['Float']['input']>;
  minMonthsOfStock?: InputMaybe<Scalars['Float']['input']>;
  originalCustomerId?: InputMaybe<NullableStringUpdate>;
  otherPartyId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UpdateRequestRequisitionStatusInput>;
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRequestRequisitionLineInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  optionId?: InputMaybe<Scalars['String']['input']>;
  requestedQuantity?: InputMaybe<Scalars['Float']['input']>;
};

export enum UpdateRequestRequisitionStatusInput {
  Sent = 'SENT',
}

export type UpdateResponseRequisitionInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  status?: InputMaybe<UpdateResponseRequisitionStatusInput>;
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateResponseRequisitionLineInput = {
  additionInUnits?: InputMaybe<Scalars['Float']['input']>;
  averageMonthlyConsumption?: InputMaybe<Scalars['Float']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  daysOutOfStock?: InputMaybe<Scalars['Float']['input']>;
  expiringUnits?: InputMaybe<Scalars['Float']['input']>;
  id: Scalars['String']['input'];
  incomingUnits?: InputMaybe<Scalars['Float']['input']>;
  initialStockOnHand?: InputMaybe<Scalars['Float']['input']>;
  lossInUnits?: InputMaybe<Scalars['Float']['input']>;
  optionId?: InputMaybe<Scalars['String']['input']>;
  outgoingUnits?: InputMaybe<Scalars['Float']['input']>;
  requestedQuantity?: InputMaybe<Scalars['Float']['input']>;
  stockOnHand?: InputMaybe<Scalars['Float']['input']>;
  supplyQuantity?: InputMaybe<Scalars['Float']['input']>;
};

export enum UpdateResponseRequisitionStatusInput {
  Finalised = 'FINALISED',
}

export type UpdateRnRFormInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  lines: Array<UpdateRnRFormLineInput>;
  theirReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRnRFormLineInput = {
  adjustedQuantityConsumed: Scalars['Float']['input'];
  adjustments?: InputMaybe<Scalars['Float']['input']>;
  averageMonthlyConsumption: Scalars['Float']['input'];
  calculatedRequestedQuantity: Scalars['Float']['input'];
  comment?: InputMaybe<Scalars['String']['input']>;
  confirmed: Scalars['Boolean']['input'];
  enteredRequestedQuantity?: InputMaybe<Scalars['Float']['input']>;
  expiryDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  finalBalance: Scalars['Float']['input'];
  id: Scalars['String']['input'];
  initialBalance: Scalars['Float']['input'];
  losses?: InputMaybe<Scalars['Float']['input']>;
  lowStock: LowStockStatus;
  maximumQuantity: Scalars['Float']['input'];
  minimumQuantity: Scalars['Float']['input'];
  quantityConsumed?: InputMaybe<Scalars['Float']['input']>;
  quantityReceived?: InputMaybe<Scalars['Float']['input']>;
  stockOutDuration: Scalars['Int']['input'];
};

export type UpdateSensorInput = {
  id: Scalars['String']['input'];
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  locationId?: InputMaybe<NullableStringUpdate>;
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateStockLineInput = {
  /** Empty barcode will unlink barcode from StockLine */
  barcode?: InputMaybe<Scalars['String']['input']>;
  batch?: InputMaybe<Scalars['String']['input']>;
  campaignId?: InputMaybe<NullableStringUpdate>;
  costPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  donorId?: InputMaybe<NullableStringUpdate>;
  expiryDate?: InputMaybe<NullableDateUpdate>;
  id: Scalars['String']['input'];
  itemVariantId?: InputMaybe<NullableStringUpdate>;
  location?: InputMaybe<NullableStringUpdate>;
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  programId?: InputMaybe<NullableStringUpdate>;
  sellPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  volumePerPack?: InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateStocktakeInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  countedBy?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  isLocked?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<UpdateStocktakeStatusInput>;
  stocktakeDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  verifiedBy?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateStocktakeLineInput = {
  batch?: InputMaybe<Scalars['String']['input']>;
  campaignId?: InputMaybe<NullableStringUpdate>;
  comment?: InputMaybe<Scalars['String']['input']>;
  costPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  countedNumberOfPacks?: InputMaybe<Scalars['Float']['input']>;
  donorId?: InputMaybe<NullableStringUpdate>;
  expiryDate?: InputMaybe<NullableDateUpdate>;
  id: Scalars['String']['input'];
  itemVariantId?: InputMaybe<NullableStringUpdate>;
  location?: InputMaybe<NullableStringUpdate>;
  note?: InputMaybe<Scalars['String']['input']>;
  packSize?: InputMaybe<Scalars['Float']['input']>;
  programId?: InputMaybe<NullableStringUpdate>;
  reasonOptionId?: InputMaybe<Scalars['String']['input']>;
  sellPricePerPack?: InputMaybe<Scalars['Float']['input']>;
  snapshotNumberOfPacks?: InputMaybe<Scalars['Float']['input']>;
  volumePerPack?: InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: InputMaybe<Scalars['String']['input']>;
};

export enum UpdateStocktakeStatusInput {
  Finalised = 'FINALISED',
}

export type UpdateSupplierReturnInput = {
  colour?: InputMaybe<Scalars['String']['input']>;
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  onHold?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<UpdateSupplierReturnStatusInput>;
  theirReference?: InputMaybe<Scalars['String']['input']>;
  transportReference?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateSupplierReturnLinesInput = {
  supplierReturnId: Scalars['String']['input'];
  supplierReturnLines: Array<SupplierReturnLineInput>;
};

export type UpdateSupplierReturnOtherPartyInput = {
  id: Scalars['String']['input'];
  otherPartyId?: InputMaybe<Scalars['String']['input']>;
};

export enum UpdateSupplierReturnStatusInput {
  Picked = 'PICKED',
  Shipped = 'SHIPPED',
}

export type UpdateTemperatureBreachInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  unacknowledged: Scalars['Boolean']['input'];
};

export type UpdateVvmStatusLogInput = {
  comment?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
};

export type UpdateVaccinationInput = {
  clinicianId?: InputMaybe<NullableStringUpdate>;
  comment?: InputMaybe<Scalars['String']['input']>;
  facilityFreeText?: InputMaybe<NullableStringUpdate>;
  facilityNameId?: InputMaybe<NullableStringUpdate>;
  given?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
  itemId?: InputMaybe<NullableStringUpdate>;
  notGivenReason?: InputMaybe<Scalars['String']['input']>;
  stockLineId?: InputMaybe<NullableStringUpdate>;
  updateTransactions?: InputMaybe<Scalars['Boolean']['input']>;
  vaccinationDate?: InputMaybe<Scalars['NaiveDate']['input']>;
};

export type UpdateVaccineCourseInput = {
  canSkipDose?: InputMaybe<Scalars['Boolean']['input']>;
  coverageRate: Scalars['Float']['input'];
  demographicId?: InputMaybe<Scalars['String']['input']>;
  doses: Array<UpsertVaccineCourseDoseInput>;
  id: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  useInGapsCalculations: Scalars['Boolean']['input'];
  vaccineItems: Array<UpsertVaccineCourseItemInput>;
  wastageRate: Scalars['Float']['input'];
};

export enum UploadedPluginErrorVariant {
  CannotParseFile = 'CANNOT_PARSE_FILE',
}

export type UpsertBundledItemInput = {
  bundledItemVariantId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  principalItemVariantId: Scalars['String']['input'];
  ratio: Scalars['Float']['input'];
};

export type UpsertCampaignInput = {
  endDate?: InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
  startDate?: InputMaybe<Scalars['NaiveDate']['input']>;
};

export type UpsertItemVariantInput = {
  id: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  locationTypeId?: InputMaybe<NullableStringUpdate>;
  manufacturerId?: InputMaybe<NullableStringUpdate>;
  name: Scalars['String']['input'];
  packagingVariants: Array<PackagingVariantInput>;
  vvmType?: InputMaybe<NullableStringUpdate>;
};

export type UpsertLogLevelInput = {
  level: LogLevelEnum;
};

export type UpsertPreferencesInput = {
  adjustForNumberOfDaysOutOfStock?: InputMaybe<Scalars['Boolean']['input']>;
  allowTrackingOfStockByDonor?: InputMaybe<Scalars['Boolean']['input']>;
  authoriseGoodsReceived?: InputMaybe<Scalars['Boolean']['input']>;
  authorisePurchaseOrder?: InputMaybe<Scalars['Boolean']['input']>;
  canCreateInternalOrderFromARequisition?: InputMaybe<
    Array<BoolStorePrefInput>
  >;
  customTranslations?: InputMaybe<Scalars['JSONObject']['input']>;
  daysInMonth?: InputMaybe<Scalars['Float']['input']>;
  disableManualReturns?: InputMaybe<Array<BoolStorePrefInput>>;
  expiredStockIssueThreshold?: InputMaybe<Scalars['Int']['input']>;
  expiredStockPreventIssue?: InputMaybe<Scalars['Boolean']['input']>;
  firstThresholdForExpiringItems?: InputMaybe<Array<IntegerStorePrefInput>>;
  genderOptions?: InputMaybe<Array<GenderTypeNode>>;
  inboundShipmentAutoVerify?: InputMaybe<Array<BoolStorePrefInput>>;
  invoiceStatusOptions?: InputMaybe<Array<InvoiceStatusOptionsInput>>;
  isGaps?: InputMaybe<Scalars['Boolean']['input']>;
  itemMarginOverridesSupplierMargin?: InputMaybe<Scalars['Boolean']['input']>;
  manageVaccinesInDoses?: InputMaybe<Array<BoolStorePrefInput>>;
  manageVvmStatusForStock?: InputMaybe<Array<BoolStorePrefInput>>;
  numberOfMonthsThresholdToShowLowStockAlertsForProducts?: InputMaybe<
    Array<IntegerStorePrefInput>
  >;
  numberOfMonthsThresholdToShowOverStockAlertsForProducts?: InputMaybe<
    Array<IntegerStorePrefInput>
  >;
  numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts?: InputMaybe<
    Array<IntegerStorePrefInput>
  >;
  orderInPacks?: InputMaybe<Array<BoolStorePrefInput>>;
  preventTransfersMonthsBeforeInitialisation?: InputMaybe<
    Scalars['Int']['input']
  >;
  requisitionAutoFinalise?: InputMaybe<Array<BoolStorePrefInput>>;
  secondThresholdForExpiringItems?: InputMaybe<Array<IntegerStorePrefInput>>;
  selectDestinationStoreForAnInternalOrder?: InputMaybe<
    Array<BoolStorePrefInput>
  >;
  showContactTracing?: InputMaybe<Scalars['Boolean']['input']>;
  showIndicativePriceInRequisitions?: InputMaybe<Scalars['Boolean']['input']>;
  sortByVvmStatusThenExpiry?: InputMaybe<Array<BoolStorePrefInput>>;
  storeCustomColour?: InputMaybe<Array<StringStorePrefInput>>;
  syncRecordsDisplayThreshold?: InputMaybe<Scalars['Int']['input']>;
  useProcurementFunctionality?: InputMaybe<Array<BoolStorePrefInput>>;
  useSimplifiedMobileUi?: InputMaybe<Array<BoolStorePrefInput>>;
  warnWhenMissingRecentStocktake?: InputMaybe<
    Array<WarnWhenMissingRecentStocktakeInput>
  >;
  warningForExcessRequest?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpsertVaccineCourseDoseInput = {
  customAgeLabel?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  label: Scalars['String']['input'];
  maxAge: Scalars['Float']['input'];
  minAge: Scalars['Float']['input'];
  minIntervalDays: Scalars['Int']['input'];
};

export type UpsertVaccineCourseItemInput = {
  id: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
};

export type UseSuggestedQuantityInput = {
  requestRequisitionId: Scalars['String']['input'];
};

export enum UserPermission {
  AssetCatalogueItemMutate = 'ASSET_CATALOGUE_ITEM_MUTATE',
  AssetMutate = 'ASSET_MUTATE',
  AssetMutateViaDataMatrix = 'ASSET_MUTATE_VIA_DATA_MATRIX',
  AssetQuery = 'ASSET_QUERY',
  AssetStatusMutate = 'ASSET_STATUS_MUTATE',
  CancelFinalisedInvoices = 'CANCEL_FINALISED_INVOICES',
  ColdChainApi = 'COLD_CHAIN_API',
  CreateRepack = 'CREATE_REPACK',
  CustomerReturnMutate = 'CUSTOMER_RETURN_MUTATE',
  CustomerReturnQuery = 'CUSTOMER_RETURN_QUERY',
  DocumentMutate = 'DOCUMENT_MUTATE',
  DocumentQuery = 'DOCUMENT_QUERY',
  EditCentralData = 'EDIT_CENTRAL_DATA',
  GoodsReceivedAuthorise = 'GOODS_RECEIVED_AUTHORISE',
  GoodsReceivedMutate = 'GOODS_RECEIVED_MUTATE',
  GoodsReceivedQuery = 'GOODS_RECEIVED_QUERY',
  InboundShipmentMutate = 'INBOUND_SHIPMENT_MUTATE',
  InboundShipmentQuery = 'INBOUND_SHIPMENT_QUERY',
  InboundShipmentVerify = 'INBOUND_SHIPMENT_VERIFY',
  InventoryAdjustmentMutate = 'INVENTORY_ADJUSTMENT_MUTATE',
  ItemMutate = 'ITEM_MUTATE',
  ItemNamesCodesAndUnitsMutate = 'ITEM_NAMES_CODES_AND_UNITS_MUTATE',
  LocationMutate = 'LOCATION_MUTATE',
  LogQuery = 'LOG_QUERY',
  MutateClinician = 'MUTATE_CLINICIAN',
  NamePropertiesMutate = 'NAME_PROPERTIES_MUTATE',
  OutboundShipmentMutate = 'OUTBOUND_SHIPMENT_MUTATE',
  OutboundShipmentQuery = 'OUTBOUND_SHIPMENT_QUERY',
  PatientMutate = 'PATIENT_MUTATE',
  PatientQuery = 'PATIENT_QUERY',
  PrescriptionMutate = 'PRESCRIPTION_MUTATE',
  PrescriptionQuery = 'PRESCRIPTION_QUERY',
  PurchaseOrderAuthorise = 'PURCHASE_ORDER_AUTHORISE',
  PurchaseOrderMutate = 'PURCHASE_ORDER_MUTATE',
  PurchaseOrderQuery = 'PURCHASE_ORDER_QUERY',
  Report = 'REPORT',
  RequisitionCreateOutboundShipment = 'REQUISITION_CREATE_OUTBOUND_SHIPMENT',
  RequisitionMutate = 'REQUISITION_MUTATE',
  RequisitionQuery = 'REQUISITION_QUERY',
  RequisitionSend = 'REQUISITION_SEND',
  RnrFormMutate = 'RNR_FORM_MUTATE',
  RnrFormQuery = 'RNR_FORM_QUERY',
  SensorMutate = 'SENSOR_MUTATE',
  SensorQuery = 'SENSOR_QUERY',
  ServerAdmin = 'SERVER_ADMIN',
  StocktakeMutate = 'STOCKTAKE_MUTATE',
  StocktakeQuery = 'STOCKTAKE_QUERY',
  StockLineMutate = 'STOCK_LINE_MUTATE',
  StockLineQuery = 'STOCK_LINE_QUERY',
  StoreAccess = 'STORE_ACCESS',
  SupplierReturnMutate = 'SUPPLIER_RETURN_MUTATE',
  SupplierReturnQuery = 'SUPPLIER_RETURN_QUERY',
  TemperatureBreachQuery = 'TEMPERATURE_BREACH_QUERY',
  TemperatureLogQuery = 'TEMPERATURE_LOG_QUERY',
  ViewAndEditVvmStatus = 'VIEW_AND_EDIT_VVM_STATUS',
}

export enum VaccinationCardItemNodeStatus {
  Given = 'GIVEN',
  Late = 'LATE',
  NotGiven = 'NOT_GIVEN',
  Pending = 'PENDING',
}

export type VaccineCourseFilterInput = {
  id?: InputMaybe<EqualFilterStringInput>;
  name?: InputMaybe<StringFilterInput>;
  programId?: InputMaybe<EqualFilterStringInput>;
};

export enum VaccineCourseSortFieldInput {
  Name = 'name',
}

export type VaccineCourseSortInput = {
  desc?: InputMaybe<Scalars['Boolean']['input']>;
  key: VaccineCourseSortFieldInput;
};

export enum VenCategoryType {
  E = 'E',
  N = 'N',
  NotAssigned = 'NOT_ASSIGNED',
  V = 'V',
}

export type WarnWhenMissingRecentStocktakeDataInput = {
  enabled: Scalars['Boolean']['input'];
  maxAge: Scalars['Int']['input'];
  minItems: Scalars['Int']['input'];
};

export type WarnWhenMissingRecentStocktakeInput = {
  storeId: Scalars['String']['input'];
  value: WarnWhenMissingRecentStocktakeDataInput;
};
