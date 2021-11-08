import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  DateTime: any;
  NaiveDate: any;
};

export type BatchInboundShipmentResponse = {
  __typename?: 'BatchInboundShipmentResponse';
  deleteInboundShipmentLines?: Maybe<
    Array<DeleteInboundShipmentLineResponseWithId>
  >;
  deleteInboundShipments?: Maybe<Array<DeleteInboundShipmentResponseWithId>>;
  insertInboundShipmentLines?: Maybe<
    Array<InsertInboundShipmentLineResponseWithId>
  >;
  insertInboundShipments?: Maybe<Array<InsertInboundShipmentResponseWithId>>;
  updateInboundShipmentLines?: Maybe<
    Array<UpdateInboundShipmentLineResponseWithId>
  >;
  updateInboundShipments?: Maybe<Array<UpdateInboundShipmentResponseWithId>>;
};

export type BatchIsReserved = DeleteInboundShipmentLineErrorInterface &
  UpdateInboundShipmentLineErrorInterface & {
    __typename?: 'BatchIsReserved';
    description: Scalars['String'];
  };

export type BatchOutboundShipmentInput = {
  deleteOutboundShipmentLines?: Maybe<Array<DeleteOutboundShipmentLineInput>>;
  deleteOutboundShipments?: Maybe<Array<Scalars['String']>>;
  insertOutboundShipmentLines?: Maybe<Array<InsertOutboundShipmentLineInput>>;
  insertOutboundShipments?: Maybe<Array<InsertOutboundShipmentInput>>;
  updateOutboundShipmentLines?: Maybe<Array<UpdateOutboundShipmentLineInput>>;
  updateOutboundShipments?: Maybe<Array<UpdateOutboundShipmentInput>>;
};

export type BatchOutboundShipmentResponse = {
  __typename?: 'BatchOutboundShipmentResponse';
  deleteOutboundShipmentLines?: Maybe<
    Array<DeleteOutboundShipmentLineResponseWithId>
  >;
  deleteOutboundShipments?: Maybe<Array<DeleteOutboundShipmentResponseWithId>>;
  insertOutboundShipmentLines?: Maybe<
    Array<InsertOutboundShipmentLineResponseWithId>
  >;
  insertOutboundShipments?: Maybe<Array<InsertOutboundShipmentResponseWithId>>;
  updateOutboundShipmentLines?: Maybe<
    Array<UpdateOutboundShipmentLineResponseWithId>
  >;
  updateOutboundShipments?: Maybe<Array<UpdateOutboundShipmentResponseWithId>>;
};

export type CanOnlyEditInvoicesInLoggedInStoreError =
  UpdateOutboundShipmentErrorInterface & {
    __typename?: 'CanOnlyEditInvoicesInLoggedInStoreError';
    description: Scalars['String'];
  };

export type CannotChangeInvoiceBackToDraft =
  UpdateInboundShipmentErrorInterface & {
    __typename?: 'CannotChangeInvoiceBackToDraft';
    description: Scalars['String'];
  };

export type CannotChangeStatusBackToDraftError =
  UpdateOutboundShipmentErrorInterface & {
    __typename?: 'CannotChangeStatusBackToDraftError';
    description: Scalars['String'];
  };

export type CannotChangeStatusOfInvoiceOnHold =
  UpdateInboundShipmentErrorInterface &
    UpdateOutboundShipmentErrorInterface & {
      __typename?: 'CannotChangeStatusOfInvoiceOnHold';
      description: Scalars['String'];
    };

export type CannotDeleteInvoiceWithLines = DeleteInboundShipmentErrorInterface &
  DeleteOutboundShipmentErrorInterface & {
    __typename?: 'CannotDeleteInvoiceWithLines';
    description: Scalars['String'];
    lines: InvoiceLineConnector;
  };

export type CannotEditFinalisedInvoice = DeleteInboundShipmentErrorInterface &
  DeleteInboundShipmentLineErrorInterface &
  DeleteOutboundShipmentErrorInterface &
  DeleteOutboundShipmentLineErrorInterface &
  InsertInboundShipmentLineErrorInterface &
  InsertOutboundShipmentLineErrorInterface &
  UpdateInboundShipmentErrorInterface &
  UpdateInboundShipmentLineErrorInterface &
  UpdateOutboundShipmentLineErrorInterface & {
    __typename?: 'CannotEditFinalisedInvoice';
    description: Scalars['String'];
  };

export type ConnectorError = {
  __typename?: 'ConnectorError';
  error: ConnectorErrorInterface;
};

export type ConnectorErrorInterface = {
  description: Scalars['String'];
};

export type DatabaseError = ConnectorErrorInterface &
  DeleteInboundShipmentErrorInterface &
  DeleteInboundShipmentLineErrorInterface &
  DeleteOutboundShipmentErrorInterface &
  DeleteOutboundShipmentLineErrorInterface &
  InsertInboundShipmentErrorInterface &
  InsertInboundShipmentLineErrorInterface &
  InsertOutboundShipmentErrorInterface &
  InsertOutboundShipmentLineErrorInterface &
  NodeErrorInterface &
  UpdateInboundShipmentErrorInterface &
  UpdateInboundShipmentLineErrorInterface &
  UpdateOutboundShipmentErrorInterface &
  UpdateOutboundShipmentLineErrorInterface & {
    __typename?: 'DatabaseError';
    description: Scalars['String'];
    fullError: Scalars['String'];
  };

export type DatetimeFilterInput = {
  afterOrEqualTo?: Maybe<Scalars['DateTime']>;
  beforeOrEqualTo?: Maybe<Scalars['DateTime']>;
  equalTo?: Maybe<Scalars['DateTime']>;
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

export type DeleteInboundShipmentLineResponse =
  | DeleteInboundShipmentLineError
  | DeleteResponse;

export type DeleteInboundShipmentLineResponseWithId = {
  __typename?: 'DeleteInboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: DeleteInboundShipmentLineResponse;
};

export type DeleteInboundShipmentResponse =
  | DeleteInboundShipmentError
  | DeleteResponse;

export type DeleteInboundShipmentResponseWithId = {
  __typename?: 'DeleteInboundShipmentResponseWithId';
  id: Scalars['String'];
  response: DeleteInboundShipmentResponse;
};

export type DeleteOutboundShipmentError = {
  __typename?: 'DeleteOutboundShipmentError';
  error: DeleteOutboundShipmentErrorInterface;
};

export type DeleteOutboundShipmentErrorInterface = {
  description: Scalars['String'];
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

export type DeleteOutboundShipmentLineResponse =
  | DeleteOutboundShipmentLineError
  | DeleteResponse;

export type DeleteOutboundShipmentLineResponseWithId = {
  __typename?: 'DeleteOutboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: DeleteOutboundShipmentLineResponse;
};

export type DeleteOutboundShipmentResponse =
  | DeleteOutboundShipmentError
  | DeleteResponse;

export type DeleteOutboundShipmentResponseWithId = {
  __typename?: 'DeleteOutboundShipmentResponseWithId';
  id: Scalars['String'];
  response: DeleteOutboundShipmentResponse;
};

export type DeleteResponse = {
  __typename?: 'DeleteResponse';
  id: Scalars['String'];
};

export type EqualFilterBoolInput = {
  equalTo?: Maybe<Scalars['Boolean']>;
};

export type EqualFilterInvoiceStatusInput = {
  equalTo?: Maybe<InvoiceNodeStatus>;
};

export type EqualFilterInvoiceTypeInput = {
  equalTo?: Maybe<InvoiceNodeType>;
};

export type EqualFilterStringInput = {
  equalTo?: Maybe<Scalars['String']>;
};

export type FinalisedInvoiceIsNotEditableError =
  UpdateOutboundShipmentErrorInterface & {
    __typename?: 'FinalisedInvoiceIsNotEditableError';
    description: Scalars['String'];
  };

export enum ForeignKey {
  InvoiceId = 'INVOICE_ID',
  ItemId = 'ITEM_ID',
  OtherPartyId = 'OTHER_PARTY_ID',
  StockLineId = 'STOCK_LINE_ID',
}

export type ForeignKeyError = DeleteInboundShipmentLineErrorInterface &
  DeleteOutboundShipmentLineErrorInterface &
  InsertInboundShipmentErrorInterface &
  InsertInboundShipmentLineErrorInterface &
  InsertOutboundShipmentErrorInterface &
  InsertOutboundShipmentLineErrorInterface &
  UpdateInboundShipmentErrorInterface &
  UpdateInboundShipmentLineErrorInterface &
  UpdateOutboundShipmentErrorInterface &
  UpdateOutboundShipmentLineErrorInterface & {
    __typename?: 'ForeignKeyError';
    description: Scalars['String'];
    key: ForeignKey;
  };

export type InsertInboundShipmentError = {
  __typename?: 'InsertInboundShipmentError';
  error: InsertInboundShipmentErrorInterface;
};

export type InsertInboundShipmentErrorInterface = {
  description: Scalars['String'];
};

export type InsertInboundShipmentInput = {
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  onHold?: Maybe<Scalars['Boolean']>;
  otherPartyId: Scalars['String'];
  status: InvoiceNodeStatus;
  theirReference?: Maybe<Scalars['String']>;
};

export type InsertInboundShipmentLineError = {
  __typename?: 'InsertInboundShipmentLineError';
  error: InsertInboundShipmentLineErrorInterface;
};

export type InsertInboundShipmentLineErrorInterface = {
  description: Scalars['String'];
};

export type InsertInboundShipmentLineInput = {
  batch?: Maybe<Scalars['String']>;
  costPricePerPack: Scalars['Float'];
  expiryDate?: Maybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId: Scalars['String'];
  numberOfPacks: Scalars['Int'];
  packSize: Scalars['Int'];
  sellPricePerPack: Scalars['Float'];
};

export type InsertInboundShipmentLineResponse =
  | InsertInboundShipmentLineError
  | InvoiceLineNode
  | NodeError;

export type InsertInboundShipmentLineResponseWithId = {
  __typename?: 'InsertInboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: InsertInboundShipmentLineResponse;
};

export type InsertInboundShipmentResponse =
  | InsertInboundShipmentError
  | InvoiceNode
  | NodeError;

export type InsertInboundShipmentResponseWithId = {
  __typename?: 'InsertInboundShipmentResponseWithId';
  id: Scalars['String'];
  response: InsertInboundShipmentResponse;
};

export type InsertOutboundShipmentError = {
  __typename?: 'InsertOutboundShipmentError';
  error: InsertOutboundShipmentErrorInterface;
};

export type InsertOutboundShipmentErrorInterface = {
  description: Scalars['String'];
};

export type InsertOutboundShipmentInput = {
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  onHold?: Maybe<Scalars['Boolean']>;
  otherPartyId: Scalars['String'];
  status?: Maybe<InvoiceNodeStatus>;
  theirReference?: Maybe<Scalars['String']>;
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
};

export type InsertOutboundShipmentLineResponse =
  | InsertOutboundShipmentLineError
  | InvoiceLineNode
  | NodeError;

export type InsertOutboundShipmentLineResponseWithId = {
  __typename?: 'InsertOutboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: InsertOutboundShipmentLineResponse;
};

export type InsertOutboundShipmentResponse =
  | InsertOutboundShipmentError
  | InvoiceNode
  | NodeError;

export type InsertOutboundShipmentResponseWithId = {
  __typename?: 'InsertOutboundShipmentResponseWithId';
  id: Scalars['String'];
  response: InsertOutboundShipmentResponse;
};

export type InvoiceConnector = {
  __typename?: 'InvoiceConnector';
  nodes: Array<InvoiceNode>;
  totalCount: Scalars['Int'];
};

export type InvoiceDoesNotBelongToCurrentStore =
  DeleteInboundShipmentErrorInterface &
    DeleteInboundShipmentLineErrorInterface &
    DeleteOutboundShipmentErrorInterface &
    DeleteOutboundShipmentLineErrorInterface &
    InsertInboundShipmentLineErrorInterface &
    InsertOutboundShipmentLineErrorInterface &
    UpdateInboundShipmentErrorInterface &
    UpdateInboundShipmentLineErrorInterface &
    UpdateOutboundShipmentLineErrorInterface & {
      __typename?: 'InvoiceDoesNotBelongToCurrentStore';
      description: Scalars['String'];
    };

export type InvoiceFilterInput = {
  comment?: Maybe<SimpleStringFilterInput>;
  confirmDatetime?: Maybe<DatetimeFilterInput>;
  entryDatetime?: Maybe<DatetimeFilterInput>;
  finalisedDatetime?: Maybe<DatetimeFilterInput>;
  nameId?: Maybe<SimpleStringFilterInput>;
  otherPartyName?: Maybe<SimpleStringFilterInput>;
  status?: Maybe<SimpleStringFilterInput>;
  storeId?: Maybe<SimpleStringFilterInput>;
  theirReference?: Maybe<SimpleStringFilterInput>;
  type?: Maybe<SimpleStringFilterInput>;
};

export type InvoiceLineBelongsToAnotherInvoice =
  DeleteInboundShipmentLineErrorInterface &
    DeleteOutboundShipmentLineErrorInterface &
    UpdateInboundShipmentLineErrorInterface &
    UpdateOutboundShipmentLineErrorInterface & {
      __typename?: 'InvoiceLineBelongsToAnotherInvoice';
      description: Scalars['String'];
      invoice: InvoiceResponse;
    };

export type InvoiceLineConnector = {
  __typename?: 'InvoiceLineConnector';
  nodes: Array<InvoiceLineNode>;
  totalCount: Scalars['Int'];
};

export type InvoiceLineHasNoStockLineError =
  UpdateOutboundShipmentErrorInterface & {
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
  itemCode: Scalars['String'];
  itemId: Scalars['String'];
  itemName: Scalars['String'];
  itemUnit: Scalars['String'];
  location?: Maybe<LocationResponse>;
  locationDescription?: Maybe<Scalars['String']>;
  note?: Maybe<Scalars['String']>;
  numberOfPacks: Scalars['Int'];
  packSize: Scalars['Int'];
  sellPricePerPack: Scalars['Float'];
  stockLine?: Maybe<StockLineResponse>;
};

export type InvoiceLineResponse = InvoiceLineNode | NodeError;

export type InvoiceLinesResponse = ConnectorError | InvoiceLineConnector;

export type InvoiceNode = {
  __typename?: 'InvoiceNode';
  allocatedDatetime?: Maybe<Scalars['DateTime']>;
  color: Scalars['String'];
  comment?: Maybe<Scalars['String']>;
  confirmedDatetime?: Maybe<Scalars['DateTime']>;
  deliveredDatetime?: Maybe<Scalars['DateTime']>;
  donorName: Scalars['String'];
  draftDatetime?: Maybe<Scalars['DateTime']>;
  enteredByName: Scalars['String'];
  entryDatetime: Scalars['DateTime'];
  finalisedDatetime?: Maybe<Scalars['DateTime']>;
  goodsReceiptNumber?: Maybe<Scalars['Int']>;
  id: Scalars['String'];
  inboundShipmentNumber?: Maybe<Scalars['Int']>;
  invoiceNumber: Scalars['Int'];
  lines: InvoiceLinesResponse;
  onHold: Scalars['Boolean'];
  otherParty: NameResponse;
  otherPartyId: Scalars['String'];
  otherPartyName: Scalars['String'];
  pickedDatetime?: Maybe<Scalars['DateTime']>;
  pricing: InvoicePriceResponse;
  purchaseOrderNumber?: Maybe<Scalars['Int']>;
  requisitionNumber?: Maybe<Scalars['Int']>;
  shippedDatetime?: Maybe<Scalars['DateTime']>;
  shippingMethod?: Maybe<Scalars['String']>;
  status: InvoiceNodeStatus;
  theirReference?: Maybe<Scalars['String']>;
  transportReference?: Maybe<Scalars['String']>;
  type: InvoiceNodeType;
};

export enum InvoiceNodeStatus {
  Allocated = 'ALLOCATED',
  Confirmed = 'CONFIRMED',
  Delivered = 'DELIVERED',
  Draft = 'DRAFT',
  Finalised = 'FINALISED',
  Picked = 'PICKED',
  Shipped = 'SHIPPED',
}

export enum InvoiceNodeType {
  InboundShipment = 'INBOUND_SHIPMENT',
  OutboundShipment = 'OUTBOUND_SHIPMENT',
}

export type InvoicePriceResponse = InvoicePricingNode | NodeError;

export type InvoicePricingNode = {
  __typename?: 'InvoicePricingNode';
  subtotal: Scalars['Float'];
  taxPercentage: Scalars['Float'];
  totalAfterTax: Scalars['Float'];
};

export type InvoiceResponse = InvoiceNode | NodeError;

export enum InvoiceSortFieldInput {
  Comment = 'COMMENT',
  ConfirmDatetime = 'CONFIRM_DATETIME',
  EntryDatetime = 'ENTRY_DATETIME',
  FinalisedDateTime = 'FINALISED_DATE_TIME',
  InvoiceNumber = 'INVOICE_NUMBER',
  OtherPartyName = 'OTHER_PARTY_NAME',
  Status = 'STATUS',
  TotalAfterTax = 'TOTAL_AFTER_TAX',
  Type = 'TYPE',
}

export type InvoiceSortInput = {
  desc?: Maybe<Scalars['Boolean']>;
  key: InvoiceSortFieldInput;
};

export type InvoicesResponse = ConnectorError | InvoiceConnector;

export type ItemConnector = {
  __typename?: 'ItemConnector';
  nodes: Array<ItemNode>;
  totalCount: Scalars['Int'];
};

export type ItemDoesNotMatchStockLine =
  InsertOutboundShipmentLineErrorInterface &
    UpdateOutboundShipmentLineErrorInterface & {
      __typename?: 'ItemDoesNotMatchStockLine';
      description: Scalars['String'];
    };

export type ItemFilterInput = {
  code?: Maybe<SimpleStringFilterInput>;
  isVisible?: Maybe<EqualFilterBoolInput>;
  name?: Maybe<SimpleStringFilterInput>;
};

export type ItemNode = {
  __typename?: 'ItemNode';
  availableBatches: StockLinesResponse;
  availableQuantity: Scalars['Float'];
  code: Scalars['String'];
  id: Scalars['String'];
  isVisible: Scalars['Boolean'];
  name: Scalars['String'];
  unitName: Scalars['String'];
};

export enum ItemSortFieldInput {
  Code = 'CODE',
  Name = 'NAME',
}

export type ItemSortInput = {
  desc?: Maybe<Scalars['Boolean']>;
  key: ItemSortFieldInput;
};

export type ItemsResponse = ConnectorError | ItemConnector;

export type LineDoesNotReferenceStockLine =
  UpdateOutboundShipmentLineErrorInterface & {
    __typename?: 'LineDoesNotReferenceStockLine';
    description: Scalars['String'];
  };

export type LocationNode = {
  __typename?: 'LocationNode';
  code: Scalars['String'];
  description: Scalars['String'];
};

export type LocationResponse = LocationNode | NodeError;

export type Mutations = {
  __typename?: 'Mutations';
  batchInboundShipment: BatchInboundShipmentResponse;
  batchOutboundShipment: BatchOutboundShipmentResponse;
  deleteInboundShipment: DeleteInboundShipmentResponse;
  deleteInboundShipmentLine: DeleteInboundShipmentLineResponse;
  deleteOutboundShipment: DeleteOutboundShipmentResponse;
  deleteOutboundShipmentLine: DeleteOutboundShipmentLineResponse;
  insertInboundShipment: InsertInboundShipmentResponse;
  insertInboundShipmentLine: InsertInboundShipmentLineResponse;
  insertOutboundShipment: InsertOutboundShipmentResponse;
  insertOutboundShipmentLine: InsertOutboundShipmentLineResponse;
  updateInboundShipment: UpdateInboundShipmentResponse;
  updateInboundShipmentLine: UpdateInboundShipmentLineResponse;
  updateOutboundShipment: UpdateOutboundShipmentResponse;
  updateOutboundShipmentLine: UpdateOutboundShipmentLineResponse;
};

export type MutationsBatchInboundShipmentArgs = {
  deleteInboundShipmentLines?: Maybe<Array<DeleteInboundShipmentLineInput>>;
  deleteInboundShipments?: Maybe<Array<DeleteInboundShipmentInput>>;
  insertInboundShipmentLines?: Maybe<Array<InsertInboundShipmentLineInput>>;
  insertInboundShipments?: Maybe<Array<InsertInboundShipmentInput>>;
  updateInboundShipmentLines?: Maybe<Array<UpdateInboundShipmentLineInput>>;
  updateInboundShipments?: Maybe<Array<UpdateInboundShipmentInput>>;
};

export type MutationsBatchOutboundShipmentArgs = {
  deleteOutboundShipmentLines?: Maybe<Array<DeleteOutboundShipmentLineInput>>;
  deleteOutboundShipments?: Maybe<Array<Scalars['String']>>;
  insertOutboundShipmentLines?: Maybe<Array<InsertOutboundShipmentLineInput>>;
  insertOutboundShipments?: Maybe<Array<InsertOutboundShipmentInput>>;
  updateOutboundShipmentLines?: Maybe<Array<UpdateOutboundShipmentLineInput>>;
  updateOutboundShipments?: Maybe<Array<UpdateOutboundShipmentInput>>;
};

export type MutationsDeleteInboundShipmentArgs = {
  input: DeleteInboundShipmentInput;
};

export type MutationsDeleteInboundShipmentLineArgs = {
  input: DeleteInboundShipmentLineInput;
};

export type MutationsDeleteOutboundShipmentArgs = {
  id: Scalars['String'];
};

export type MutationsDeleteOutboundShipmentLineArgs = {
  input: DeleteOutboundShipmentLineInput;
};

export type MutationsInsertInboundShipmentArgs = {
  input: InsertInboundShipmentInput;
};

export type MutationsInsertInboundShipmentLineArgs = {
  input: InsertInboundShipmentLineInput;
};

export type MutationsInsertOutboundShipmentArgs = {
  input: InsertOutboundShipmentInput;
};

export type MutationsInsertOutboundShipmentLineArgs = {
  input: InsertOutboundShipmentLineInput;
};

export type MutationsUpdateInboundShipmentArgs = {
  input: UpdateInboundShipmentInput;
};

export type MutationsUpdateInboundShipmentLineArgs = {
  input: UpdateInboundShipmentLineInput;
};

export type MutationsUpdateOutboundShipmentArgs = {
  input: UpdateOutboundShipmentInput;
};

export type MutationsUpdateOutboundShipmentLineArgs = {
  input: UpdateOutboundShipmentLineInput;
};

export type NameConnector = {
  __typename?: 'NameConnector';
  nodes: Array<NameNode>;
  totalCount: Scalars['Int'];
};

export type NameFilterInput = {
  code?: Maybe<SimpleStringFilterInput>;
  isCustomer?: Maybe<Scalars['Boolean']>;
  isSupplier?: Maybe<Scalars['Boolean']>;
  name?: Maybe<SimpleStringFilterInput>;
};

export type NameNode = {
  __typename?: 'NameNode';
  code: Scalars['String'];
  id: Scalars['String'];
  isCustomer: Scalars['Boolean'];
  isSupplier: Scalars['Boolean'];
  name: Scalars['String'];
};

export type NameResponse = NameNode | NodeError;

export enum NameSortFieldInput {
  Code = 'CODE',
  Name = 'NAME',
}

export type NameSortInput = {
  desc?: Maybe<Scalars['Boolean']>;
  key: NameSortFieldInput;
};

export type NamesResponse = ConnectorError | NameConnector;

export type NodeError = {
  __typename?: 'NodeError';
  error: NodeErrorInterface;
};

export type NodeErrorInterface = {
  description: Scalars['String'];
};

export type NotAnInboundShipment = DeleteInboundShipmentErrorInterface &
  DeleteInboundShipmentLineErrorInterface &
  InsertInboundShipmentLineErrorInterface &
  UpdateInboundShipmentErrorInterface &
  UpdateInboundShipmentLineErrorInterface & {
    __typename?: 'NotAnInboundShipment';
    description: Scalars['String'];
  };

export type NotAnOutboundShipment = DeleteOutboundShipmentErrorInterface &
  DeleteOutboundShipmentLineErrorInterface &
  InsertOutboundShipmentLineErrorInterface &
  UpdateOutboundShipmentLineErrorInterface & {
    __typename?: 'NotAnOutboundShipment';
    description: Scalars['String'];
  };

export type NotAnOutboundShipmentError =
  UpdateOutboundShipmentErrorInterface & {
    __typename?: 'NotAnOutboundShipmentError';
    description: Scalars['String'];
  };

export type NotEnoughStockForReduction =
  InsertOutboundShipmentLineErrorInterface &
    UpdateOutboundShipmentLineErrorInterface & {
      __typename?: 'NotEnoughStockForReduction';
      batch: StockLineResponse;
      description: Scalars['String'];
      line?: Maybe<InvoiceLineResponse>;
    };

export type OtherPartyCannotBeThisStoreError =
  InsertOutboundShipmentErrorInterface &
    UpdateOutboundShipmentErrorInterface & {
      __typename?: 'OtherPartyCannotBeThisStoreError';
      description: Scalars['String'];
    };

export type OtherPartyNotACustomerError = InsertOutboundShipmentErrorInterface &
  UpdateOutboundShipmentErrorInterface & {
    __typename?: 'OtherPartyNotACustomerError';
    description: Scalars['String'];
    otherParty: NameNode;
  };

export type OtherPartyNotASupplier = InsertInboundShipmentErrorInterface &
  UpdateInboundShipmentErrorInterface & {
    __typename?: 'OtherPartyNotASupplier';
    description: Scalars['String'];
    otherParty: NameNode;
  };

export type PaginationError = ConnectorErrorInterface & {
  __typename?: 'PaginationError';
  description: Scalars['String'];
  rangeError: RangeError;
};

export type PaginationInput = {
  first?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
};

export type Queries = {
  __typename?: 'Queries';
  apiVersion: Scalars['String'];
  invoice: InvoiceResponse;
  invoices: InvoicesResponse;
  items: ItemsResponse;
  names: NamesResponse;
};

export type QueriesInvoiceArgs = {
  id: Scalars['String'];
};

export type QueriesInvoicesArgs = {
  filter?: Maybe<InvoiceFilterInput>;
  page?: Maybe<PaginationInput>;
  sort?: Maybe<Array<InvoiceSortInput>>;
};

export type QueriesItemsArgs = {
  filter?: Maybe<ItemFilterInput>;
  page?: Maybe<PaginationInput>;
  sort?: Maybe<Array<ItemSortInput>>;
};

export type QueriesNamesArgs = {
  filter?: Maybe<NameFilterInput>;
  page?: Maybe<PaginationInput>;
  sort?: Maybe<Array<NameSortInput>>;
};

export type RangeError = InsertInboundShipmentLineErrorInterface &
  InsertOutboundShipmentLineErrorInterface &
  UpdateInboundShipmentLineErrorInterface &
  UpdateOutboundShipmentLineErrorInterface & {
    __typename?: 'RangeError';
    description: Scalars['String'];
    field: RangeField;
    max?: Maybe<Scalars['Int']>;
    min?: Maybe<Scalars['Int']>;
  };

export enum RangeField {
  First = 'FIRST',
  NumberOfPacks = 'NUMBER_OF_PACKS',
  PackSize = 'PACK_SIZE',
}

export type RecordAlreadyExist = InsertInboundShipmentErrorInterface &
  InsertInboundShipmentLineErrorInterface &
  InsertOutboundShipmentErrorInterface &
  InsertOutboundShipmentLineErrorInterface & {
    __typename?: 'RecordAlreadyExist';
    description: Scalars['String'];
  };

export type RecordNotFound = DeleteInboundShipmentErrorInterface &
  DeleteInboundShipmentLineErrorInterface &
  DeleteOutboundShipmentErrorInterface &
  DeleteOutboundShipmentLineErrorInterface &
  NodeErrorInterface &
  UpdateInboundShipmentErrorInterface &
  UpdateInboundShipmentLineErrorInterface &
  UpdateOutboundShipmentErrorInterface &
  UpdateOutboundShipmentLineErrorInterface & {
    __typename?: 'RecordNotFound';
    description: Scalars['String'];
  };

export type SimpleStringFilterInput = {
  equalTo?: Maybe<Scalars['String']>;
  like?: Maybe<Scalars['String']>;
};

export type StockLineAlreadyExistsInInvoice =
  InsertOutboundShipmentLineErrorInterface &
    UpdateOutboundShipmentLineErrorInterface & {
      __typename?: 'StockLineAlreadyExistsInInvoice';
      description: Scalars['String'];
      line: InvoiceLineResponse;
    };

export type StockLineConnector = {
  __typename?: 'StockLineConnector';
  nodes: Array<StockLineNode>;
  totalCount: Scalars['Int'];
};

export type StockLineDoesNotBelongToCurrentStore =
  InsertOutboundShipmentLineErrorInterface &
    UpdateOutboundShipmentLineErrorInterface & {
      __typename?: 'StockLineDoesNotBelongToCurrentStore';
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
  locationDescription?: Maybe<Scalars['String']>;
  note?: Maybe<Scalars['String']>;
  onHold: Scalars['Boolean'];
  packSize: Scalars['Int'];
  sellPricePerPack: Scalars['Float'];
  storeId: Scalars['String'];
  totalNumberOfPacks: Scalars['Int'];
};

export type StockLineResponse = NodeError | StockLineNode;

export type StockLinesResponse = ConnectorError | StockLineConnector;

export type UpdateInboundShipmentError = {
  __typename?: 'UpdateInboundShipmentError';
  error: UpdateInboundShipmentErrorInterface;
};

export type UpdateInboundShipmentErrorInterface = {
  description: Scalars['String'];
};

export type UpdateInboundShipmentInput = {
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  onHold?: Maybe<Scalars['Boolean']>;
  otherPartyId?: Maybe<Scalars['String']>;
  status?: Maybe<InvoiceNodeStatus>;
  theirReference?: Maybe<Scalars['String']>;
};

export type UpdateInboundShipmentLineError = {
  __typename?: 'UpdateInboundShipmentLineError';
  error: UpdateInboundShipmentLineErrorInterface;
};

export type UpdateInboundShipmentLineErrorInterface = {
  description: Scalars['String'];
};

export type UpdateInboundShipmentLineInput = {
  batch?: Maybe<Scalars['String']>;
  costPricePerPack?: Maybe<Scalars['Float']>;
  expiryDate?: Maybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId?: Maybe<Scalars['String']>;
  numberOfPacks?: Maybe<Scalars['Int']>;
  packSize?: Maybe<Scalars['Int']>;
  sellPricePerPack?: Maybe<Scalars['Float']>;
};

export type UpdateInboundShipmentLineResponse =
  | InvoiceLineNode
  | NodeError
  | UpdateInboundShipmentLineError;

export type UpdateInboundShipmentLineResponseWithId = {
  __typename?: 'UpdateInboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: UpdateInboundShipmentLineResponse;
};

export type UpdateInboundShipmentResponse =
  | InvoiceNode
  | NodeError
  | UpdateInboundShipmentError;

export type UpdateInboundShipmentResponseWithId = {
  __typename?: 'UpdateInboundShipmentResponseWithId';
  id: Scalars['String'];
  response: UpdateInboundShipmentResponse;
};

export type UpdateOutboundShipmentError = {
  __typename?: 'UpdateOutboundShipmentError';
  error: UpdateOutboundShipmentErrorInterface;
};

export type UpdateOutboundShipmentErrorInterface = {
  description: Scalars['String'];
};

export type UpdateOutboundShipmentInput = {
  color?: Maybe<Scalars['String']>;
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  onHold?: Maybe<Scalars['Boolean']>;
  otherPartyId?: Maybe<Scalars['String']>;
  status?: Maybe<InvoiceNodeStatus>;
  theirReference?: Maybe<Scalars['String']>;
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
  itemId?: Maybe<Scalars['String']>;
  numberOfPacks?: Maybe<Scalars['Int']>;
  stockLineId?: Maybe<Scalars['String']>;
};

export type UpdateOutboundShipmentLineResponse =
  | InvoiceLineNode
  | NodeError
  | UpdateOutboundShipmentLineError;

export type UpdateOutboundShipmentLineResponseWithId = {
  __typename?: 'UpdateOutboundShipmentLineResponseWithId';
  id: Scalars['String'];
  response: UpdateOutboundShipmentLineResponse;
};

export type UpdateOutboundShipmentResponse =
  | InvoiceNode
  | NodeError
  | UpdateOutboundShipmentError;

export type UpdateOutboundShipmentResponseWithId = {
  __typename?: 'UpdateOutboundShipmentResponseWithId';
  id: Scalars['String'];
  response: UpdateOutboundShipmentResponse;
};

export type InvoiceQueryVariables = Exact<{
  id: Scalars['String'];
}>;

export type InvoiceQuery = {
  __typename?: 'Queries';
  invoice:
    | {
        __typename: 'InvoiceNode';
        id: string;
        comment?: string | null | undefined;
        confirmedDatetime?: any | null | undefined;
        entryDatetime: any;
        finalisedDatetime?: any | null | undefined;
        invoiceNumber: number;
        draftDatetime?: any | null | undefined;
        allocatedDatetime?: any | null | undefined;
        pickedDatetime?: any | null | undefined;
        shippedDatetime?: any | null | undefined;
        deliveredDatetime?: any | null | undefined;
        enteredByName: string;
        requisitionNumber?: number | null | undefined;
        purchaseOrderNumber?: number | null | undefined;
        inboundShipmentNumber?: number | null | undefined;
        goodsReceiptNumber?: number | null | undefined;
        onHold: boolean;
        color: string;
        otherPartyId: string;
        otherPartyName: string;
        status: InvoiceNodeStatus;
        theirReference?: string | null | undefined;
        type: InvoiceNodeType;
        otherParty:
          | {
              __typename: 'NameNode';
              id: string;
              name: string;
              code: string;
              isCustomer: boolean;
              isSupplier: boolean;
            }
          | {
              __typename: 'NodeError';
              error:
                | {
                    __typename: 'DatabaseError';
                    description: string;
                    fullError: string;
                  }
                | { __typename: 'RecordNotFound'; description: string };
            };
        lines:
          | {
              __typename: 'ConnectorError';
              error:
                | {
                    __typename: 'DatabaseError';
                    description: string;
                    fullError: string;
                  }
                | { __typename?: 'PaginationError'; description: string };
            }
          | {
              __typename: 'InvoiceLineConnector';
              totalCount: number;
              nodes: Array<{
                __typename: 'InvoiceLineNode';
                batch?: string | null | undefined;
                costPricePerPack: number;
                expiryDate?: any | null | undefined;
                id: string;
                itemCode: string;
                itemUnit: string;
                itemId: string;
                itemName: string;
                numberOfPacks: number;
                packSize: number;
                locationDescription?: string | null | undefined;
                sellPricePerPack: number;
              }>;
            };
        pricing:
          | {
              __typename: 'InvoicePricingNode';
              totalAfterTax: number;
              subtotal: number;
              taxPercentage: number;
            }
          | {
              __typename: 'NodeError';
              error:
                | {
                    __typename: 'DatabaseError';
                    description: string;
                    fullError: string;
                  }
                | { __typename: 'RecordNotFound'; description: string };
            };
      }
    | {
        __typename: 'NodeError';
        error:
          | {
              __typename: 'DatabaseError';
              description: string;
              fullError: string;
            }
          | { __typename: 'RecordNotFound'; description: string };
      };
};

export type InvoicesQueryVariables = Exact<{
  first?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  key: InvoiceSortFieldInput;
  desc?: Maybe<Scalars['Boolean']>;
  filter?: Maybe<InvoiceFilterInput>;
}>;

export type InvoicesQuery = {
  __typename?: 'Queries';
  invoices:
    | {
        __typename: 'ConnectorError';
        error:
          | {
              __typename: 'DatabaseError';
              description: string;
              fullError: string;
            }
          | {
              __typename: 'PaginationError';
              description: string;
              rangeError: {
                __typename?: 'RangeError';
                description: string;
                field: RangeField;
                max?: number | null | undefined;
                min?: number | null | undefined;
              };
            };
      }
    | {
        __typename: 'InvoiceConnector';
        totalCount: number;
        nodes: Array<{
          __typename?: 'InvoiceNode';
          comment?: string | null | undefined;
          confirmedDatetime?: any | null | undefined;
          entryDatetime: any;
          id: string;
          invoiceNumber: number;
          otherPartyId: string;
          otherPartyName: string;
          status: InvoiceNodeStatus;
          color: string;
          theirReference?: string | null | undefined;
          type: InvoiceNodeType;
          pricing:
            | {
                __typename: 'InvoicePricingNode';
                totalAfterTax: number;
                subtotal: number;
                taxPercentage: number;
              }
            | {
                __typename: 'NodeError';
                error:
                  | {
                      __typename: 'DatabaseError';
                      description: string;
                      fullError: string;
                    }
                  | { __typename: 'RecordNotFound'; description: string };
              };
        }>;
      };
};

export type NamesQueryVariables = Exact<{
  key: NameSortFieldInput;
  desc?: Maybe<Scalars['Boolean']>;
  first?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
}>;

export type NamesQuery = {
  __typename?: 'Queries';
  names:
    | {
        __typename: 'ConnectorError';
        error:
          | {
              __typename: 'DatabaseError';
              description: string;
              fullError: string;
            }
          | {
              __typename: 'PaginationError';
              description: string;
              rangeError: {
                __typename?: 'RangeError';
                description: string;
                field: RangeField;
                max?: number | null | undefined;
                min?: number | null | undefined;
              };
            };
      }
    | {
        __typename: 'NameConnector';
        totalCount: number;
        nodes: Array<{
          __typename?: 'NameNode';
          code: string;
          id: string;
          isCustomer: boolean;
          isSupplier: boolean;
          name: string;
        }>;
      };
};

export type ItemsWithStockLinesQueryVariables = Exact<{
  first?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  key: ItemSortFieldInput;
  desc?: Maybe<Scalars['Boolean']>;
}>;

export type ItemsWithStockLinesQuery = {
  __typename?: 'Queries';
  items:
    | {
        __typename: 'ConnectorError';
        error:
          | {
              __typename: 'DatabaseError';
              description: string;
              fullError: string;
            }
          | {
              __typename: 'PaginationError';
              description: string;
              rangeError: {
                __typename?: 'RangeError';
                description: string;
                field: RangeField;
                max?: number | null | undefined;
                min?: number | null | undefined;
              };
            };
      }
    | {
        __typename: 'ItemConnector';
        totalCount: number;
        nodes: Array<{
          __typename: 'ItemNode';
          availableQuantity: number;
          code: string;
          id: string;
          isVisible: boolean;
          name: string;
          unitName: string;
          availableBatches:
            | {
                __typename: 'ConnectorError';
                error:
                  | {
                      __typename: 'DatabaseError';
                      description: string;
                      fullError: string;
                    }
                  | {
                      __typename: 'PaginationError';
                      description: string;
                      rangeError: {
                        __typename?: 'RangeError';
                        description: string;
                        field: RangeField;
                        max?: number | null | undefined;
                        min?: number | null | undefined;
                      };
                    };
              }
            | {
                __typename: 'StockLineConnector';
                totalCount: number;
                nodes: Array<{
                  __typename: 'StockLineNode';
                  availableNumberOfPacks: number;
                  batch?: string | null | undefined;
                  costPricePerPack: number;
                  expiryDate?: any | null | undefined;
                  id: string;
                  itemId: string;
                  packSize: number;
                  sellPricePerPack: number;
                  storeId: string;
                  totalNumberOfPacks: number;
                  onHold: boolean;
                }>;
              };
        }>;
      };
};

export type ItemsListViewQueryVariables = Exact<{
  first?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  key: ItemSortFieldInput;
  desc?: Maybe<Scalars['Boolean']>;
}>;

export type ItemsListViewQuery = {
  __typename?: 'Queries';
  items:
    | {
        __typename: 'ConnectorError';
        error:
          | {
              __typename: 'DatabaseError';
              description: string;
              fullError: string;
            }
          | {
              __typename: 'PaginationError';
              description: string;
              rangeError: {
                __typename?: 'RangeError';
                description: string;
                field: RangeField;
                max?: number | null | undefined;
                min?: number | null | undefined;
              };
            };
      }
    | {
        __typename: 'ItemConnector';
        totalCount: number;
        nodes: Array<{
          __typename: 'ItemNode';
          availableQuantity: number;
          code: string;
          id: string;
          isVisible: boolean;
          name: string;
          unitName: string;
        }>;
      };
};

export type InsertOutboundShipmentMutationVariables = Exact<{
  id: Scalars['String'];
  otherPartyId: Scalars['String'];
}>;

export type InsertOutboundShipmentMutation = {
  __typename?: 'Mutations';
  insertOutboundShipment:
    | {
        __typename: 'InsertOutboundShipmentError';
        error:
          | {
              __typename: 'DatabaseError';
              description: string;
              fullError: string;
            }
          | {
              __typename: 'ForeignKeyError';
              description: string;
              key: ForeignKey;
            }
          | {
              __typename: 'OtherPartyCannotBeThisStoreError';
              description: string;
            }
          | {
              __typename: 'OtherPartyNotACustomerError';
              description: string;
              otherParty: {
                __typename?: 'NameNode';
                code: string;
                id: string;
                isCustomer: boolean;
                isSupplier: boolean;
                name: string;
              };
            }
          | { __typename: 'RecordAlreadyExist'; description: string };
      }
    | { __typename: 'InvoiceNode'; id: string }
    | {
        __typename: 'NodeError';
        error:
          | {
              __typename: 'DatabaseError';
              description: string;
              fullError: string;
            }
          | { __typename: 'RecordNotFound'; description: string };
      };
};

export type UpdateOutboundShipmentMutationVariables = Exact<{
  input: UpdateOutboundShipmentInput;
}>;

export type UpdateOutboundShipmentMutation = {
  __typename?: 'Mutations';
  updateOutboundShipment:
    | { __typename: 'InvoiceNode'; id: string }
    | {
        __typename: 'NodeError';
        error:
          | {
              __typename: 'DatabaseError';
              description: string;
              fullError: string;
            }
          | { __typename: 'RecordNotFound'; description: string };
      }
    | {
        __typename: 'UpdateOutboundShipmentError';
        error:
          | {
              __typename?: 'CanOnlyEditInvoicesInLoggedInStoreError';
              description: string;
            }
          | {
              __typename?: 'CannotChangeStatusBackToDraftError';
              description: string;
            }
          | {
              __typename?: 'CannotChangeStatusOfInvoiceOnHold';
              description: string;
            }
          | { __typename?: 'DatabaseError'; description: string }
          | {
              __typename?: 'FinalisedInvoiceIsNotEditableError';
              description: string;
            }
          | { __typename?: 'ForeignKeyError'; description: string }
          | {
              __typename?: 'InvoiceLineHasNoStockLineError';
              description: string;
            }
          | { __typename?: 'NotAnOutboundShipmentError'; description: string }
          | {
              __typename?: 'OtherPartyCannotBeThisStoreError';
              description: string;
            }
          | { __typename?: 'OtherPartyNotACustomerError'; description: string }
          | { __typename?: 'RecordNotFound'; description: string };
      };
};

export type DeleteOutboundShipmentsMutationVariables = Exact<{
  ids?: Maybe<Array<Scalars['String']> | Scalars['String']>;
}>;

export type DeleteOutboundShipmentsMutation = {
  __typename?: 'Mutations';
  batchOutboundShipment: {
    __typename: 'BatchOutboundShipmentResponse';
    deleteOutboundShipments?:
      | Array<{
          __typename: 'DeleteOutboundShipmentResponseWithId';
          id: string;
        }>
      | null
      | undefined;
  };
};

export const InvoiceDocument = gql`
  query invoice($id: String!) {
    invoice(id: $id) {
      __typename
      ... on NodeError {
        __typename
        error {
          description
          ... on DatabaseError {
            __typename
            description
            fullError
          }
          ... on RecordNotFound {
            __typename
            description
          }
        }
      }
      ... on InvoiceNode {
        __typename
        id
        comment
        confirmedDatetime
        entryDatetime
        finalisedDatetime
        invoiceNumber
        draftDatetime
        allocatedDatetime
        pickedDatetime
        shippedDatetime
        deliveredDatetime
        enteredByName
        requisitionNumber
        purchaseOrderNumber
        inboundShipmentNumber
        goodsReceiptNumber
        onHold
        color
        otherParty {
          __typename
          ... on NameNode {
            __typename
            id
            name
            code
            isCustomer
            isSupplier
          }
          ... on NodeError {
            __typename
            error {
              description
              ... on DatabaseError {
                __typename
                description
                fullError
              }
              ... on RecordNotFound {
                __typename
                description
              }
            }
          }
        }
        lines {
          ... on ConnectorError {
            __typename
            error {
              description
              ... on DatabaseError {
                __typename
                description
                fullError
              }
            }
          }
          ... on InvoiceLineConnector {
            __typename
            nodes {
              __typename
              batch
              costPricePerPack
              expiryDate
              id
              itemCode
              itemUnit
              itemId
              itemName
              numberOfPacks
              packSize
              locationDescription
              sellPricePerPack
            }
            totalCount
          }
        }
        otherPartyId
        otherPartyName
        pricing {
          __typename
          ... on NodeError {
            __typename
            error {
              description
              ... on DatabaseError {
                __typename
                description
                fullError
              }
              ... on RecordNotFound {
                __typename
                description
              }
            }
          }
          ... on InvoicePricingNode {
            __typename
            totalAfterTax
            subtotal
            taxPercentage
          }
        }
        status
        theirReference
        type
      }
    }
  }
`;
export const InvoicesDocument = gql`
  query invoices(
    $first: Int
    $offset: Int
    $key: InvoiceSortFieldInput!
    $desc: Boolean
    $filter: InvoiceFilterInput
  ) {
    invoices(
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
    ) {
      ... on ConnectorError {
        __typename
        error {
          description
          ... on DatabaseError {
            __typename
            description
            fullError
          }
          ... on PaginationError {
            __typename
            description
            rangeError {
              description
              field
              max
              min
            }
          }
        }
      }
      ... on InvoiceConnector {
        __typename
        nodes {
          comment
          confirmedDatetime
          entryDatetime
          id
          invoiceNumber
          otherPartyId
          otherPartyName
          status
          color
          theirReference
          type
          pricing {
            __typename
            ... on NodeError {
              __typename
              error {
                ... on RecordNotFound {
                  __typename
                  description
                }
                ... on DatabaseError {
                  __typename
                  description
                  fullError
                }
                description
              }
            }
            ... on InvoicePricingNode {
              __typename
              totalAfterTax
              subtotal
              taxPercentage
            }
          }
        }
        totalCount
      }
    }
  }
`;
export const NamesDocument = gql`
  query names(
    $key: NameSortFieldInput!
    $desc: Boolean
    $first: Int
    $offset: Int
  ) {
    names(
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: { isCustomer: true }
    ) {
      ... on ConnectorError {
        __typename
        error {
          ... on DatabaseError {
            __typename
            description
            fullError
          }
          description
          ... on PaginationError {
            __typename
            description
            rangeError {
              description
              field
              max
              min
            }
          }
        }
      }
      ... on NameConnector {
        __typename
        nodes {
          code
          id
          isCustomer
          isSupplier
          name
        }
        totalCount
      }
    }
  }
`;
export const ItemsWithStockLinesDocument = gql`
  query itemsWithStockLines(
    $first: Int
    $offset: Int
    $key: ItemSortFieldInput!
    $desc: Boolean
  ) {
    items(
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
    ) {
      ... on ConnectorError {
        __typename
        error {
          description
          ... on DatabaseError {
            __typename
            description
            fullError
          }
          ... on PaginationError {
            __typename
            description
            rangeError {
              description
              field
              max
              min
            }
          }
        }
      }
      ... on ItemConnector {
        __typename
        nodes {
          __typename
          availableQuantity
          availableBatches {
            __typename
            ... on ConnectorError {
              __typename
              error {
                description
                ... on DatabaseError {
                  __typename
                  description
                  fullError
                }
                ... on PaginationError {
                  __typename
                  description
                  rangeError {
                    description
                    field
                    max
                    min
                  }
                }
              }
            }
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
                storeId
                totalNumberOfPacks
                onHold
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
export const ItemsListViewDocument = gql`
  query itemsListView(
    $first: Int
    $offset: Int
    $key: ItemSortFieldInput!
    $desc: Boolean
  ) {
    items(
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
    ) {
      ... on ConnectorError {
        __typename
        error {
          description
          ... on DatabaseError {
            __typename
            description
            fullError
          }
          ... on PaginationError {
            __typename
            description
            rangeError {
              description
              field
              max
              min
            }
          }
        }
      }
      ... on ItemConnector {
        __typename
        nodes {
          __typename
          availableQuantity
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
export const InsertOutboundShipmentDocument = gql`
  mutation insertOutboundShipment($id: String!, $otherPartyId: String!) {
    insertOutboundShipment(input: { id: $id, otherPartyId: $otherPartyId }) {
      __typename
      ... on InvoiceNode {
        id
      }
      ... on InsertOutboundShipmentError {
        __typename
        error {
          description
          ... on DatabaseError {
            __typename
            description
            fullError
          }
          ... on ForeignKeyError {
            __typename
            description
            key
          }
          ... on OtherPartyCannotBeThisStoreError {
            __typename
            description
          }
          ... on OtherPartyNotACustomerError {
            __typename
            description
            otherParty {
              code
              id
              isCustomer
              isSupplier
              name
            }
          }
          ... on RecordAlreadyExist {
            __typename
            description
          }
        }
      }
      ... on NodeError {
        __typename
        error {
          description
          ... on DatabaseError {
            __typename
            description
            fullError
          }
          ... on RecordNotFound {
            __typename
            description
          }
        }
      }
    }
  }
`;
export const UpdateOutboundShipmentDocument = gql`
  mutation updateOutboundShipment($input: UpdateOutboundShipmentInput!) {
    updateOutboundShipment(input: $input) {
      ... on InvoiceNode {
        __typename
        id
      }
      ... on NodeError {
        __typename
        error {
          description
          ... on DatabaseError {
            __typename
            description
            fullError
          }
          ... on RecordNotFound {
            __typename
            description
          }
        }
      }
      ... on UpdateOutboundShipmentError {
        __typename
        error {
          description
        }
      }
    }
  }
`;
export const DeleteOutboundShipmentsDocument = gql`
  mutation deleteOutboundShipments($ids: [String!]) {
    batchOutboundShipment(deleteOutboundShipments: $ids) {
      __typename
      deleteOutboundShipments {
        __typename
        id
      }
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    invoice(
      variables: InvoiceQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<InvoiceQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InvoiceQuery>(InvoiceDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'invoice'
      );
    },
    invoices(
      variables: InvoicesQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<InvoicesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InvoicesQuery>(InvoicesDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'invoices'
      );
    },
    names(
      variables: NamesQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<NamesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<NamesQuery>(NamesDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'names'
      );
    },
    itemsWithStockLines(
      variables: ItemsWithStockLinesQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<ItemsWithStockLinesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemsWithStockLinesQuery>(
            ItemsWithStockLinesDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'itemsWithStockLines'
      );
    },
    itemsListView(
      variables: ItemsListViewQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<ItemsListViewQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemsListViewQuery>(ItemsListViewDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'itemsListView'
      );
    },
    insertOutboundShipment(
      variables: InsertOutboundShipmentMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<InsertOutboundShipmentMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertOutboundShipmentMutation>(
            InsertOutboundShipmentDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertOutboundShipment'
      );
    },
    updateOutboundShipment(
      variables: UpdateOutboundShipmentMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<UpdateOutboundShipmentMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateOutboundShipmentMutation>(
            UpdateOutboundShipmentDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateOutboundShipment'
      );
    },
    deleteOutboundShipments(
      variables?: DeleteOutboundShipmentsMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<DeleteOutboundShipmentsMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteOutboundShipmentsMutation>(
            DeleteOutboundShipmentsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deleteOutboundShipments'
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
