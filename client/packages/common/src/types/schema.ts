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

export type BatchIsReserved = DeleteSupplierInvoiceLineErrorInterface &
  UpdateSupplierInvoiceLineErrorInterface & {
    __typename?: 'BatchIsReserved';
    description: Scalars['String'];
  };

export type CanOnlyEditInvoicesInLoggedInStoreError =
  UpdateCustomerInvoiceErrorInterface & {
    __typename?: 'CanOnlyEditInvoicesInLoggedInStoreError';
    description: Scalars['String'];
  };

export type CannotChangeInvoiceBackToDraft =
  UpdateSupplierInvoiceErrorInterface & {
    __typename?: 'CannotChangeInvoiceBackToDraft';
    description: Scalars['String'];
  };

export type CannotChangeStatusBackToDraftError =
  UpdateCustomerInvoiceErrorInterface & {
    __typename?: 'CannotChangeStatusBackToDraftError';
    description: Scalars['String'];
  };

export type CannotDeleteInvoiceWithLines = DeleteCustomerInvoiceErrorInterface &
  DeleteSupplierInvoiceErrorInterface & {
    __typename?: 'CannotDeleteInvoiceWithLines';
    description: Scalars['String'];
    lines: InvoiceLineConnector;
  };

export type CannotEditFinalisedInvoice = DeleteCustomerInvoiceErrorInterface &
  DeleteCustomerInvoiceLineErrorInterface &
  DeleteSupplierInvoiceErrorInterface &
  DeleteSupplierInvoiceLineErrorInterface &
  InsertCustomerInvoiceLineErrorInterface &
  InsertSupplierInvoiceLineErrorInterface &
  UpdateCustomerInvoiceLineErrorInterface &
  UpdateSupplierInvoiceErrorInterface &
  UpdateSupplierInvoiceLineErrorInterface & {
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
  DeleteCustomerInvoiceErrorInterface &
  DeleteCustomerInvoiceLineErrorInterface &
  DeleteSupplierInvoiceErrorInterface &
  DeleteSupplierInvoiceLineErrorInterface &
  InsertCustomerInvoiceErrorInterface &
  InsertCustomerInvoiceLineErrorInterface &
  InsertSupplierInvoiceErrorInterface &
  InsertSupplierInvoiceLineErrorInterface &
  NodeErrorInterface &
  UpdateCustomerInvoiceErrorInterface &
  UpdateCustomerInvoiceLineErrorInterface &
  UpdateSupplierInvoiceErrorInterface &
  UpdateSupplierInvoiceLineErrorInterface & {
    __typename?: 'DatabaseError';
    description: Scalars['String'];
    fullError: Scalars['String'];
  };

export type DatetimeFilterInput = {
  afterOrEqualTo?: Maybe<Scalars['DateTime']>;
  beforeOrEqualTo?: Maybe<Scalars['DateTime']>;
  equalTo?: Maybe<Scalars['DateTime']>;
};

export type DeleteCustomerInvoiceError = {
  __typename?: 'DeleteCustomerInvoiceError';
  error: DeleteCustomerInvoiceErrorInterface;
};

export type DeleteCustomerInvoiceErrorInterface = {
  description: Scalars['String'];
};

export type DeleteCustomerInvoiceLineError = {
  __typename?: 'DeleteCustomerInvoiceLineError';
  error: DeleteCustomerInvoiceLineErrorInterface;
};

export type DeleteCustomerInvoiceLineErrorInterface = {
  description: Scalars['String'];
};

export type DeleteCustomerInvoiceLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
};

export type DeleteCustomerInvoiceLineResponse =
  | DeleteCustomerInvoiceLineError
  | DeleteResponse;

export type DeleteCustomerInvoiceResponse =
  | DeleteCustomerInvoiceError
  | DeleteResponse;

export type DeleteResponse = {
  __typename?: 'DeleteResponse';
  id: Scalars['String'];
};

export type DeleteSupplierInvoiceError = {
  __typename?: 'DeleteSupplierInvoiceError';
  error: DeleteSupplierInvoiceErrorInterface;
};

export type DeleteSupplierInvoiceErrorInterface = {
  description: Scalars['String'];
};

export type DeleteSupplierInvoiceInput = {
  id: Scalars['String'];
};

export type DeleteSupplierInvoiceLineError = {
  __typename?: 'DeleteSupplierInvoiceLineError';
  error: DeleteSupplierInvoiceLineErrorInterface;
};

export type DeleteSupplierInvoiceLineErrorInterface = {
  description: Scalars['String'];
};

export type DeleteSupplierInvoiceLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
};

export type DeleteSupplierInvoiceLineResponse =
  | DeleteResponse
  | DeleteSupplierInvoiceLineError;

export type DeleteSupplierInvoiceResponse =
  | DeleteResponse
  | DeleteSupplierInvoiceError;

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
  UpdateCustomerInvoiceErrorInterface & {
    __typename?: 'FinalisedInvoiceIsNotEditableError';
    description: Scalars['String'];
  };

export enum ForeignKey {
  InvoiceId = 'INVOICE_ID',
  ItemId = 'ITEM_ID',
  OtherPartyId = 'OTHER_PARTY_ID',
  StockLineId = 'STOCK_LINE_ID',
}

export type ForeignKeyError = DeleteCustomerInvoiceLineErrorInterface &
  DeleteSupplierInvoiceLineErrorInterface &
  InsertCustomerInvoiceErrorInterface &
  InsertCustomerInvoiceLineErrorInterface &
  InsertSupplierInvoiceErrorInterface &
  InsertSupplierInvoiceLineErrorInterface &
  UpdateCustomerInvoiceErrorInterface &
  UpdateCustomerInvoiceLineErrorInterface &
  UpdateSupplierInvoiceErrorInterface &
  UpdateSupplierInvoiceLineErrorInterface & {
    __typename?: 'ForeignKeyError';
    description: Scalars['String'];
    key: ForeignKey;
  };

export type InsertCustomerInvoiceError = {
  __typename?: 'InsertCustomerInvoiceError';
  error: InsertCustomerInvoiceErrorInterface;
};

export type InsertCustomerInvoiceErrorInterface = {
  description: Scalars['String'];
};

export type InsertCustomerInvoiceInput = {
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  otherPartyId: Scalars['String'];
  status?: Maybe<InvoiceNodeStatus>;
  theirReference?: Maybe<Scalars['String']>;
};

export type InsertCustomerInvoiceLineError = {
  __typename?: 'InsertCustomerInvoiceLineError';
  error: InsertCustomerInvoiceLineErrorInterface;
};

export type InsertCustomerInvoiceLineErrorInterface = {
  description: Scalars['String'];
};

export type InsertCustomerInvoiceLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId: Scalars['String'];
  numberOfPacks: Scalars['Int'];
  stockLineId: Scalars['String'];
};

export type InsertCustomerInvoiceLineResponse =
  | InsertCustomerInvoiceLineError
  | InvoiceLineNode
  | NodeError;

export type InsertCustomerInvoiceResponse =
  | InsertCustomerInvoiceError
  | InvoiceNode
  | NodeError;

export type InsertSupplierInvoiceError = {
  __typename?: 'InsertSupplierInvoiceError';
  error: InsertSupplierInvoiceErrorInterface;
};

export type InsertSupplierInvoiceErrorInterface = {
  description: Scalars['String'];
};

export type InsertSupplierInvoiceInput = {
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  otherPartyId: Scalars['String'];
  status: InvoiceNodeStatus;
  theirReference?: Maybe<Scalars['String']>;
};

export type InsertSupplierInvoiceLineError = {
  __typename?: 'InsertSupplierInvoiceLineError';
  error: InsertSupplierInvoiceLineErrorInterface;
};

export type InsertSupplierInvoiceLineErrorInterface = {
  description: Scalars['String'];
};

export type InsertSupplierInvoiceLineInput = {
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

export type InsertSupplierInvoiceLineResponse =
  | InsertSupplierInvoiceLineError
  | InvoiceLineNode
  | NodeError;

export type InsertSupplierInvoiceResponse =
  | InsertSupplierInvoiceError
  | InvoiceNode
  | NodeError;

export type InvoiceConnector = {
  __typename?: 'InvoiceConnector';
  nodes: Array<InvoiceNode>;
  totalCount: Scalars['Int'];
};

export type InvoiceDoesNotBelongToCurrentStore =
  DeleteCustomerInvoiceErrorInterface &
    DeleteCustomerInvoiceLineErrorInterface &
    DeleteSupplierInvoiceErrorInterface &
    DeleteSupplierInvoiceLineErrorInterface &
    InsertCustomerInvoiceLineErrorInterface &
    InsertSupplierInvoiceLineErrorInterface &
    UpdateCustomerInvoiceLineErrorInterface &
    UpdateSupplierInvoiceErrorInterface &
    UpdateSupplierInvoiceLineErrorInterface & {
      __typename?: 'InvoiceDoesNotBelongToCurrentStore';
      description: Scalars['String'];
    };

export type InvoiceFilterInput = {
  comment?: Maybe<SimpleStringFilterInput>;
  confirmDatetime?: Maybe<DatetimeFilterInput>;
  entryDatetime?: Maybe<DatetimeFilterInput>;
  finalisedDatetime?: Maybe<DatetimeFilterInput>;
  nameId?: Maybe<EqualFilterStringInput>;
  status?: Maybe<EqualFilterInvoiceStatusInput>;
  storeId?: Maybe<EqualFilterStringInput>;
  theirReference?: Maybe<EqualFilterStringInput>;
  type?: Maybe<EqualFilterInvoiceTypeInput>;
};

export type InvoiceLineBelongsToAnotherInvoice =
  DeleteCustomerInvoiceLineErrorInterface &
    DeleteSupplierInvoiceLineErrorInterface &
    UpdateCustomerInvoiceLineErrorInterface &
    UpdateSupplierInvoiceLineErrorInterface & {
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
  UpdateCustomerInvoiceErrorInterface & {
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
  location?: Maybe<Scalars['String']>;
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
  draftDatetime?: Maybe<Scalars['DateTime']>;
  entryDatetime: Scalars['DateTime'];
  finalisedDatetime?: Maybe<Scalars['DateTime']>;
  hold: Scalars['Boolean'];
  id: Scalars['String'];
  invoiceNumber: Scalars['Int'];
  lines: InvoiceLinesResponse;
  otherPartyId: Scalars['String'];
  otherPartyName: Scalars['String'];
  pickedDatetime?: Maybe<Scalars['DateTime']>;
  pricing: InvoicePriceResponse;
  shippedDatetime?: Maybe<Scalars['DateTime']>;
  status: InvoiceNodeStatus;
  theirReference?: Maybe<Scalars['String']>;
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
  CustomerInvoice = 'CUSTOMER_INVOICE',
  SupplierInvoice = 'SUPPLIER_INVOICE',
}

export type InvoicePriceResponse = InvoicePricingNode | NodeError;

export type InvoicePricingNode = {
  __typename?: 'InvoicePricingNode';
  totalAfterTax: Scalars['Float'];
};

export type InvoiceResponse = InvoiceNode | NodeError;

export enum InvoiceSortFieldInput {
  ConfirmDatetime = 'CONFIRM_DATETIME',
  EntryDatetime = 'ENTRY_DATETIME',
  FinalisedDateTime = 'FINALISED_DATE_TIME',
  Status = 'STATUS',
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
  InsertCustomerInvoiceLineErrorInterface &
    UpdateCustomerInvoiceLineErrorInterface & {
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
  code: Scalars['String'];
  id: Scalars['String'];
  isVisible: Scalars['Boolean'];
  name: Scalars['String'];
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
  UpdateCustomerInvoiceLineErrorInterface & {
    __typename?: 'LineDoesNotReferenceStockLine';
    description: Scalars['String'];
  };

export type Mutations = {
  __typename?: 'Mutations';
  deleteCustomerInvoice: DeleteCustomerInvoiceResponse;
  deleteCustomerInvoiceLine: DeleteCustomerInvoiceLineResponse;
  deleteSupplierInvoice: DeleteSupplierInvoiceResponse;
  deleteSupplierInvoiceLine: DeleteSupplierInvoiceLineResponse;
  insertCustomerInvoice: InsertCustomerInvoiceResponse;
  insertCustomerInvoiceLine: InsertCustomerInvoiceLineResponse;
  insertSupplierInvoice: InsertSupplierInvoiceResponse;
  insertSupplierInvoiceLine: InsertSupplierInvoiceLineResponse;
  updateCustomerInvoice: UpdateCustomerInvoiceResponse;
  updateCustomerInvoiceLine: UpdateCustomerInvoiceLineResponse;
  updateSupplierInvoice: UpdateSupplierInvoiceResponse;
  updateSupplierInvoiceLine: UpdateSupplierInvoiceLineResponse;
};

export type MutationsDeleteCustomerInvoiceArgs = {
  id: Scalars['String'];
};

export type MutationsDeleteCustomerInvoiceLineArgs = {
  input: DeleteCustomerInvoiceLineInput;
};

export type MutationsDeleteSupplierInvoiceArgs = {
  input: DeleteSupplierInvoiceInput;
};

export type MutationsDeleteSupplierInvoiceLineArgs = {
  input: DeleteSupplierInvoiceLineInput;
};

export type MutationsInsertCustomerInvoiceArgs = {
  input: InsertCustomerInvoiceInput;
};

export type MutationsInsertCustomerInvoiceLineArgs = {
  input: InsertCustomerInvoiceLineInput;
};

export type MutationsInsertSupplierInvoiceArgs = {
  input: InsertSupplierInvoiceInput;
};

export type MutationsInsertSupplierInvoiceLineArgs = {
  input: InsertSupplierInvoiceLineInput;
};

export type MutationsUpdateCustomerInvoiceArgs = {
  input: UpdateCustomerInvoiceInput;
};

export type MutationsUpdateCustomerInvoiceLineArgs = {
  input: UpdateCustomerInvoiceLineInput;
};

export type MutationsUpdateSupplierInvoiceArgs = {
  input: UpdateSupplierInvoiceInput;
};

export type MutationsUpdateSupplierInvoiceLineArgs = {
  input: UpdateSupplierInvoiceLineInput;
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

export type NotACustomerInvoice = DeleteCustomerInvoiceErrorInterface &
  DeleteCustomerInvoiceLineErrorInterface &
  InsertCustomerInvoiceLineErrorInterface &
  UpdateCustomerInvoiceLineErrorInterface & {
    __typename?: 'NotACustomerInvoice';
    description: Scalars['String'];
  };

export type NotACustomerInvoiceError = UpdateCustomerInvoiceErrorInterface & {
  __typename?: 'NotACustomerInvoiceError';
  description: Scalars['String'];
};

export type NotASupplierInvoice = DeleteSupplierInvoiceErrorInterface &
  DeleteSupplierInvoiceLineErrorInterface &
  InsertSupplierInvoiceLineErrorInterface &
  UpdateSupplierInvoiceErrorInterface &
  UpdateSupplierInvoiceLineErrorInterface & {
    __typename?: 'NotASupplierInvoice';
    description: Scalars['String'];
  };

export type NotEnoughStockForReduction =
  InsertCustomerInvoiceLineErrorInterface &
    UpdateCustomerInvoiceLineErrorInterface & {
      __typename?: 'NotEnoughStockForReduction';
      batch: StockLineResponse;
      description: Scalars['String'];
      line?: Maybe<InvoiceLineResponse>;
    };

export type OtherPartyCannotBeThisStoreError =
  InsertCustomerInvoiceErrorInterface &
    UpdateCustomerInvoiceErrorInterface & {
      __typename?: 'OtherPartyCannotBeThisStoreError';
      description: Scalars['String'];
    };

export type OtherPartyNotACustomerError = InsertCustomerInvoiceErrorInterface &
  UpdateCustomerInvoiceErrorInterface & {
    __typename?: 'OtherPartyNotACustomerError';
    description: Scalars['String'];
    otherParty: NameNode;
  };

export type OtherPartyNotASupplier = InsertSupplierInvoiceErrorInterface &
  UpdateSupplierInvoiceErrorInterface & {
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

export type RangeError = InsertCustomerInvoiceLineErrorInterface &
  InsertSupplierInvoiceLineErrorInterface &
  UpdateCustomerInvoiceLineErrorInterface &
  UpdateSupplierInvoiceLineErrorInterface & {
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

export type RecordAlreadyExist = InsertCustomerInvoiceErrorInterface &
  InsertCustomerInvoiceLineErrorInterface &
  InsertSupplierInvoiceErrorInterface &
  InsertSupplierInvoiceLineErrorInterface & {
    __typename?: 'RecordAlreadyExist';
    description: Scalars['String'];
  };

export type RecordNotFound = DeleteCustomerInvoiceErrorInterface &
  DeleteCustomerInvoiceLineErrorInterface &
  DeleteSupplierInvoiceErrorInterface &
  DeleteSupplierInvoiceLineErrorInterface &
  NodeErrorInterface &
  UpdateCustomerInvoiceErrorInterface &
  UpdateCustomerInvoiceLineErrorInterface &
  UpdateSupplierInvoiceErrorInterface &
  UpdateSupplierInvoiceLineErrorInterface & {
    __typename?: 'RecordNotFound';
    description: Scalars['String'];
  };

export type SimpleStringFilterInput = {
  equalTo?: Maybe<Scalars['String']>;
  like?: Maybe<Scalars['String']>;
};

export type StockLineAlreadyExistsInInvoice =
  InsertCustomerInvoiceLineErrorInterface &
    UpdateCustomerInvoiceLineErrorInterface & {
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
  InsertCustomerInvoiceLineErrorInterface &
    UpdateCustomerInvoiceLineErrorInterface & {
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
  location?: Maybe<Scalars['String']>;
  onHold: Scalars['Boolean'];
  packSize: Scalars['Int'];
  sellPricePerPack: Scalars['Float'];
  storeId: Scalars['String'];
  totalNumberOfPacks: Scalars['Int'];
};

export type StockLineResponse = NodeError | StockLineNode;

export type StockLinesResponse = ConnectorError | StockLineConnector;

export type UpdateCustomerInvoiceError = {
  __typename?: 'UpdateCustomerInvoiceError';
  error: UpdateCustomerInvoiceErrorInterface;
};

export type UpdateCustomerInvoiceErrorInterface = {
  description: Scalars['String'];
};

export type UpdateCustomerInvoiceInput = {
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  otherPartyId?: Maybe<Scalars['String']>;
  status?: Maybe<InvoiceNodeStatus>;
  theirReference?: Maybe<Scalars['String']>;
};

export type UpdateCustomerInvoiceLineError = {
  __typename?: 'UpdateCustomerInvoiceLineError';
  error: UpdateCustomerInvoiceLineErrorInterface;
};

export type UpdateCustomerInvoiceLineErrorInterface = {
  description: Scalars['String'];
};

export type UpdateCustomerInvoiceLineInput = {
  id: Scalars['String'];
  invoiceId: Scalars['String'];
  itemId?: Maybe<Scalars['String']>;
  numberOfPacks?: Maybe<Scalars['Int']>;
  stockLineId?: Maybe<Scalars['String']>;
};

export type UpdateCustomerInvoiceLineResponse =
  | InvoiceLineNode
  | NodeError
  | UpdateCustomerInvoiceLineError;

export type UpdateCustomerInvoiceResponse =
  | InvoiceNode
  | NodeError
  | UpdateCustomerInvoiceError;

export type UpdateSupplierInvoiceError = {
  __typename?: 'UpdateSupplierInvoiceError';
  error: UpdateSupplierInvoiceErrorInterface;
};

export type UpdateSupplierInvoiceErrorInterface = {
  description: Scalars['String'];
};

export type UpdateSupplierInvoiceInput = {
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  otherPartyId?: Maybe<Scalars['String']>;
  status?: Maybe<InvoiceNodeStatus>;
  theirReference?: Maybe<Scalars['String']>;
};

export type UpdateSupplierInvoiceLineError = {
  __typename?: 'UpdateSupplierInvoiceLineError';
  error: UpdateSupplierInvoiceLineErrorInterface;
};

export type UpdateSupplierInvoiceLineErrorInterface = {
  description: Scalars['String'];
};

export type UpdateSupplierInvoiceLineInput = {
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

export type UpdateSupplierInvoiceLineResponse =
  | InvoiceLineNode
  | NodeError
  | UpdateSupplierInvoiceLineError;

export type UpdateSupplierInvoiceResponse =
  | InvoiceNode
  | NodeError
  | UpdateSupplierInvoiceError;

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
        hold: boolean;
        color: string;
        otherPartyId: string;
        otherPartyName: string;
        status: InvoiceNodeStatus;
        theirReference?: string | null | undefined;
        type: InvoiceNodeType;
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
                sellPricePerPack: number;
              }>;
            };
        pricing:
          | { __typename: 'InvoicePricingNode'; totalAfterTax: number }
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
            | { __typename: 'InvoicePricingNode'; totalAfterTax: number }
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

export type ItemsQueryVariables = Exact<{
  first?: Maybe<Scalars['Int']>;
  offset?: Maybe<Scalars['Int']>;
  key: ItemSortFieldInput;
  desc?: Maybe<Scalars['Boolean']>;
}>;

export type ItemsQuery = {
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
          code: string;
          id: string;
          isVisible: boolean;
          name: string;
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
        hold
        color
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
  ) {
    invoices(
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
export const ItemsDocument = gql`
  query items(
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
        }
        totalCount
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
    items(
      variables: ItemsQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<ItemsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<ItemsQuery>(ItemsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'items'
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
