import * as Types from '../../codegenTypes';

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
  id?: Types.InputMaybe<EqualFilterStringInput>;
  text?: Types.InputMaybe<StringFilterInput>;
};

export type ActiveEncounterEventFilterInput = {
  data?: Types.InputMaybe<StringFilterInput>;
  /**
   * Only include events that are for the current encounter, i.e. have matching encounter type
   * and matching encounter name of the current encounter. If not set all events with matching
   * encounter type are returned.
   */
  isCurrentEncounter?: Types.InputMaybe<Scalars['Boolean']['input']>;
  type?: Types.InputMaybe<EqualFilterStringInput>;
};

export type ActivityLogFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  recordId?: Types.InputMaybe<EqualFilterStringInput>;
  storeId?: Types.InputMaybe<EqualFilterStringInput>;
  type?: Types.InputMaybe<EqualFilterActivityLogTypeInput>;
  userId?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  category?: Types.InputMaybe<StringFilterInput>;
  categoryId?: Types.InputMaybe<EqualFilterStringInput>;
  class?: Types.InputMaybe<StringFilterInput>;
  classId?: Types.InputMaybe<EqualFilterStringInput>;
  code?: Types.InputMaybe<StringFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  manufacturer?: Types.InputMaybe<StringFilterInput>;
  model?: Types.InputMaybe<StringFilterInput>;
  search?: Types.InputMaybe<StringFilterInput>;
  subCatalogue?: Types.InputMaybe<StringFilterInput>;
  type?: Types.InputMaybe<StringFilterInput>;
  typeId?: Types.InputMaybe<EqualFilterStringInput>;
};

export enum AssetCatalogueItemSortFieldInput {
  Catalogue = 'catalogue',
  Code = 'code',
  Manufacturer = 'manufacturer',
  Model = 'model',
}

export type AssetCatalogueItemSortInput = {
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  key: AssetCatalogueItemSortFieldInput;
};

export type AssetCategoryFilterInput = {
  classId?: Types.InputMaybe<EqualFilterStringInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  name?: Types.InputMaybe<StringFilterInput>;
};

export enum AssetCategorySortFieldInput {
  Name = 'name',
}

export type AssetCategorySortInput = {
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  key: AssetCategorySortFieldInput;
};

export type AssetClassFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  name?: Types.InputMaybe<StringFilterInput>;
};

export enum AssetClassSortFieldInput {
  Name = 'name',
}

export type AssetClassSortInput = {
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  key: AssetClassSortFieldInput;
};

export type AssetFilterInput = {
  assetNumber?: Types.InputMaybe<StringFilterInput>;
  catalogueItemId?: Types.InputMaybe<EqualFilterStringInput>;
  categoryId?: Types.InputMaybe<EqualFilterStringInput>;
  classId?: Types.InputMaybe<EqualFilterStringInput>;
  functionalStatus?: Types.InputMaybe<EqualFilterStatusInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  installationDate?: Types.InputMaybe<DateFilterInput>;
  isNonCatalogue?: Types.InputMaybe<Scalars['Boolean']['input']>;
  notes?: Types.InputMaybe<StringFilterInput>;
  replacementDate?: Types.InputMaybe<DateFilterInput>;
  serialNumber?: Types.InputMaybe<StringFilterInput>;
  storeCodeOrName?: Types.InputMaybe<StringFilterInput>;
  storeId?: Types.InputMaybe<StringFilterInput>;
  typeId?: Types.InputMaybe<EqualFilterStringInput>;
};

export type AssetLogFilterInput = {
  assetId?: Types.InputMaybe<EqualFilterStringInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  logDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  reasonId?: Types.InputMaybe<EqualFilterStringInput>;
  status?: Types.InputMaybe<EqualFilterStatusInput>;
  user?: Types.InputMaybe<StringFilterInput>;
};

export type AssetLogReasonFilterInput = {
  assetLogStatus?: Types.InputMaybe<EqualFilterStatusInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  reason?: Types.InputMaybe<StringFilterInput>;
};

export enum AssetLogReasonSortFieldInput {
  Status = 'status',
}

export type AssetLogReasonSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  assetCategoryId?: Types.InputMaybe<EqualFilterStringInput>;
  assetClassId?: Types.InputMaybe<EqualFilterStringInput>;
  assetTypeId?: Types.InputMaybe<EqualFilterStringInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  key?: Types.InputMaybe<EqualFilterStringInput>;
  name?: Types.InputMaybe<StringFilterInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: AssetSortFieldInput;
};

export type AssetTypeFilterInput = {
  categoryId?: Types.InputMaybe<EqualFilterStringInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  name?: Types.InputMaybe<StringFilterInput>;
};

export enum AssetTypeSortFieldInput {
  Name = 'name',
}

export type AssetTypeSortInput = {
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  key: AssetTypeSortFieldInput;
};

export type BatchInboundShipmentInput = {
  continueOnError?: Types.InputMaybe<Scalars['Boolean']['input']>;
  deleteInboundShipmentLines?: Types.InputMaybe<Array<DeleteInboundShipmentLineInput>>;
  deleteInboundShipmentServiceLines?: Types.InputMaybe<Array<DeleteInboundShipmentServiceLineInput>>;
  deleteInboundShipments?: Types.InputMaybe<Array<DeleteInboundShipmentInput>>;
  insertFromInternalOrderLines?: Types.InputMaybe<Array<InsertInboundShipmentLineFromInternalOrderLineInput>>;
  insertInboundShipmentLines?: Types.InputMaybe<Array<InsertInboundShipmentLineInput>>;
  insertInboundShipmentServiceLines?: Types.InputMaybe<Array<InsertInboundShipmentServiceLineInput>>;
  insertInboundShipments?: Types.InputMaybe<Array<InsertInboundShipmentInput>>;
  updateInboundShipmentLines?: Types.InputMaybe<Array<UpdateInboundShipmentLineInput>>;
  updateInboundShipmentServiceLines?: Types.InputMaybe<Array<UpdateInboundShipmentServiceLineInput>>;
  updateInboundShipments?: Types.InputMaybe<Array<UpdateInboundShipmentInput>>;
};

export type BatchOutboundShipmentInput = {
  allocatedOutboundShipmentUnallocatedLines?: Types.InputMaybe<Array<Scalars['String']['input']>>;
  continueOnError?: Types.InputMaybe<Scalars['Boolean']['input']>;
  deleteOutboundShipmentLines?: Types.InputMaybe<Array<DeleteOutboundShipmentLineInput>>;
  deleteOutboundShipmentServiceLines?: Types.InputMaybe<Array<DeleteOutboundShipmentServiceLineInput>>;
  deleteOutboundShipmentUnallocatedLines?: Types.InputMaybe<Array<DeleteOutboundShipmentUnallocatedLineInput>>;
  deleteOutboundShipments?: Types.InputMaybe<Array<Scalars['String']['input']>>;
  insertOutboundShipmentLines?: Types.InputMaybe<Array<InsertOutboundShipmentLineInput>>;
  insertOutboundShipmentServiceLines?: Types.InputMaybe<Array<InsertOutboundShipmentServiceLineInput>>;
  insertOutboundShipmentUnallocatedLines?: Types.InputMaybe<Array<InsertOutboundShipmentUnallocatedLineInput>>;
  insertOutboundShipments?: Types.InputMaybe<Array<InsertOutboundShipmentInput>>;
  updateOutboundShipmentLines?: Types.InputMaybe<Array<UpdateOutboundShipmentLineInput>>;
  updateOutboundShipmentServiceLines?: Types.InputMaybe<Array<UpdateOutboundShipmentServiceLineInput>>;
  updateOutboundShipmentUnallocatedLines?: Types.InputMaybe<Array<UpdateOutboundShipmentUnallocatedLineInput>>;
  updateOutboundShipments?: Types.InputMaybe<Array<UpdateOutboundShipmentInput>>;
};

export type BatchPrescriptionInput = {
  continueOnError?: Types.InputMaybe<Scalars['Boolean']['input']>;
  deletePrescriptionLines?: Types.InputMaybe<Array<DeletePrescriptionLineInput>>;
  deletePrescriptions?: Types.InputMaybe<Array<Scalars['String']['input']>>;
  insertPrescriptionLines?: Types.InputMaybe<Array<InsertPrescriptionLineInput>>;
  insertPrescriptions?: Types.InputMaybe<Array<InsertPrescriptionInput>>;
  setPrescribedQuantity?: Types.InputMaybe<Array<SetPrescribedQuantityInput>>;
  updatePrescriptionLines?: Types.InputMaybe<Array<UpdatePrescriptionLineInput>>;
  updatePrescriptions?: Types.InputMaybe<Array<UpdatePrescriptionInput>>;
};

export type BatchRequestRequisitionInput = {
  continueOnError?: Types.InputMaybe<Scalars['Boolean']['input']>;
  deleteRequestRequisitionLines?: Types.InputMaybe<Array<DeleteRequestRequisitionLineInput>>;
  deleteRequestRequisitions?: Types.InputMaybe<Array<DeleteRequestRequisitionInput>>;
  insertRequestRequisitionLines?: Types.InputMaybe<Array<InsertRequestRequisitionLineInput>>;
  insertRequestRequisitions?: Types.InputMaybe<Array<InsertRequestRequisitionInput>>;
  updateRequestRequisitionLines?: Types.InputMaybe<Array<UpdateRequestRequisitionLineInput>>;
  updateRequestRequisitions?: Types.InputMaybe<Array<UpdateRequestRequisitionInput>>;
};

export type BatchResponseRequisitionInput = {
  continueOnError?: Types.InputMaybe<Scalars['Boolean']['input']>;
  deleteResponseRequisitionLines?: Types.InputMaybe<Array<DeleteResponseRequisitionLineInput>>;
  deleteResponseRequisitions?: Types.InputMaybe<Array<DeleteResponseRequisitionInput>>;
};

export type BatchStocktakeInput = {
  continueOnError?: Types.InputMaybe<Scalars['Boolean']['input']>;
  deleteStocktakeLines?: Types.InputMaybe<Array<DeleteStocktakeLineInput>>;
  deleteStocktakes?: Types.InputMaybe<Array<DeleteStocktakeInput>>;
  insertStocktakeLines?: Types.InputMaybe<Array<InsertStocktakeLineInput>>;
  insertStocktakes?: Types.InputMaybe<Array<InsertStocktakeInput>>;
  updateStocktakeLines?: Types.InputMaybe<Array<UpdateStocktakeLineInput>>;
  updateStocktakes?: Types.InputMaybe<Array<UpdateStocktakeInput>>;
};

export type BoolStorePrefInput = {
  storeId: Scalars['String']['input'];
  value: Scalars['Boolean']['input'];
};

export type CampaignFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  name?: Types.InputMaybe<StringFilterInput>;
};

export enum CampaignSortFieldInput {
  Name = 'name',
}

export type CampaignSortInput = {
  /** Sort query result is sorted descending or ascending (if not provided the default is ascending) */
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: CampaignSortFieldInput;
};

export type CentralPatientSearchInput = {
  /** Patient code */
  code?: Types.InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  firstName?: Types.InputMaybe<Scalars['String']['input']>;
  lastName?: Types.InputMaybe<Scalars['String']['input']>;
};

export type ClinicianFilterInput = {
  address1?: Types.InputMaybe<StringFilterInput>;
  address2?: Types.InputMaybe<StringFilterInput>;
  code?: Types.InputMaybe<StringFilterInput>;
  email?: Types.InputMaybe<StringFilterInput>;
  firstName?: Types.InputMaybe<StringFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  initials?: Types.InputMaybe<StringFilterInput>;
  isActive?: Types.InputMaybe<Scalars['Boolean']['input']>;
  lastName?: Types.InputMaybe<StringFilterInput>;
  mobile?: Types.InputMaybe<StringFilterInput>;
  phone?: Types.InputMaybe<StringFilterInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ClinicianSortFieldInput;
};

export type ConfigureNamePropertyInput = {
  allowedValues?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  key: Scalars['String']['input'];
  name: Scalars['String']['input'];
  propertyId: Scalars['String']['input'];
  remoteEditable: Scalars['Boolean']['input'];
  valueType: PropertyNodeValueType;
};

export type ConsumptionOptionsInput = {
  /** Defaults to store preference amc_lookback_months */
  amcLookbackMonths?: Types.InputMaybe<Scalars['Float']['input']>;
  /** Defaults to 12 */
  numberOfDataPoints?: Types.InputMaybe<Scalars['Int']['input']>;
};

export enum ContactFormNodeType {
  Feedback = 'FEEDBACK',
  Support = 'SUPPORT',
}

export type ContactTraceFilterInput = {
  contactPatientId?: Types.InputMaybe<EqualFilterStringInput>;
  contactTraceId?: Types.InputMaybe<StringFilterInput>;
  dateOfBirth?: Types.InputMaybe<DateFilterInput>;
  datetime?: Types.InputMaybe<DatetimeFilterInput>;
  documentName?: Types.InputMaybe<StringFilterInput>;
  firstName?: Types.InputMaybe<StringFilterInput>;
  gender?: Types.InputMaybe<EqualFilterGenderType>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  lastName?: Types.InputMaybe<StringFilterInput>;
  patientId?: Types.InputMaybe<EqualFilterStringInput>;
  programId?: Types.InputMaybe<EqualFilterStringInput>;
  type?: Types.InputMaybe<StringFilterInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ContactTraceSortFieldInput;
};

export type CreateInventoryAdjustmentInput = {
  adjustment: Scalars['Float']['input'];
  adjustmentType: AdjustmentTypeInput;
  reasonOptionId?: Types.InputMaybe<Scalars['String']['input']>;
  stockLineId: Scalars['String']['input'];
};

export type CreateRequisitionShipmentInput = {
  responseRequisitionId: Scalars['String']['input'];
};

export type CurrencyFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  isActive?: Types.InputMaybe<Scalars['Boolean']['input']>;
  isHomeCurrency?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: CurrencySortFieldInput;
};

export type CustomerReturnInput = {
  customerId: Scalars['String']['input'];
  customerReturnLines: Array<CustomerReturnLineInput>;
  id: Scalars['String']['input'];
  outboundShipmentId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type CustomerReturnLineInput = {
  batch?: Types.InputMaybe<Scalars['String']['input']>;
  expiryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  itemVariantId?: Types.InputMaybe<Scalars['String']['input']>;
  note?: Types.InputMaybe<Scalars['String']['input']>;
  numberOfPacksReturned: Scalars['Float']['input'];
  packSize: Scalars['Float']['input'];
  reasonId?: Types.InputMaybe<Scalars['String']['input']>;
  volumePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: Types.InputMaybe<Scalars['String']['input']>;
};

export enum DatabaseType {
  Postgres = 'POSTGRES',
  SqLite = 'SQ_LITE',
}

export type DateFilterInput = {
  afterOrEqualTo?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  beforeOrEqualTo?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  equalTo?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
};

export type DatetimeFilterInput = {
  afterOrEqualTo?: Types.InputMaybe<Scalars['DateTime']['input']>;
  beforeOrEqualTo?: Types.InputMaybe<Scalars['DateTime']['input']>;
  equalTo?: Types.InputMaybe<Scalars['DateTime']['input']>;
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
  id?: Types.InputMaybe<EqualFilterStringInput>;
  name?: Types.InputMaybe<StringFilterInput>;
};

export type DemographicIndicatorFilterInput = {
  baseYear?: Types.InputMaybe<EqualFilterNumberInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  name?: Types.InputMaybe<StringFilterInput>;
};

export enum DemographicIndicatorSortFieldInput {
  Id = 'id',
  Name = 'name',
}

export type DemographicIndicatorSortInput = {
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  key: DemographicIndicatorSortFieldInput;
};

export type DemographicProjectionFilterInput = {
  baseYear?: Types.InputMaybe<EqualFilterNumberInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
};

export enum DemographicProjectionSortFieldInput {
  Id = 'id',
}

export type DemographicProjectionSortInput = {
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  key: DemographicProjectionSortFieldInput;
};

export enum DemographicSortFieldInput {
  Id = 'id',
  Name = 'name',
}

export type DemographicSortInput = {
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  key: DemographicSortFieldInput;
};

export type DisplaySettingsHash = {
  logo: Scalars['String']['input'];
  theme: Scalars['String']['input'];
};

export type DisplaySettingsInput = {
  customLogo?: Types.InputMaybe<Scalars['String']['input']>;
  customTheme?: Types.InputMaybe<Scalars['String']['input']>;
};

export type DocumentFilterInput = {
  contextId?: Types.InputMaybe<EqualFilterStringInput>;
  /**
   * This filter makes it possible to search the raw text json data.
   * Be beware of potential performance issues.
   */
  data?: Types.InputMaybe<StringFilterInput>;
  datetime?: Types.InputMaybe<DatetimeFilterInput>;
  name?: Types.InputMaybe<StringFilterInput>;
  owner?: Types.InputMaybe<EqualFilterStringInput>;
  type?: Types.InputMaybe<EqualFilterStringInput>;
};

export enum DocumentRegistryCategoryNode {
  ContactTrace = 'CONTACT_TRACE',
  Custom = 'CUSTOM',
  Encounter = 'ENCOUNTER',
  Patient = 'PATIENT',
  ProgramEnrolment = 'PROGRAM_ENROLMENT',
}

export type DocumentRegistryFilterInput = {
  category?: Types.InputMaybe<EqualFilterDocumentRegistryCategoryInput>;
  contextId?: Types.InputMaybe<EqualFilterStringInput>;
  documentType?: Types.InputMaybe<EqualFilterStringInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: DocumentSortFieldInput;
};

export type EncounterEventFilterInput = {
  activeEndDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  activeStartDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  data?: Types.InputMaybe<StringFilterInput>;
  datetime?: Types.InputMaybe<DatetimeFilterInput>;
  /**
   * Only include events that are for the current encounter, i.e. have matching encounter type
   * and matching encounter name of the current encounter. If not set all events with matching
   * encounter type are returned.
   */
  isCurrentEncounter?: Types.InputMaybe<Scalars['Boolean']['input']>;
  type?: Types.InputMaybe<EqualFilterStringInput>;
};

export type EncounterFieldsInput = {
  fields: Array<Scalars['String']['input']>;
};

export type EncounterFilterInput = {
  clinicianId?: Types.InputMaybe<EqualFilterStringInput>;
  createdDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  documentData?: Types.InputMaybe<StringFilterInput>;
  documentName?: Types.InputMaybe<EqualFilterStringInput>;
  endDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  /** Only if this filter is set encounters with status DELETED are returned */
  includeDeleted?: Types.InputMaybe<Scalars['Boolean']['input']>;
  patient?: Types.InputMaybe<PatientFilterInput>;
  patientId?: Types.InputMaybe<EqualFilterStringInput>;
  programEnrolment?: Types.InputMaybe<ProgramEnrolmentFilterInput>;
  programId?: Types.InputMaybe<EqualFilterStringInput>;
  startDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  status?: Types.InputMaybe<EqualFilterEncounterStatusInput>;
  type?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: EncounterSortFieldInput;
};

export type EqualFilterActivityLogTypeInput = {
  equalAny?: Types.InputMaybe<Array<ActivityLogNodeType>>;
  equalTo?: Types.InputMaybe<ActivityLogNodeType>;
  notEqualAll?: Types.InputMaybe<Array<ActivityLogNodeType>>;
  notEqualTo?: Types.InputMaybe<ActivityLogNodeType>;
};

export type EqualFilterBigFloatingNumberInput = {
  equalAny?: Types.InputMaybe<Array<Scalars['Float']['input']>>;
  equalAnyOrNull?: Types.InputMaybe<Array<Scalars['Float']['input']>>;
  equalTo?: Types.InputMaybe<Scalars['Float']['input']>;
  notEqualAll?: Types.InputMaybe<Array<Scalars['Float']['input']>>;
  notEqualTo?: Types.InputMaybe<Scalars['Float']['input']>;
};

export type EqualFilterBigNumberInput = {
  equalAny?: Types.InputMaybe<Array<Scalars['Int']['input']>>;
  equalAnyOrNull?: Types.InputMaybe<Array<Scalars['Int']['input']>>;
  equalTo?: Types.InputMaybe<Scalars['Int']['input']>;
  notEqualAll?: Types.InputMaybe<Array<Scalars['Int']['input']>>;
  notEqualTo?: Types.InputMaybe<Scalars['Int']['input']>;
};

export type EqualFilterDocumentRegistryCategoryInput = {
  equalAny?: Types.InputMaybe<Array<DocumentRegistryCategoryNode>>;
  equalTo?: Types.InputMaybe<DocumentRegistryCategoryNode>;
  notEqualAll?: Types.InputMaybe<Array<DocumentRegistryCategoryNode>>;
  notEqualTo?: Types.InputMaybe<DocumentRegistryCategoryNode>;
};

export type EqualFilterEncounterStatusInput = {
  equalAny?: Types.InputMaybe<Array<EncounterNodeStatus>>;
  equalTo?: Types.InputMaybe<EncounterNodeStatus>;
  notEqualAll?: Types.InputMaybe<Array<EncounterNodeStatus>>;
  notEqualTo?: Types.InputMaybe<EncounterNodeStatus>;
};

export type EqualFilterGenderType = {
  equalAny?: Types.InputMaybe<Array<GenderTypeNode>>;
  equalTo?: Types.InputMaybe<GenderTypeNode>;
  notEqualAll?: Types.InputMaybe<Array<GenderTypeNode>>;
  notEqualTo?: Types.InputMaybe<GenderTypeNode>;
};

export type EqualFilterGoodsReceivedStatusInput = {
  equalAny?: Types.InputMaybe<Array<GoodsReceivedNodeStatus>>;
  equalTo?: Types.InputMaybe<GoodsReceivedNodeStatus>;
  notEqualAll?: Types.InputMaybe<Array<GoodsReceivedNodeStatus>>;
  notEqualTo?: Types.InputMaybe<GoodsReceivedNodeStatus>;
};

export type EqualFilterInventoryAdjustmentReasonTypeInput = {
  equalAny?: Types.InputMaybe<Array<InventoryAdjustmentReasonNodeType>>;
  equalTo?: Types.InputMaybe<InventoryAdjustmentReasonNodeType>;
  notEqualAll?: Types.InputMaybe<Array<InventoryAdjustmentReasonNodeType>>;
  notEqualTo?: Types.InputMaybe<InventoryAdjustmentReasonNodeType>;
};

export type EqualFilterInvoiceLineTypeInput = {
  equalAny?: Types.InputMaybe<Array<InvoiceLineNodeType>>;
  equalTo?: Types.InputMaybe<InvoiceLineNodeType>;
  notEqualAll?: Types.InputMaybe<Array<InvoiceLineNodeType>>;
  notEqualTo?: Types.InputMaybe<InvoiceLineNodeType>;
};

export type EqualFilterInvoiceStatusInput = {
  equalAny?: Types.InputMaybe<Array<InvoiceNodeStatus>>;
  equalTo?: Types.InputMaybe<InvoiceNodeStatus>;
  notEqualAll?: Types.InputMaybe<Array<InvoiceNodeStatus>>;
  notEqualTo?: Types.InputMaybe<InvoiceNodeStatus>;
};

export type EqualFilterInvoiceTypeInput = {
  equalAny?: Types.InputMaybe<Array<InvoiceNodeType>>;
  equalTo?: Types.InputMaybe<InvoiceNodeType>;
  notEqualAll?: Types.InputMaybe<Array<InvoiceNodeType>>;
  notEqualTo?: Types.InputMaybe<InvoiceNodeType>;
};

export type EqualFilterItemTypeInput = {
  equalAny?: Types.InputMaybe<Array<ItemNodeType>>;
  equalTo?: Types.InputMaybe<ItemNodeType>;
  notEqualAll?: Types.InputMaybe<Array<ItemNodeType>>;
  notEqualTo?: Types.InputMaybe<ItemNodeType>;
};

export type EqualFilterNumberInput = {
  equalAny?: Types.InputMaybe<Array<Scalars['Int']['input']>>;
  equalAnyOrNull?: Types.InputMaybe<Array<Scalars['Int']['input']>>;
  equalTo?: Types.InputMaybe<Scalars['Int']['input']>;
  notEqualAll?: Types.InputMaybe<Array<Scalars['Int']['input']>>;
  notEqualTo?: Types.InputMaybe<Scalars['Int']['input']>;
};

export type EqualFilterPurchaseOrderLineStatusInput = {
  equalAny?: Types.InputMaybe<Array<PurchaseOrderLineStatusNode>>;
  equalTo?: Types.InputMaybe<PurchaseOrderLineStatusNode>;
  notEqualAll?: Types.InputMaybe<Array<PurchaseOrderLineStatusNode>>;
  notEqualTo?: Types.InputMaybe<PurchaseOrderLineStatusNode>;
};

export type EqualFilterPurchaseOrderStatusInput = {
  equalAny?: Types.InputMaybe<Array<PurchaseOrderNodeStatus>>;
  equalTo?: Types.InputMaybe<PurchaseOrderNodeStatus>;
  notEqualAll?: Types.InputMaybe<Array<PurchaseOrderNodeStatus>>;
  notEqualTo?: Types.InputMaybe<PurchaseOrderNodeStatus>;
};

export type EqualFilterReasonOptionTypeInput = {
  equalAny?: Types.InputMaybe<Array<ReasonOptionNodeType>>;
  equalTo?: Types.InputMaybe<ReasonOptionNodeType>;
  notEqualAll?: Types.InputMaybe<Array<ReasonOptionNodeType>>;
  notEqualTo?: Types.InputMaybe<ReasonOptionNodeType>;
};

export type EqualFilterReportContextInput = {
  equalAny?: Types.InputMaybe<Array<ReportContext>>;
  equalTo?: Types.InputMaybe<ReportContext>;
  notEqualAll?: Types.InputMaybe<Array<ReportContext>>;
  notEqualTo?: Types.InputMaybe<ReportContext>;
};

export type EqualFilterRequisitionStatusInput = {
  equalAny?: Types.InputMaybe<Array<RequisitionNodeStatus>>;
  equalTo?: Types.InputMaybe<RequisitionNodeStatus>;
  notEqualAll?: Types.InputMaybe<Array<RequisitionNodeStatus>>;
  notEqualTo?: Types.InputMaybe<RequisitionNodeStatus>;
};

export type EqualFilterRequisitionTypeInput = {
  equalAny?: Types.InputMaybe<Array<RequisitionNodeType>>;
  equalTo?: Types.InputMaybe<RequisitionNodeType>;
  notEqualAll?: Types.InputMaybe<Array<RequisitionNodeType>>;
  notEqualTo?: Types.InputMaybe<RequisitionNodeType>;
};

export type EqualFilterStatusInput = {
  equalAny?: Types.InputMaybe<Array<AssetLogStatusNodeType>>;
  equalTo?: Types.InputMaybe<AssetLogStatusNodeType>;
  notEqualAll?: Types.InputMaybe<Array<AssetLogStatusNodeType>>;
  notEqualTo?: Types.InputMaybe<AssetLogStatusNodeType>;
};

export type EqualFilterStocktakeStatusInput = {
  equalAny?: Types.InputMaybe<Array<StocktakeNodeStatus>>;
  equalTo?: Types.InputMaybe<StocktakeNodeStatus>;
  notEqualAll?: Types.InputMaybe<Array<StocktakeNodeStatus>>;
  notEqualTo?: Types.InputMaybe<StocktakeNodeStatus>;
};

export type EqualFilterStringInput = {
  equalAny?: Types.InputMaybe<Array<Scalars['String']['input']>>;
  equalAnyOrNull?: Types.InputMaybe<Array<Scalars['String']['input']>>;
  equalTo?: Types.InputMaybe<Scalars['String']['input']>;
  notEqualAll?: Types.InputMaybe<Array<Scalars['String']['input']>>;
  notEqualTo?: Types.InputMaybe<Scalars['String']['input']>;
};

export type EqualFilterTemperatureBreachRowTypeInput = {
  equalAny?: Types.InputMaybe<Array<TemperatureBreachNodeType>>;
  equalTo?: Types.InputMaybe<TemperatureBreachNodeType>;
  notEqualAll?: Types.InputMaybe<Array<TemperatureBreachNodeType>>;
  notEqualTo?: Types.InputMaybe<TemperatureBreachNodeType>;
};

export type EqualFilterTypeInput = {
  equalAny?: Types.InputMaybe<Array<NameNodeType>>;
  equalTo?: Types.InputMaybe<NameNodeType>;
  notEqualAll?: Types.InputMaybe<Array<NameNodeType>>;
  notEqualTo?: Types.InputMaybe<NameNodeType>;
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
  id?: Types.InputMaybe<EqualFilterStringInput>;
  type?: Types.InputMaybe<EqualFilterStringInput>;
};

export enum FormSchemaSortFieldInput {
  Id = 'id',
}

export type FormSchemaSortInput = {
  /**
   * Sort query result is sorted descending or ascending (if not provided the default is
   * ascending)
   */
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  existingLinesInput?: Types.InputMaybe<ExistingLinesInput>;
  /** The ids of the outbound shipment lines to generate new return lines for */
  outboundShipmentLineIds: Array<Scalars['String']['input']>;
};

/** At least one input is required. */
export type GenerateSupplierReturnLinesInput = {
  /** Generate new return lines for all the available stock lines of a specific item */
  itemId?: Types.InputMaybe<Scalars['String']['input']>;
  /** Include existing return lines in the response. Only has an effect when either `stock_line_ids` or `item_id` is set. */
  returnId?: Types.InputMaybe<Scalars['String']['input']>;
  /** The stock line ids to generate new return lines for */
  stockLineIds: Array<Scalars['String']['input']>;
};

export type GoodsReceivedFilterInput = {
  createdDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  purchaseOrderId?: Types.InputMaybe<EqualFilterStringInput>;
  status?: Types.InputMaybe<EqualFilterGoodsReceivedStatusInput>;
};

export type GoodsReceivedLineFilterInput = {
  goodsReceivedId?: Types.InputMaybe<EqualFilterStringInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  manufacturer?: Types.InputMaybe<Scalars['String']['input']>;
  model: Scalars['String']['input'];
  properties?: Types.InputMaybe<Scalars['String']['input']>;
  subCatalogue: Scalars['String']['input'];
  typeId: Scalars['String']['input'];
};

export type InsertAssetInput = {
  assetNumber?: Types.InputMaybe<Scalars['String']['input']>;
  catalogueItemId?: Types.InputMaybe<Scalars['String']['input']>;
  categoryId?: Types.InputMaybe<Scalars['String']['input']>;
  classId?: Types.InputMaybe<Scalars['String']['input']>;
  donorNameId?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  installationDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  lockedFieldsJson?: Types.InputMaybe<Scalars['String']['input']>;
  needsReplacement?: Types.InputMaybe<Scalars['Boolean']['input']>;
  notes?: Types.InputMaybe<Scalars['String']['input']>;
  properties?: Types.InputMaybe<Scalars['String']['input']>;
  replacementDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  serialNumber?: Types.InputMaybe<Scalars['String']['input']>;
  storeId?: Types.InputMaybe<Scalars['String']['input']>;
  typeId?: Types.InputMaybe<Scalars['String']['input']>;
  warrantyEnd?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  warrantyStart?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
};

export type InsertAssetLogInput = {
  assetId: Scalars['String']['input'];
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  reasonId?: Types.InputMaybe<Scalars['String']['input']>;
  status?: Types.InputMaybe<AssetLogStatusNodeType>;
  type?: Types.InputMaybe<Scalars['String']['input']>;
};

export type InsertAssetLogReasonInput = {
  assetLogStatus: AssetLogStatusNodeType;
  id: Scalars['String']['input'];
  reason: Scalars['String']['input'];
};

export type InsertBarcodeInput = {
  gtin: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  packSize?: Types.InputMaybe<Scalars['Float']['input']>;
};

export type InsertClinicianInput = {
  code: Scalars['String']['input'];
  firstName?: Types.InputMaybe<Scalars['String']['input']>;
  gender?: Types.InputMaybe<GenderTypeNode>;
  id: Scalars['String']['input'];
  initials: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  mobile?: Types.InputMaybe<Scalars['String']['input']>;
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
  basePopulation?: Types.InputMaybe<Scalars['Int']['input']>;
  baseYear: Scalars['Int']['input'];
  id: Scalars['String']['input'];
  name?: Types.InputMaybe<Scalars['String']['input']>;
  populationPercentage?: Types.InputMaybe<Scalars['Float']['input']>;
  year1Projection?: Types.InputMaybe<Scalars['Int']['input']>;
  year2Projection?: Types.InputMaybe<Scalars['Int']['input']>;
  year3Projection?: Types.InputMaybe<Scalars['Int']['input']>;
  year4Projection?: Types.InputMaybe<Scalars['Int']['input']>;
  year5Projection?: Types.InputMaybe<Scalars['Int']['input']>;
};

export type InsertDemographicProjectionInput = {
  baseYear: Scalars['Int']['input'];
  id: Scalars['String']['input'];
  year1?: Types.InputMaybe<Scalars['Float']['input']>;
  year2?: Types.InputMaybe<Scalars['Float']['input']>;
  year3?: Types.InputMaybe<Scalars['Float']['input']>;
  year4?: Types.InputMaybe<Scalars['Float']['input']>;
  year5?: Types.InputMaybe<Scalars['Float']['input']>;
};

export type InsertDocumentRegistryInput = {
  category: DocumentRegistryCategoryNode;
  contextId: Scalars['String']['input'];
  documentType: Scalars['String']['input'];
  formSchemaId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  name?: Types.InputMaybe<Scalars['String']['input']>;
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
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  otherPartyId: Scalars['String']['input'];
  responseRequisitionId: Scalars['String']['input'];
};

export type InsertGoodsReceivedInput = {
  id: Scalars['String']['input'];
  purchaseOrderId: Scalars['String']['input'];
};

export type InsertGoodsReceivedLineInput = {
  batch?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  expiryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  goodsReceivedId: Scalars['String']['input'];
  id: Scalars['String']['input'];
  manufacturerId?: Types.InputMaybe<Scalars['String']['input']>;
  numberOfPacksReceived?: Types.InputMaybe<Scalars['Float']['input']>;
  purchaseOrderLineId: Scalars['String']['input'];
  receivedPackSize?: Types.InputMaybe<Scalars['Float']['input']>;
};

export type InsertGoodsReceivedLinesFromPurchaseOrderInput = {
  goodsReceivedId: Scalars['String']['input'];
  purchaseOrderId: Scalars['String']['input'];
};

export type InsertInboundShipmentInput = {
  colour?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  onHold?: Types.InputMaybe<Scalars['Boolean']['input']>;
  otherPartyId: Scalars['String']['input'];
  requisitionId?: Types.InputMaybe<Scalars['String']['input']>;
  theirReference?: Types.InputMaybe<Scalars['String']['input']>;
};

export type InsertInboundShipmentLineFromInternalOrderLineInput = {
  invoiceId: Scalars['String']['input'];
  requisitionLineId: Scalars['String']['input'];
};

export type InsertInboundShipmentLineInput = {
  batch?: Types.InputMaybe<Scalars['String']['input']>;
  campaignId?: Types.InputMaybe<Scalars['String']['input']>;
  costPricePerPack: Scalars['Float']['input'];
  donorId?: Types.InputMaybe<Scalars['String']['input']>;
  expiryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  itemVariantId?: Types.InputMaybe<Scalars['String']['input']>;
  location?: Types.InputMaybe<NullableStringUpdate>;
  note?: Types.InputMaybe<Scalars['String']['input']>;
  numberOfPacks: Scalars['Float']['input'];
  packSize: Scalars['Float']['input'];
  programId?: Types.InputMaybe<Scalars['String']['input']>;
  sellPricePerPack: Scalars['Float']['input'];
  shippedNumberOfPacks?: Types.InputMaybe<Scalars['Float']['input']>;
  shippedPackSize?: Types.InputMaybe<Scalars['Float']['input']>;
  taxPercentage?: Types.InputMaybe<Scalars['Float']['input']>;
  totalBeforeTax?: Types.InputMaybe<Scalars['Float']['input']>;
  volumePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type InsertInboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  itemId?: Types.InputMaybe<Scalars['String']['input']>;
  name?: Types.InputMaybe<Scalars['String']['input']>;
  note?: Types.InputMaybe<Scalars['String']['input']>;
  taxPercentage?: Types.InputMaybe<Scalars['Float']['input']>;
  totalBeforeTax: Scalars['Float']['input'];
};

export type InsertInsuranceInput = {
  discountPercentage: Scalars['Float']['input'];
  expiryDate: Scalars['NaiveDate']['input'];
  id: Scalars['String']['input'];
  insuranceProviderId: Scalars['String']['input'];
  isActive: Scalars['Boolean']['input'];
  nameId: Scalars['String']['input'];
  nameOfInsured?: Types.InputMaybe<Scalars['String']['input']>;
  policyNumberFamily: Scalars['String']['input'];
  policyNumberPerson: Scalars['String']['input'];
  policyType: InsurancePolicyNodeType;
};

export type InsertLocationInput = {
  code: Scalars['String']['input'];
  id: Scalars['String']['input'];
  locationTypeId?: Types.InputMaybe<Scalars['String']['input']>;
  name?: Types.InputMaybe<Scalars['String']['input']>;
  onHold?: Types.InputMaybe<Scalars['Boolean']['input']>;
  volume?: Types.InputMaybe<Scalars['Float']['input']>;
};

export type InsertOutboundShipmentInput = {
  colour?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  /** The new invoice id provided by the client */
  id: Scalars['String']['input'];
  onHold?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** The other party must be a customer of the current store */
  otherPartyId: Scalars['String']['input'];
  theirReference?: Types.InputMaybe<Scalars['String']['input']>;
};

export type InsertOutboundShipmentLineInput = {
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  numberOfPacks: Scalars['Float']['input'];
  stockLineId: Scalars['String']['input'];
  taxPercentage?: Types.InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type InsertOutboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  itemId?: Types.InputMaybe<Scalars['String']['input']>;
  name?: Types.InputMaybe<Scalars['String']['input']>;
  note?: Types.InputMaybe<Scalars['String']['input']>;
  taxPercentage?: Types.InputMaybe<Scalars['Float']['input']>;
  totalBeforeTax: Scalars['Float']['input'];
};

export type InsertOutboundShipmentUnallocatedLineInput = {
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  quantity: Scalars['Int']['input'];
};

export type InsertPatientInput = {
  address1?: Types.InputMaybe<Scalars['String']['input']>;
  code: Scalars['String']['input'];
  code2?: Types.InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  dateOfDeath?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  firstName?: Types.InputMaybe<Scalars['String']['input']>;
  gender?: Types.InputMaybe<GenderTypeNode>;
  id: Scalars['String']['input'];
  isDeceased?: Types.InputMaybe<Scalars['Boolean']['input']>;
  lastName?: Types.InputMaybe<Scalars['String']['input']>;
  nextOfKinId?: Types.InputMaybe<Scalars['String']['input']>;
  nextOfKinName?: Types.InputMaybe<Scalars['String']['input']>;
  phone?: Types.InputMaybe<Scalars['String']['input']>;
};

export type InsertPluginDataInput = {
  data: Scalars['String']['input'];
  dataIdentifier: Scalars['String']['input'];
  id: Scalars['String']['input'];
  pluginCode: Scalars['String']['input'];
  relatedRecordId?: Types.InputMaybe<Scalars['String']['input']>;
  storeId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type InsertPrescriptionInput = {
  clinicianId?: Types.InputMaybe<Scalars['String']['input']>;
  diagnosisId?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  patientId: Scalars['String']['input'];
  prescriptionDate?: Types.InputMaybe<Scalars['DateTime']['input']>;
  programId?: Types.InputMaybe<Scalars['String']['input']>;
  theirReference?: Types.InputMaybe<Scalars['String']['input']>;
};

export type InsertPrescriptionLineInput = {
  id: Scalars['String']['input'];
  invoiceId: Scalars['String']['input'];
  note?: Types.InputMaybe<Scalars['String']['input']>;
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
  colour?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  /** Defaults to 2 weeks from now */
  expectedDeliveryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  otherPartyId: Scalars['String']['input'];
  periodId: Scalars['String']['input'];
  programOrderTypeId: Scalars['String']['input'];
  theirReference?: Types.InputMaybe<Scalars['String']['input']>;
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
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  expectedDeliveryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  itemIdOrCode: Scalars['String']['input'];
  manufacturerId?: Types.InputMaybe<Scalars['String']['input']>;
  note?: Types.InputMaybe<Scalars['String']['input']>;
  pricePerPackAfterDiscount?: Types.InputMaybe<Scalars['Float']['input']>;
  pricePerPackBeforeDiscount?: Types.InputMaybe<Scalars['Float']['input']>;
  purchaseOrderId: Scalars['String']['input'];
  requestedDeliveryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  requestedNumberOfUnits?: Types.InputMaybe<Scalars['Float']['input']>;
  requestedPackSize?: Types.InputMaybe<Scalars['Float']['input']>;
  supplierItemCode?: Types.InputMaybe<Scalars['String']['input']>;
  unit?: Types.InputMaybe<Scalars['String']['input']>;
};

export type InsertRepackInput = {
  newLocationId?: Types.InputMaybe<Scalars['String']['input']>;
  newPackSize: Scalars['Float']['input'];
  numberOfPacks: Scalars['Float']['input'];
  stockLineId: Scalars['String']['input'];
};

export type InsertRequestRequisitionInput = {
  colour?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  /** Defaults to 2 weeks from now */
  expectedDeliveryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  maxMonthsOfStock: Scalars['Float']['input'];
  minMonthsOfStock: Scalars['Float']['input'];
  otherPartyId: Scalars['String']['input'];
  theirReference?: Types.InputMaybe<Scalars['String']['input']>;
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
  barcode?: Types.InputMaybe<Scalars['String']['input']>;
  batch?: Types.InputMaybe<Scalars['String']['input']>;
  campaignId?: Types.InputMaybe<Scalars['String']['input']>;
  costPricePerPack: Scalars['Float']['input'];
  donorId?: Types.InputMaybe<Scalars['String']['input']>;
  expiryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  itemVariantId?: Types.InputMaybe<Scalars['String']['input']>;
  location?: Types.InputMaybe<NullableStringUpdate>;
  numberOfPacks: Scalars['Float']['input'];
  onHold: Scalars['Boolean']['input'];
  packSize: Scalars['Float']['input'];
  programId?: Types.InputMaybe<Scalars['String']['input']>;
  reasonOptionId?: Types.InputMaybe<Scalars['String']['input']>;
  sellPricePerPack: Scalars['Float']['input'];
  volumePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type InsertStocktakeInput = {
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  createBlankStocktake?: Types.InputMaybe<Scalars['Boolean']['input']>;
  description?: Types.InputMaybe<Scalars['String']['input']>;
  expiresBefore?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  includeAllMasterListItems?: Types.InputMaybe<Scalars['Boolean']['input']>;
  isAllItemsStocktake?: Types.InputMaybe<Scalars['Boolean']['input']>;
  isInitialStocktake?: Types.InputMaybe<Scalars['Boolean']['input']>;
  locationId?: Types.InputMaybe<Scalars['String']['input']>;
  masterListId?: Types.InputMaybe<Scalars['String']['input']>;
  vvmStatusId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type InsertStocktakeLineInput = {
  batch?: Types.InputMaybe<Scalars['String']['input']>;
  campaignId?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  costPricePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  countedNumberOfPacks?: Types.InputMaybe<Scalars['Float']['input']>;
  donorId?: Types.InputMaybe<Scalars['String']['input']>;
  expiryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  itemId?: Types.InputMaybe<Scalars['String']['input']>;
  itemVariantId?: Types.InputMaybe<Scalars['String']['input']>;
  location?: Types.InputMaybe<NullableStringUpdate>;
  note?: Types.InputMaybe<Scalars['String']['input']>;
  packSize?: Types.InputMaybe<Scalars['Float']['input']>;
  programId?: Types.InputMaybe<Scalars['String']['input']>;
  reasonOptionId?: Types.InputMaybe<Scalars['String']['input']>;
  sellPricePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  stockLineId?: Types.InputMaybe<Scalars['String']['input']>;
  stocktakeId: Scalars['String']['input'];
  volumePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type InsertVvmStatusLogInput = {
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  statusId: Scalars['String']['input'];
  stockLineId: Scalars['String']['input'];
};

export type InsertVaccinationInput = {
  clinicianId?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  encounterId: Scalars['String']['input'];
  facilityFreeText?: Types.InputMaybe<Scalars['String']['input']>;
  facilityNameId?: Types.InputMaybe<Scalars['String']['input']>;
  given: Scalars['Boolean']['input'];
  id: Scalars['String']['input'];
  itemId?: Types.InputMaybe<Scalars['String']['input']>;
  notGivenReason?: Types.InputMaybe<Scalars['String']['input']>;
  stockLineId?: Types.InputMaybe<Scalars['String']['input']>;
  vaccinationDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  vaccineCourseDoseId: Scalars['String']['input'];
};

export type InsertVaccineCourseInput = {
  canSkipDose: Scalars['Boolean']['input'];
  coverageRate: Scalars['Float']['input'];
  demographicId?: Types.InputMaybe<Scalars['String']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: InsuranceSortFieldInput;
};

export type IntegerStorePrefInput = {
  storeId: Scalars['String']['input'];
  value: Scalars['Int']['input'];
};

export type InventoryAdjustmentReasonFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  isActive?: Types.InputMaybe<Scalars['Boolean']['input']>;
  type?: Types.InputMaybe<EqualFilterInventoryAdjustmentReasonTypeInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: InventoryAdjustmentReasonSortFieldInput;
};

export type InvoiceFilterInput = {
  allocatedDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  colour?: Types.InputMaybe<EqualFilterStringInput>;
  comment?: Types.InputMaybe<StringFilterInput>;
  createdDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  createdOrBackdatedDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  deliveredDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  invoiceNumber?: Types.InputMaybe<EqualFilterBigNumberInput>;
  isProgramInvoice?: Types.InputMaybe<Scalars['Boolean']['input']>;
  linkedInvoiceId?: Types.InputMaybe<EqualFilterStringInput>;
  nameId?: Types.InputMaybe<EqualFilterStringInput>;
  onHold?: Types.InputMaybe<Scalars['Boolean']['input']>;
  otherPartyId?: Types.InputMaybe<EqualFilterStringInput>;
  otherPartyName?: Types.InputMaybe<StringFilterInput>;
  pickedDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  programId?: Types.InputMaybe<EqualFilterStringInput>;
  receivedDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  requisitionId?: Types.InputMaybe<EqualFilterStringInput>;
  shippedDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  status?: Types.InputMaybe<EqualFilterInvoiceStatusInput>;
  storeId?: Types.InputMaybe<EqualFilterStringInput>;
  theirReference?: Types.InputMaybe<StringFilterInput>;
  transportReference?: Types.InputMaybe<EqualFilterStringInput>;
  type?: Types.InputMaybe<EqualFilterInvoiceTypeInput>;
  userId?: Types.InputMaybe<EqualFilterStringInput>;
  verifiedDatetime?: Types.InputMaybe<DatetimeFilterInput>;
};

export type InvoiceLineFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  invoiceId?: Types.InputMaybe<EqualFilterStringInput>;
  invoiceStatus?: Types.InputMaybe<EqualFilterInvoiceStatusInput>;
  invoiceType?: Types.InputMaybe<EqualFilterInvoiceTypeInput>;
  isProgramInvoice?: Types.InputMaybe<Scalars['Boolean']['input']>;
  itemId?: Types.InputMaybe<EqualFilterStringInput>;
  locationId?: Types.InputMaybe<EqualFilterStringInput>;
  numberOfPacks?: Types.InputMaybe<EqualFilterBigFloatingNumberInput>;
  programId?: Types.InputMaybe<EqualFilterStringInput>;
  reasonOption?: Types.InputMaybe<EqualFilterStringInput>;
  requisitionId?: Types.InputMaybe<EqualFilterStringInput>;
  stockLineId?: Types.InputMaybe<EqualFilterStringInput>;
  storeId?: Types.InputMaybe<EqualFilterStringInput>;
  type?: Types.InputMaybe<EqualFilterInvoiceLineTypeInput>;
  verifiedDatetime?: Types.InputMaybe<DatetimeFilterInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: InvoiceSortFieldInput;
};

export type InvoiceStatusOptionsInput = {
  storeId: Scalars['String']['input'];
  value: Array<InvoiceNodeStatus>;
};

export type ItemFilterInput = {
  categoryId?: Types.InputMaybe<Scalars['String']['input']>;
  categoryName?: Types.InputMaybe<Scalars['String']['input']>;
  code?: Types.InputMaybe<StringFilterInput>;
  codeOrName?: Types.InputMaybe<StringFilterInput>;
  /** Items with available stock on hand, regardless of item visibility. This filter is ignored if `is_visible_or_on_hand` is true */
  hasStockOnHand?: Types.InputMaybe<Scalars['Boolean']['input']>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  ignoreForOrders?: Types.InputMaybe<Scalars['Boolean']['input']>;
  isActive?: Types.InputMaybe<Scalars['Boolean']['input']>;
  isProgramItem?: Types.InputMaybe<Scalars['Boolean']['input']>;
  isVaccine?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Items that are part of a masterlist which is visible in this store. This filter is ignored if `is_visible_or_on_hand` is true */
  isVisible?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Items that are part of a masterlist which is visible in this store OR there is available stock of that item in this store */
  isVisibleOrOnHand?: Types.InputMaybe<Scalars['Boolean']['input']>;
  masterListId?: Types.InputMaybe<EqualFilterStringInput>;
  maxMonthsOfStock?: Types.InputMaybe<Scalars['Float']['input']>;
  minMonthsOfStock?: Types.InputMaybe<Scalars['Float']['input']>;
  name?: Types.InputMaybe<StringFilterInput>;
  productsAtRiskOfBeingOutOfStock?: Types.InputMaybe<Scalars['Boolean']['input']>;
  type?: Types.InputMaybe<EqualFilterItemTypeInput>;
  withRecentConsumption?: Types.InputMaybe<Scalars['Boolean']['input']>;
};

export type ItemLedgerFilterInput = {
  datetime?: Types.InputMaybe<DatetimeFilterInput>;
  invoiceStatus?: Types.InputMaybe<EqualFilterInvoiceStatusInput>;
  invoiceType?: Types.InputMaybe<EqualFilterInvoiceTypeInput>;
  itemId?: Types.InputMaybe<EqualFilterStringInput>;
};

export enum ItemNodeType {
  NonStock = 'NON_STOCK',
  Service = 'SERVICE',
  Stock = 'STOCK',
}

export type ItemPriceInput = {
  itemId: Scalars['String']['input'];
  nameId?: Types.InputMaybe<Scalars['String']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  datetime?: Types.InputMaybe<DatetimeFilterInput>;
  itemId?: Types.InputMaybe<EqualFilterStringInput>;
  masterListId?: Types.InputMaybe<EqualFilterStringInput>;
  stockLineId?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: LedgerSortFieldInput;
};

export type LocationFilterInput = {
  assignedToAsset?: Types.InputMaybe<Scalars['Boolean']['input']>;
  code?: Types.InputMaybe<StringFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  locationTypeId?: Types.InputMaybe<EqualFilterStringInput>;
  name?: Types.InputMaybe<StringFilterInput>;
  onHold?: Types.InputMaybe<Scalars['Boolean']['input']>;
  storeId?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: LocationSortFieldInput;
};

export type LocationTypeFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  name?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  code?: Types.InputMaybe<StringFilterInput>;
  description?: Types.InputMaybe<StringFilterInput>;
  existsForName?: Types.InputMaybe<StringFilterInput>;
  existsForNameId?: Types.InputMaybe<EqualFilterStringInput>;
  existsForStoreId?: Types.InputMaybe<EqualFilterStringInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  isProgram?: Types.InputMaybe<Scalars['Boolean']['input']>;
  itemId?: Types.InputMaybe<EqualFilterStringInput>;
  name?: Types.InputMaybe<StringFilterInput>;
};

export type MasterListLineFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  ignoreForOrders?: Types.InputMaybe<Scalars['Boolean']['input']>;
  itemId?: Types.InputMaybe<EqualFilterStringInput>;
  masterList?: Types.InputMaybe<MasterListFilterInput>;
  masterListId?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: MasterListSortFieldInput;
};

export type NameFilterInput = {
  address1?: Types.InputMaybe<StringFilterInput>;
  address2?: Types.InputMaybe<StringFilterInput>;
  /** Filter by code */
  code?: Types.InputMaybe<StringFilterInput>;
  /** Search filter across name or code */
  codeOrName?: Types.InputMaybe<StringFilterInput>;
  country?: Types.InputMaybe<StringFilterInput>;
  email?: Types.InputMaybe<StringFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  /** Filter by customer property */
  isCustomer?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by donor property */
  isDonor?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by manufacturer property */
  isManufacturer?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Is this name a store */
  isStore?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by supplier property */
  isSupplier?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /**
   * Show system names (defaults to false)
   * System names don't have name_store_join thus if queried with true filter, is_visible filter should also be true or null
   * if is_visible is set to true and is_system_name is also true no system names will be returned
   */
  isSystemName?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Visibility in current store (based on store_id parameter and existence of name_store_join record) */
  isVisible?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by name */
  name?: Types.InputMaybe<StringFilterInput>;
  phone?: Types.InputMaybe<StringFilterInput>;
  /** Code of the store if store is linked to name */
  storeCode?: Types.InputMaybe<StringFilterInput>;
  supplyingStoreId?: Types.InputMaybe<EqualFilterStringInput>;
  /** Filter by the name type */
  type?: Types.InputMaybe<EqualFilterTypeInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  value?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
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
  value?: Types.InputMaybe<Scalars['NaiveDateTime']['input']>;
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
  value?: Types.InputMaybe<Scalars['String']['input']>;
};

export type OutboundShipmentLineInput = {
  campaignId?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  numberOfPacks: Scalars['Float']['input'];
  programId?: Types.InputMaybe<Scalars['String']['input']>;
  stockLineId: Scalars['String']['input'];
  vvmStatusId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type PackagingVariantInput = {
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
  packSize?: Types.InputMaybe<Scalars['Float']['input']>;
  packagingLevel: Scalars['Int']['input'];
  volumePerUnit?: Types.InputMaybe<Scalars['Float']['input']>;
};

/**
 * Pagination input.
 *
 * Option to limit the number of returned items and/or queries large lists in "pages".
 */
export type PaginationInput = {
  /** Max number of returned items */
  first?: Types.InputMaybe<Scalars['Int']['input']>;
  /** First returned item is at the `offset` position in the full list */
  offset?: Types.InputMaybe<Scalars['Int']['input']>;
};

export type PatientFilterInput = {
  address1?: Types.InputMaybe<StringFilterInput>;
  address2?: Types.InputMaybe<StringFilterInput>;
  code?: Types.InputMaybe<StringFilterInput>;
  code2?: Types.InputMaybe<StringFilterInput>;
  country?: Types.InputMaybe<StringFilterInput>;
  dateOfBirth?: Types.InputMaybe<DateFilterInput>;
  dateOfDeath?: Types.InputMaybe<DateFilterInput>;
  email?: Types.InputMaybe<StringFilterInput>;
  firstName?: Types.InputMaybe<StringFilterInput>;
  gender?: Types.InputMaybe<EqualFilterGenderType>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  identifier?: Types.InputMaybe<StringFilterInput>;
  lastName?: Types.InputMaybe<StringFilterInput>;
  name?: Types.InputMaybe<StringFilterInput>;
  nextOfKinName?: Types.InputMaybe<StringFilterInput>;
  phone?: Types.InputMaybe<StringFilterInput>;
  programEnrolmentName?: Types.InputMaybe<StringFilterInput>;
};

export type PatientSearchInput = {
  /** Patient code */
  code?: Types.InputMaybe<Scalars['String']['input']>;
  /** Secondary patient code */
  code2?: Types.InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  firstName?: Types.InputMaybe<Scalars['String']['input']>;
  gender?: Types.InputMaybe<GenderTypeNode>;
  identifier?: Types.InputMaybe<Scalars['String']['input']>;
  lastName?: Types.InputMaybe<Scalars['String']['input']>;
  name?: Types.InputMaybe<Scalars['String']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: PatientSortFieldInput;
};

export type PeriodFilterInput = {
  endDate?: Types.InputMaybe<DateFilterInput>;
  startDate?: Types.InputMaybe<DateFilterInput>;
};

export type PluginDataFilterInput = {
  dataIdentifier?: Types.InputMaybe<EqualFilterStringInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  relatedRecordId?: Types.InputMaybe<EqualFilterStringInput>;
  storeId?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: PluginDataSortFieldInput;
};

/** The context we are editing pref within (e.g. prefs for given store, user, etc.) */
export type PreferenceDescriptionContext = {
  storeId?: Types.InputMaybe<Scalars['String']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: Scalars['String']['input'];
};

export type PrinterFilterInput = {
  address?: Types.InputMaybe<EqualFilterStringInput>;
  description?: Types.InputMaybe<StringFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
};

export type ProgramEnrolmentFilterInput = {
  documentName?: Types.InputMaybe<EqualFilterStringInput>;
  enrolmentDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  isImmunisationProgram?: Types.InputMaybe<Scalars['Boolean']['input']>;
  patientId?: Types.InputMaybe<EqualFilterStringInput>;
  programEnrolmentId?: Types.InputMaybe<StringFilterInput>;
  /** The program id */
  programId?: Types.InputMaybe<EqualFilterStringInput>;
  programName?: Types.InputMaybe<StringFilterInput>;
  status?: Types.InputMaybe<StringFilterInput>;
  /** Same as program enrolment document type */
  type?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ProgramEnrolmentSortFieldInput;
};

export type ProgramEventFilterInput = {
  activeEndDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  activeStartDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  data?: Types.InputMaybe<StringFilterInput>;
  documentName?: Types.InputMaybe<EqualFilterStringInput>;
  documentType?: Types.InputMaybe<EqualFilterStringInput>;
  patientId?: Types.InputMaybe<EqualFilterStringInput>;
  /** The event type */
  type?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ProgramEventSortFieldInput;
};

export type ProgramFilterInput = {
  contextId?: Types.InputMaybe<EqualFilterStringInput>;
  elmisCode?: Types.InputMaybe<EqualFilterStringInput>;
  existsForStoreId?: Types.InputMaybe<EqualFilterStringInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  isImmunisation?: Types.InputMaybe<Scalars['Boolean']['input']>;
  itemId?: Types.InputMaybe<EqualFilterStringInput>;
  name?: Types.InputMaybe<StringFilterInput>;
};

export type ProgramIndicatorFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  programId?: Types.InputMaybe<EqualFilterStringInput>;
};

export enum ProgramIndicatorSortFieldInput {
  Code = 'code',
  ProgramId = 'programId',
}

export type ProgramIndicatorSortInput = {
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  confirmedDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  createdDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  requestedDeliveryDate?: Types.InputMaybe<DateFilterInput>;
  sentDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  status?: Types.InputMaybe<EqualFilterPurchaseOrderStatusInput>;
  storeId?: Types.InputMaybe<EqualFilterStringInput>;
  supplier?: Types.InputMaybe<StringFilterInput>;
};

export type PurchaseOrderLineFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  purchaseOrderId?: Types.InputMaybe<EqualFilterStringInput>;
  receivedLessThanAdjusted?: Types.InputMaybe<Scalars['Boolean']['input']>;
  status?: Types.InputMaybe<EqualFilterPurchaseOrderLineStatusInput>;
};

export enum PurchaseOrderLineSortFieldInput {
  ExpectedDeliveryDate = 'expectedDeliveryDate',
  ItemName = 'itemName',
  LineNumber = 'lineNumber',
  PurchaseOrderNumber = 'purchaseOrderNumber',
  RequestedDeliveryDate = 'requestedDeliveryDate',
}

export type PurchaseOrderLineSortInput = {
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: PurchaseOrderSortFieldInput;
};

export type ReasonOptionFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  isActive?: Types.InputMaybe<Scalars['Boolean']['input']>;
  type?: Types.InputMaybe<EqualFilterReasonOptionTypeInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  context?: Types.InputMaybe<EqualFilterReportContextInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  isActive?: Types.InputMaybe<Scalars['Boolean']['input']>;
  name?: Types.InputMaybe<StringFilterInput>;
  subContext?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ReportSortFieldInput;
};

export type RequisitionFilterInput = {
  aShipmentHasBeenCreated?: Types.InputMaybe<Scalars['Boolean']['input']>;
  automaticallyCreated?: Types.InputMaybe<Scalars['Boolean']['input']>;
  colour?: Types.InputMaybe<EqualFilterStringInput>;
  comment?: Types.InputMaybe<StringFilterInput>;
  createdDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  elmisCode?: Types.InputMaybe<EqualFilterStringInput>;
  expectedDeliveryDate?: Types.InputMaybe<DateFilterInput>;
  finalisedDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  hasOutstandingLines?: Types.InputMaybe<Scalars['Boolean']['input']>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  isEmergency?: Types.InputMaybe<Scalars['Boolean']['input']>;
  isProgramRequisition?: Types.InputMaybe<Scalars['Boolean']['input']>;
  orderType?: Types.InputMaybe<EqualFilterStringInput>;
  otherPartyId?: Types.InputMaybe<EqualFilterStringInput>;
  otherPartyName?: Types.InputMaybe<StringFilterInput>;
  periodId?: Types.InputMaybe<EqualFilterStringInput>;
  programId?: Types.InputMaybe<EqualFilterStringInput>;
  requisitionNumber?: Types.InputMaybe<EqualFilterBigNumberInput>;
  sentDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  status?: Types.InputMaybe<EqualFilterRequisitionStatusInput>;
  theirReference?: Types.InputMaybe<StringFilterInput>;
  type?: Types.InputMaybe<EqualFilterRequisitionTypeInput>;
  userId?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: RequisitionSortFieldInput;
};

export type ResponseAddFromMasterListInput = {
  masterListId: Scalars['String']['input'];
  responseRequisitionId: Scalars['String']['input'];
};

export type ReturnReasonFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  isActive?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: ReturnReasonSortFieldInput;
};

export type RnRFormFilterInput = {
  createdDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  periodScheduleId?: Types.InputMaybe<EqualFilterStringInput>;
  programId?: Types.InputMaybe<EqualFilterStringInput>;
  storeId?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: RnRFormSortFieldInput;
};

export type SaveGoodsReceivedLine = {
  batch?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  expiryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  manufacturerId?: Types.InputMaybe<Scalars['String']['input']>;
  numberOfPacksReceived?: Types.InputMaybe<Scalars['Float']['input']>;
  receivedPackSize?: Types.InputMaybe<Scalars['Float']['input']>;
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
  placeholderQuantity?: Types.InputMaybe<Scalars['Float']['input']>;
};

export type SavePrescriptionLinesInput = {
  invoiceId: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  lines: Array<PrescriptionLineInput>;
  note?: Types.InputMaybe<Scalars['String']['input']>;
  prescribedQuantity?: Types.InputMaybe<Scalars['Float']['input']>;
};

export type SensorFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  isActive?: Types.InputMaybe<Scalars['Boolean']['input']>;
  name?: Types.InputMaybe<StringFilterInput>;
  serial?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: SensorSortFieldInput;
};

export type SetPrescribedQuantityInput = {
  invoiceId: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  prescribedQuantity: Scalars['Float']['input'];
};

export type ShippingMethodFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  method?: Types.InputMaybe<StringFilterInput>;
};

export type StockEvolutionOptionsInput = {
  /** Defaults to 30, number of data points for historic stock on hand in stock evolution chart */
  numberOfHistoricDataPoints?: Types.InputMaybe<Scalars['Int']['input']>;
  /** Defaults to 20, number of data points for projected stock on hand in stock evolution chart */
  numberOfProjectedDataPoints?: Types.InputMaybe<Scalars['Int']['input']>;
};

export type StockLineFilterInput = {
  code?: Types.InputMaybe<StringFilterInput>;
  expiryDate?: Types.InputMaybe<DateFilterInput>;
  hasPacksInStore?: Types.InputMaybe<Scalars['Boolean']['input']>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  isActive?: Types.InputMaybe<Scalars['Boolean']['input']>;
  isAvailable?: Types.InputMaybe<Scalars['Boolean']['input']>;
  isProgramStockLine?: Types.InputMaybe<Scalars['Boolean']['input']>;
  itemCodeOrName?: Types.InputMaybe<StringFilterInput>;
  itemId?: Types.InputMaybe<EqualFilterStringInput>;
  location?: Types.InputMaybe<LocationFilterInput>;
  locationId?: Types.InputMaybe<EqualFilterStringInput>;
  masterList?: Types.InputMaybe<MasterListFilterInput>;
  name?: Types.InputMaybe<StringFilterInput>;
  search?: Types.InputMaybe<StringFilterInput>;
  storeId?: Types.InputMaybe<EqualFilterStringInput>;
  vvmStatusId?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: StockLineSortFieldInput;
};

export type StocktakeFilterInput = {
  comment?: Types.InputMaybe<StringFilterInput>;
  createdDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  description?: Types.InputMaybe<StringFilterInput>;
  finalisedDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  isLocked?: Types.InputMaybe<Scalars['Boolean']['input']>;
  isProgramStocktake?: Types.InputMaybe<Scalars['Boolean']['input']>;
  programId?: Types.InputMaybe<EqualFilterStringInput>;
  status?: Types.InputMaybe<EqualFilterStocktakeStatusInput>;
  stocktakeDate?: Types.InputMaybe<DateFilterInput>;
  stocktakeNumber?: Types.InputMaybe<EqualFilterBigNumberInput>;
  userId?: Types.InputMaybe<EqualFilterStringInput>;
};

export type StocktakeLineFilterInput = {
  id?: Types.InputMaybe<EqualFilterStringInput>;
  itemCodeOrName?: Types.InputMaybe<StringFilterInput>;
  itemId?: Types.InputMaybe<EqualFilterStringInput>;
  locationId?: Types.InputMaybe<EqualFilterStringInput>;
  stockLineId?: Types.InputMaybe<EqualFilterStringInput>;
  stocktakeId?: Types.InputMaybe<EqualFilterStringInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: StocktakeSortFieldInput;
};

export type StoreFilterInput = {
  code?: Types.InputMaybe<StringFilterInput>;
  codeOrName?: Types.InputMaybe<StringFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  name?: Types.InputMaybe<StringFilterInput>;
  nameCode?: Types.InputMaybe<StringFilterInput>;
  siteId?: Types.InputMaybe<EqualFilterNumberInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: StoreSortFieldInput;
};

export type StringFilterInput = {
  /** Search term must be an exact match (case sensitive) */
  equalTo?: Types.InputMaybe<Scalars['String']['input']>;
  /** Search term must be included in search candidate (case insensitive) */
  like?: Types.InputMaybe<Scalars['String']['input']>;
};

export type StringStorePrefInput = {
  storeId: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type SupplierReturnInput = {
  id: Scalars['String']['input'];
  inboundShipmentId?: Types.InputMaybe<Scalars['String']['input']>;
  supplierId: Scalars['String']['input'];
  supplierReturnLines: Array<SupplierReturnLineInput>;
};

export type SupplierReturnLineInput = {
  id: Scalars['String']['input'];
  note?: Types.InputMaybe<Scalars['String']['input']>;
  numberOfPacksToReturn: Scalars['Float']['input'];
  reasonId?: Types.InputMaybe<Scalars['String']['input']>;
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
  percentage?: Types.InputMaybe<Scalars['Float']['input']>;
};

export type TemperatureBreachFilterInput = {
  endDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  location?: Types.InputMaybe<LocationFilterInput>;
  sensor?: Types.InputMaybe<SensorFilterInput>;
  startDatetime?: Types.InputMaybe<DatetimeFilterInput>;
  type?: Types.InputMaybe<EqualFilterTemperatureBreachRowTypeInput>;
  unacknowledged?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
  /** Sort query result by `key` */
  key: TemperatureBreachSortFieldInput;
};

export type TemperatureLogFilterInput = {
  datetime?: Types.InputMaybe<DatetimeFilterInput>;
  id?: Types.InputMaybe<EqualFilterStringInput>;
  location?: Types.InputMaybe<LocationFilterInput>;
  sensor?: Types.InputMaybe<SensorFilterInput>;
  temperatureBreach?: Types.InputMaybe<TemperatureBreachFilterInput>;
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
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
  assetNumber?: Types.InputMaybe<Scalars['String']['input']>;
  catalogueItemId?: Types.InputMaybe<NullableStringUpdate>;
  donorNameId?: Types.InputMaybe<NullableStringUpdate>;
  id: Scalars['String']['input'];
  installationDate?: Types.InputMaybe<NullableDateUpdate>;
  locationIds?: Types.InputMaybe<Array<Scalars['String']['input']>>;
  needsReplacement?: Types.InputMaybe<Scalars['Boolean']['input']>;
  notes?: Types.InputMaybe<Scalars['String']['input']>;
  properties?: Types.InputMaybe<Scalars['String']['input']>;
  replacementDate?: Types.InputMaybe<NullableDateUpdate>;
  serialNumber?: Types.InputMaybe<NullableStringUpdate>;
  storeId?: Types.InputMaybe<NullableStringUpdate>;
  warrantyEnd?: Types.InputMaybe<NullableDateUpdate>;
  warrantyStart?: Types.InputMaybe<NullableDateUpdate>;
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
  colour?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  onHold?: Types.InputMaybe<Scalars['Boolean']['input']>;
  otherPartyId?: Types.InputMaybe<Scalars['String']['input']>;
  status?: Types.InputMaybe<UpdateCustomerReturnStatusInput>;
  theirReference?: Types.InputMaybe<Scalars['String']['input']>;
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
  basePopulation?: Types.InputMaybe<Scalars['Int']['input']>;
  baseYear?: Types.InputMaybe<Scalars['Int']['input']>;
  id: Scalars['String']['input'];
  name?: Types.InputMaybe<Scalars['String']['input']>;
  populationPercentage?: Types.InputMaybe<Scalars['Float']['input']>;
  year1Projection?: Types.InputMaybe<Scalars['Int']['input']>;
  year2Projection?: Types.InputMaybe<Scalars['Int']['input']>;
  year3Projection?: Types.InputMaybe<Scalars['Int']['input']>;
  year4Projection?: Types.InputMaybe<Scalars['Int']['input']>;
  year5Projection?: Types.InputMaybe<Scalars['Int']['input']>;
};

export type UpdateDemographicProjectionInput = {
  baseYear?: Types.InputMaybe<Scalars['Int']['input']>;
  id: Scalars['String']['input'];
  year1?: Types.InputMaybe<Scalars['Float']['input']>;
  year2?: Types.InputMaybe<Scalars['Float']['input']>;
  year3?: Types.InputMaybe<Scalars['Float']['input']>;
  year4?: Types.InputMaybe<Scalars['Float']['input']>;
  year5?: Types.InputMaybe<Scalars['Float']['input']>;
};

export type UpdateDonorInput = {
  applyToLines: ApplyToLinesInput;
  donorId?: Types.InputMaybe<Scalars['String']['input']>;
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
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  donorId?: Types.InputMaybe<NullableStringUpdate>;
  id: Scalars['String']['input'];
  receivedDate?: Types.InputMaybe<NullableDateUpdate>;
  status?: Types.InputMaybe<GoodsReceivedNodeType>;
  supplierReference?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateGoodsReceivedLineInput = {
  batch?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  expiryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  manufacturerId?: Types.InputMaybe<Scalars['String']['input']>;
  numberOfPacksReceived?: Types.InputMaybe<Scalars['Float']['input']>;
  receivedPackSize?: Types.InputMaybe<Scalars['Float']['input']>;
};

export type UpdateInboundShipmentInput = {
  colour?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  currencyId?: Types.InputMaybe<Scalars['String']['input']>;
  currencyRate?: Types.InputMaybe<Scalars['Float']['input']>;
  defaultDonor?: Types.InputMaybe<UpdateDonorInput>;
  id: Scalars['String']['input'];
  onHold?: Types.InputMaybe<Scalars['Boolean']['input']>;
  otherPartyId?: Types.InputMaybe<Scalars['String']['input']>;
  status?: Types.InputMaybe<UpdateInboundShipmentStatusInput>;
  tax?: Types.InputMaybe<TaxInput>;
  theirReference?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateInboundShipmentLineInput = {
  batch?: Types.InputMaybe<Scalars['String']['input']>;
  campaignId?: Types.InputMaybe<NullableStringUpdate>;
  costPricePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  donorId?: Types.InputMaybe<NullableStringUpdate>;
  expiryDate?: Types.InputMaybe<NullableDateUpdate>;
  id: Scalars['String']['input'];
  itemId?: Types.InputMaybe<Scalars['String']['input']>;
  itemVariantId?: Types.InputMaybe<NullableStringUpdate>;
  location?: Types.InputMaybe<NullableStringUpdate>;
  note?: Types.InputMaybe<NullableStringUpdate>;
  numberOfPacks?: Types.InputMaybe<Scalars['Float']['input']>;
  packSize?: Types.InputMaybe<Scalars['Float']['input']>;
  programId?: Types.InputMaybe<NullableStringUpdate>;
  sellPricePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  shippedNumberOfPacks?: Types.InputMaybe<Scalars['Float']['input']>;
  shippedPackSize?: Types.InputMaybe<Scalars['Float']['input']>;
  tax?: Types.InputMaybe<TaxInput>;
  totalBeforeTax?: Types.InputMaybe<Scalars['Float']['input']>;
  volumePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateInboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
  itemId?: Types.InputMaybe<Scalars['String']['input']>;
  name?: Types.InputMaybe<Scalars['String']['input']>;
  note?: Types.InputMaybe<Scalars['String']['input']>;
  tax?: Types.InputMaybe<TaxInput>;
  totalBeforeTax?: Types.InputMaybe<Scalars['Float']['input']>;
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
  discountPercentage?: Types.InputMaybe<Scalars['Float']['input']>;
  expiryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  insuranceProviderId?: Types.InputMaybe<Scalars['String']['input']>;
  isActive?: Types.InputMaybe<Scalars['Boolean']['input']>;
  nameOfInsured?: Types.InputMaybe<Scalars['String']['input']>;
  policyType?: Types.InputMaybe<InsurancePolicyNodeType>;
};

export type UpdateLocationInput = {
  code?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  locationTypeId?: Types.InputMaybe<Scalars['String']['input']>;
  name?: Types.InputMaybe<Scalars['String']['input']>;
  onHold?: Types.InputMaybe<Scalars['Boolean']['input']>;
  volume?: Types.InputMaybe<Scalars['Float']['input']>;
};

export type UpdateNamePropertiesInput = {
  id: Scalars['String']['input'];
  properties?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateOutboundShipmentInput = {
  colour?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  currencyId?: Types.InputMaybe<Scalars['String']['input']>;
  currencyRate?: Types.InputMaybe<Scalars['Float']['input']>;
  expectedDeliveryDate?: Types.InputMaybe<NullableDateUpdate>;
  /** The new invoice id provided by the client */
  id: Scalars['String']['input'];
  onHold?: Types.InputMaybe<Scalars['Boolean']['input']>;
  shippingMethodId?: Types.InputMaybe<NullableStringUpdate>;
  /**
   * When changing the status from DRAFT to CONFIRMED or FINALISED the total_number_of_packs for
   * existing invoice items gets updated.
   */
  status?: Types.InputMaybe<UpdateOutboundShipmentStatusInput>;
  tax?: Types.InputMaybe<TaxInput>;
  /** External invoice reference, e.g. purchase or shipment number */
  theirReference?: Types.InputMaybe<Scalars['String']['input']>;
  transportReference?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateOutboundShipmentLineInput = {
  id: Scalars['String']['input'];
  numberOfPacks?: Types.InputMaybe<Scalars['Float']['input']>;
  prescribedQuantity?: Types.InputMaybe<Scalars['Float']['input']>;
  stockLineId?: Types.InputMaybe<Scalars['String']['input']>;
  tax?: Types.InputMaybe<TaxInput>;
  vvmStatusId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateOutboundShipmentNameInput = {
  id: Scalars['String']['input'];
  otherPartyId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateOutboundShipmentServiceLineInput = {
  id: Scalars['String']['input'];
  itemId?: Types.InputMaybe<Scalars['String']['input']>;
  name?: Types.InputMaybe<Scalars['String']['input']>;
  note?: Types.InputMaybe<Scalars['String']['input']>;
  tax?: Types.InputMaybe<TaxInput>;
  totalBeforeTax?: Types.InputMaybe<Scalars['Float']['input']>;
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
  address1?: Types.InputMaybe<Scalars['String']['input']>;
  code: Scalars['String']['input'];
  code2?: Types.InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  dateOfDeath?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  firstName?: Types.InputMaybe<Scalars['String']['input']>;
  gender?: Types.InputMaybe<GenderTypeNode>;
  id: Scalars['String']['input'];
  isDeceased?: Types.InputMaybe<Scalars['Boolean']['input']>;
  lastName?: Types.InputMaybe<Scalars['String']['input']>;
  nextOfKinId?: Types.InputMaybe<Scalars['String']['input']>;
  nextOfKinName?: Types.InputMaybe<Scalars['String']['input']>;
  phone?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdatePluginDataInput = {
  data: Scalars['String']['input'];
  dataIdentifier: Scalars['String']['input'];
  id: Scalars['String']['input'];
  pluginCode: Scalars['String']['input'];
  relatedRecordId?: Types.InputMaybe<Scalars['String']['input']>;
  storeId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdatePrescriptionInput = {
  clinicianId?: Types.InputMaybe<NullableStringUpdate>;
  colour?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  diagnosisId?: Types.InputMaybe<NullableStringUpdate>;
  id: Scalars['String']['input'];
  insuranceDiscountAmount?: Types.InputMaybe<Scalars['Float']['input']>;
  insuranceDiscountPercentage?: Types.InputMaybe<Scalars['Float']['input']>;
  nameInsuranceJoinId?: Types.InputMaybe<NullableStringUpdate>;
  patientId?: Types.InputMaybe<Scalars['String']['input']>;
  prescriptionDate?: Types.InputMaybe<Scalars['DateTime']['input']>;
  programId?: Types.InputMaybe<NullableStringUpdate>;
  status?: Types.InputMaybe<UpdatePrescriptionStatusInput>;
  theirReference?: Types.InputMaybe<NullableStringUpdate>;
};

export type UpdatePrescriptionLineInput = {
  id: Scalars['String']['input'];
  note?: Types.InputMaybe<Scalars['String']['input']>;
  numberOfPacks?: Types.InputMaybe<Scalars['Float']['input']>;
  stockLineId?: Types.InputMaybe<Scalars['String']['input']>;
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
  additionalInstructions?: Types.InputMaybe<Scalars['String']['input']>;
  advancePaidDate?: Types.InputMaybe<NullableDateUpdate>;
  agentCommission?: Types.InputMaybe<Scalars['Float']['input']>;
  authorisingOfficer1?: Types.InputMaybe<Scalars['String']['input']>;
  authorisingOfficer2?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  communicationsCharge?: Types.InputMaybe<Scalars['Float']['input']>;
  confirmedDatetime?: Types.InputMaybe<NullableDatetimeUpdate>;
  contractSignedDate?: Types.InputMaybe<NullableDateUpdate>;
  currencyId?: Types.InputMaybe<Scalars['String']['input']>;
  documentCharge?: Types.InputMaybe<Scalars['Float']['input']>;
  donorId?: Types.InputMaybe<NullableStringUpdate>;
  foreignExchangeRate?: Types.InputMaybe<Scalars['Float']['input']>;
  freightCharge?: Types.InputMaybe<Scalars['Float']['input']>;
  freightConditions?: Types.InputMaybe<Scalars['String']['input']>;
  headingMessage?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  insuranceCharge?: Types.InputMaybe<Scalars['Float']['input']>;
  receivedAtPortDate?: Types.InputMaybe<NullableDateUpdate>;
  reference?: Types.InputMaybe<Scalars['String']['input']>;
  requestedDeliveryDate?: Types.InputMaybe<NullableDateUpdate>;
  sentDatetime?: Types.InputMaybe<NullableDatetimeUpdate>;
  shippingMethod?: Types.InputMaybe<Scalars['String']['input']>;
  status?: Types.InputMaybe<PurchaseOrderNodeStatus>;
  supplierAgent?: Types.InputMaybe<Scalars['String']['input']>;
  supplierDiscountAmount?: Types.InputMaybe<Scalars['Float']['input']>;
  supplierDiscountPercentage?: Types.InputMaybe<Scalars['Float']['input']>;
  supplierId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdatePurchaseOrderLineInput = {
  adjustedNumberOfUnits?: Types.InputMaybe<Scalars['Float']['input']>;
  comment?: Types.InputMaybe<NullableStringUpdate>;
  expectedDeliveryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  itemId?: Types.InputMaybe<Scalars['String']['input']>;
  manufacturerId?: Types.InputMaybe<NullableStringUpdate>;
  note?: Types.InputMaybe<NullableStringUpdate>;
  pricePerPackAfterDiscount?: Types.InputMaybe<Scalars['Float']['input']>;
  pricePerPackBeforeDiscount?: Types.InputMaybe<Scalars['Float']['input']>;
  requestedDeliveryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  requestedNumberOfUnits?: Types.InputMaybe<Scalars['Float']['input']>;
  requestedPackSize?: Types.InputMaybe<Scalars['Float']['input']>;
  status?: Types.InputMaybe<PurchaseOrderLineStatusNode>;
  supplierItemCode?: Types.InputMaybe<NullableStringUpdate>;
  unit?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateRequestRequisitionInput = {
  colour?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  expectedDeliveryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  maxMonthsOfStock?: Types.InputMaybe<Scalars['Float']['input']>;
  minMonthsOfStock?: Types.InputMaybe<Scalars['Float']['input']>;
  originalCustomerId?: Types.InputMaybe<NullableStringUpdate>;
  otherPartyId?: Types.InputMaybe<Scalars['String']['input']>;
  status?: Types.InputMaybe<UpdateRequestRequisitionStatusInput>;
  theirReference?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateRequestRequisitionLineInput = {
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  optionId?: Types.InputMaybe<Scalars['String']['input']>;
  requestedQuantity?: Types.InputMaybe<Scalars['Float']['input']>;
};

export enum UpdateRequestRequisitionStatusInput {
  Sent = 'SENT',
}

export type UpdateResponseRequisitionInput = {
  colour?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  status?: Types.InputMaybe<UpdateResponseRequisitionStatusInput>;
  theirReference?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateResponseRequisitionLineInput = {
  additionInUnits?: Types.InputMaybe<Scalars['Float']['input']>;
  averageMonthlyConsumption?: Types.InputMaybe<Scalars['Float']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  daysOutOfStock?: Types.InputMaybe<Scalars['Float']['input']>;
  expiringUnits?: Types.InputMaybe<Scalars['Float']['input']>;
  id: Scalars['String']['input'];
  incomingUnits?: Types.InputMaybe<Scalars['Float']['input']>;
  initialStockOnHand?: Types.InputMaybe<Scalars['Float']['input']>;
  lossInUnits?: Types.InputMaybe<Scalars['Float']['input']>;
  optionId?: Types.InputMaybe<Scalars['String']['input']>;
  outgoingUnits?: Types.InputMaybe<Scalars['Float']['input']>;
  requestedQuantity?: Types.InputMaybe<Scalars['Float']['input']>;
  stockOnHand?: Types.InputMaybe<Scalars['Float']['input']>;
  supplyQuantity?: Types.InputMaybe<Scalars['Float']['input']>;
};

export enum UpdateResponseRequisitionStatusInput {
  Finalised = 'FINALISED',
}

export type UpdateRnRFormInput = {
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  lines: Array<UpdateRnRFormLineInput>;
  theirReference?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateRnRFormLineInput = {
  adjustedQuantityConsumed: Scalars['Float']['input'];
  adjustments?: Types.InputMaybe<Scalars['Float']['input']>;
  averageMonthlyConsumption: Scalars['Float']['input'];
  calculatedRequestedQuantity: Scalars['Float']['input'];
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  confirmed: Scalars['Boolean']['input'];
  enteredRequestedQuantity?: Types.InputMaybe<Scalars['Float']['input']>;
  expiryDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  finalBalance: Scalars['Float']['input'];
  id: Scalars['String']['input'];
  initialBalance: Scalars['Float']['input'];
  losses?: Types.InputMaybe<Scalars['Float']['input']>;
  lowStock: LowStockStatus;
  maximumQuantity: Scalars['Float']['input'];
  minimumQuantity: Scalars['Float']['input'];
  quantityConsumed?: Types.InputMaybe<Scalars['Float']['input']>;
  quantityReceived?: Types.InputMaybe<Scalars['Float']['input']>;
  stockOutDuration: Scalars['Int']['input'];
};

export type UpdateSensorInput = {
  id: Scalars['String']['input'];
  isActive?: Types.InputMaybe<Scalars['Boolean']['input']>;
  locationId?: Types.InputMaybe<NullableStringUpdate>;
  name?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateStockLineInput = {
  /** Empty barcode will unlink barcode from StockLine */
  barcode?: Types.InputMaybe<Scalars['String']['input']>;
  batch?: Types.InputMaybe<Scalars['String']['input']>;
  campaignId?: Types.InputMaybe<NullableStringUpdate>;
  costPricePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  donorId?: Types.InputMaybe<NullableStringUpdate>;
  expiryDate?: Types.InputMaybe<NullableDateUpdate>;
  id: Scalars['String']['input'];
  itemVariantId?: Types.InputMaybe<NullableStringUpdate>;
  location?: Types.InputMaybe<NullableStringUpdate>;
  onHold?: Types.InputMaybe<Scalars['Boolean']['input']>;
  programId?: Types.InputMaybe<NullableStringUpdate>;
  sellPricePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  volumePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateStocktakeInput = {
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  countedBy?: Types.InputMaybe<Scalars['String']['input']>;
  description?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  isLocked?: Types.InputMaybe<Scalars['Boolean']['input']>;
  status?: Types.InputMaybe<UpdateStocktakeStatusInput>;
  stocktakeDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  verifiedBy?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateStocktakeLineInput = {
  batch?: Types.InputMaybe<Scalars['String']['input']>;
  campaignId?: Types.InputMaybe<NullableStringUpdate>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  costPricePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  countedNumberOfPacks?: Types.InputMaybe<Scalars['Float']['input']>;
  donorId?: Types.InputMaybe<NullableStringUpdate>;
  expiryDate?: Types.InputMaybe<NullableDateUpdate>;
  id: Scalars['String']['input'];
  itemVariantId?: Types.InputMaybe<NullableStringUpdate>;
  location?: Types.InputMaybe<NullableStringUpdate>;
  note?: Types.InputMaybe<Scalars['String']['input']>;
  packSize?: Types.InputMaybe<Scalars['Float']['input']>;
  programId?: Types.InputMaybe<NullableStringUpdate>;
  reasonOptionId?: Types.InputMaybe<Scalars['String']['input']>;
  sellPricePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  snapshotNumberOfPacks?: Types.InputMaybe<Scalars['Float']['input']>;
  volumePerPack?: Types.InputMaybe<Scalars['Float']['input']>;
  vvmStatusId?: Types.InputMaybe<Scalars['String']['input']>;
};

export enum UpdateStocktakeStatusInput {
  Finalised = 'FINALISED',
}

export type UpdateSupplierReturnInput = {
  colour?: Types.InputMaybe<Scalars['String']['input']>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  onHold?: Types.InputMaybe<Scalars['Boolean']['input']>;
  status?: Types.InputMaybe<UpdateSupplierReturnStatusInput>;
  theirReference?: Types.InputMaybe<Scalars['String']['input']>;
  transportReference?: Types.InputMaybe<Scalars['String']['input']>;
};

export type UpdateSupplierReturnLinesInput = {
  supplierReturnId: Scalars['String']['input'];
  supplierReturnLines: Array<SupplierReturnLineInput>;
};

export type UpdateSupplierReturnOtherPartyInput = {
  id: Scalars['String']['input'];
  otherPartyId?: Types.InputMaybe<Scalars['String']['input']>;
};

export enum UpdateSupplierReturnStatusInput {
  Picked = 'PICKED',
  Shipped = 'SHIPPED',
}

export type UpdateTemperatureBreachInput = {
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  unacknowledged: Scalars['Boolean']['input'];
};

export type UpdateVvmStatusLogInput = {
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
};

export type UpdateVaccinationInput = {
  clinicianId?: Types.InputMaybe<NullableStringUpdate>;
  comment?: Types.InputMaybe<Scalars['String']['input']>;
  facilityFreeText?: Types.InputMaybe<NullableStringUpdate>;
  facilityNameId?: Types.InputMaybe<NullableStringUpdate>;
  given?: Types.InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['String']['input'];
  itemId?: Types.InputMaybe<NullableStringUpdate>;
  notGivenReason?: Types.InputMaybe<Scalars['String']['input']>;
  stockLineId?: Types.InputMaybe<NullableStringUpdate>;
  updateTransactions?: Types.InputMaybe<Scalars['Boolean']['input']>;
  vaccinationDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
};

export type UpdateVaccineCourseInput = {
  canSkipDose?: Types.InputMaybe<Scalars['Boolean']['input']>;
  coverageRate: Scalars['Float']['input'];
  demographicId?: Types.InputMaybe<Scalars['String']['input']>;
  doses: Array<UpsertVaccineCourseDoseInput>;
  id: Scalars['String']['input'];
  name?: Types.InputMaybe<Scalars['String']['input']>;
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
  endDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
  id: Scalars['String']['input'];
  name: Scalars['String']['input'];
  startDate?: Types.InputMaybe<Scalars['NaiveDate']['input']>;
};

export type UpsertItemVariantInput = {
  id: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
  locationTypeId?: Types.InputMaybe<NullableStringUpdate>;
  manufacturerId?: Types.InputMaybe<NullableStringUpdate>;
  name: Scalars['String']['input'];
  packagingVariants: Array<PackagingVariantInput>;
  vvmType?: Types.InputMaybe<NullableStringUpdate>;
};

export type UpsertLogLevelInput = {
  level: LogLevelEnum;
};

export type UpsertPreferencesInput = {
  adjustForNumberOfDaysOutOfStock?: Types.InputMaybe<Scalars['Boolean']['input']>;
  allowTrackingOfStockByDonor?: Types.InputMaybe<Scalars['Boolean']['input']>;
  authoriseGoodsReceived?: Types.InputMaybe<Scalars['Boolean']['input']>;
  authorisePurchaseOrder?: Types.InputMaybe<Scalars['Boolean']['input']>;
  canCreateInternalOrderFromARequisition?: Types.InputMaybe<Array<BoolStorePrefInput>>;
  customTranslations?: Types.InputMaybe<Scalars['JSONObject']['input']>;
  daysInMonth?: Types.InputMaybe<Scalars['Float']['input']>;
  disableManualReturns?: Types.InputMaybe<Array<BoolStorePrefInput>>;
  expiredStockIssueThreshold?: Types.InputMaybe<Scalars['Int']['input']>;
  expiredStockPreventIssue?: Types.InputMaybe<Scalars['Boolean']['input']>;
  firstThresholdForExpiringItems?: Types.InputMaybe<Array<IntegerStorePrefInput>>;
  genderOptions?: Types.InputMaybe<Array<GenderTypeNode>>;
  inboundShipmentAutoVerify?: Types.InputMaybe<Array<BoolStorePrefInput>>;
  invoiceStatusOptions?: Types.InputMaybe<Array<InvoiceStatusOptionsInput>>;
  isGaps?: Types.InputMaybe<Scalars['Boolean']['input']>;
  itemMarginOverridesSupplierMargin?: Types.InputMaybe<Scalars['Boolean']['input']>;
  manageVaccinesInDoses?: Types.InputMaybe<Array<BoolStorePrefInput>>;
  manageVvmStatusForStock?: Types.InputMaybe<Array<BoolStorePrefInput>>;
  numberOfMonthsThresholdToShowLowStockAlertsForProducts?: Types.InputMaybe<Array<IntegerStorePrefInput>>;
  numberOfMonthsThresholdToShowOverStockAlertsForProducts?: Types.InputMaybe<Array<IntegerStorePrefInput>>;
  numberOfMonthsToCheckForConsumptionWhenCalculatingOutOfStockProducts?: Types.InputMaybe<Array<IntegerStorePrefInput>>;
  orderInPacks?: Types.InputMaybe<Array<BoolStorePrefInput>>;
  preventTransfersMonthsBeforeInitialisation?: Types.InputMaybe<Scalars['Int']['input']>;
  requisitionAutoFinalise?: Types.InputMaybe<Array<BoolStorePrefInput>>;
  secondThresholdForExpiringItems?: Types.InputMaybe<Array<IntegerStorePrefInput>>;
  selectDestinationStoreForAnInternalOrder?: Types.InputMaybe<Array<BoolStorePrefInput>>;
  showContactTracing?: Types.InputMaybe<Scalars['Boolean']['input']>;
  showIndicativePriceInRequisitions?: Types.InputMaybe<Scalars['Boolean']['input']>;
  sortByVvmStatusThenExpiry?: Types.InputMaybe<Array<BoolStorePrefInput>>;
  storeCustomColour?: Types.InputMaybe<Array<StringStorePrefInput>>;
  syncRecordsDisplayThreshold?: Types.InputMaybe<Scalars['Int']['input']>;
  useProcurementFunctionality?: Types.InputMaybe<Array<BoolStorePrefInput>>;
  useSimplifiedMobileUi?: Types.InputMaybe<Array<BoolStorePrefInput>>;
  warnWhenMissingRecentStocktake?: Types.InputMaybe<Array<WarnWhenMissingRecentStocktakeInput>>;
  warningForExcessRequest?: Types.InputMaybe<Scalars['Boolean']['input']>;
};

export type UpsertVaccineCourseDoseInput = {
  customAgeLabel?: Types.InputMaybe<Scalars['String']['input']>;
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
  id?: Types.InputMaybe<EqualFilterStringInput>;
  name?: Types.InputMaybe<StringFilterInput>;
  programId?: Types.InputMaybe<EqualFilterStringInput>;
};

export enum VaccineCourseSortFieldInput {
  Name = 'name',
}

export type VaccineCourseSortInput = {
  desc?: Types.InputMaybe<Scalars['Boolean']['input']>;
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
