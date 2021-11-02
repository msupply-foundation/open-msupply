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
  /**
   * Implement the DateTime<Utc> scalar
   *
   * The input/output is a string in RFC3339 format.
   */
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

/** Generic Error Wrapper */
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

/** Generic Error Wrapper */
export type DeleteCustomerInvoiceError = {
  __typename?: 'DeleteCustomerInvoiceError';
  error: DeleteCustomerInvoiceErrorInterface;
};

export type DeleteCustomerInvoiceErrorInterface = {
  description: Scalars['String'];
};

/** Generic Error Wrapper */
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

/** Generic Error Wrapper */
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

/** Generic Error Wrapper */
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

/** Generic Error Wrapper */
export type InsertCustomerInvoiceError = {
  __typename?: 'InsertCustomerInvoiceError';
  error: InsertCustomerInvoiceErrorInterface;
};

export type InsertCustomerInvoiceErrorInterface = {
  description: Scalars['String'];
};

export type InsertCustomerInvoiceInput = {
  comment?: Maybe<Scalars['String']>;
  /** The new invoice id provided by the client */
  id: Scalars['String'];
  /** The other party must be an customer of the current store */
  otherPartyId: Scalars['String'];
  status?: Maybe<InvoiceNodeStatus>;
  theirReference?: Maybe<Scalars['String']>;
};

/** Generic Error Wrapper */
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

/** Generic Error Wrapper */
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

/** Generic Error Wrapper */
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

/** Generic Connector */
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

/** Generic Connector */
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
  numberOfPacks: Scalars['Int'];
  packSize: Scalars['Int'];
  sellPricePerPack: Scalars['Float'];
  stockLine?: Maybe<StockLineResponse>;
};

export type InvoiceLineResponse = InvoiceLineNode | NodeError;

export type InvoiceLinesResponse = ConnectorError | InvoiceLineConnector;

export type InvoiceNode = {
  __typename?: 'InvoiceNode';
  comment?: Maybe<Scalars['String']>;
  confirmedDatetime?: Maybe<Scalars['DateTime']>;
  entryDatetime: Scalars['DateTime'];
  finalisedDatetime?: Maybe<Scalars['DateTime']>;
  id: Scalars['String'];
  invoiceNumber: Scalars['Int'];
  lines: InvoiceLinesResponse;
  otherPartyId: Scalars['String'];
  otherPartyName: Scalars['String'];
  pricing: InvoicePriceResponse;
  status: InvoiceNodeStatus;
  theirReference?: Maybe<Scalars['String']>;
  type: InvoiceNodeType;
};

export enum InvoiceNodeStatus {
  /**
   * For customer invoices: When an invoice is CONFIRMED available_number_of_packs and
   * total_number_of_packs get updated when items are added to the invoice.
   */
  Confirmed = 'CONFIRMED',
  /**
   * For customer invoices: In DRAFT mode only the available_number_of_packs in a stock line gets
   * updated when items are added to the invoice.
   */
  Draft = 'DRAFT',
  /** A FINALISED invoice can't be edited nor deleted. */
  Finalised = 'FINALISED',
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

/** Generic Connector */
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

/** Generic Connector */
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

/** Generic Error Wrapper */
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

/** Generic Pagination Input */
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

/** Generic Connector */
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
  packSize: Scalars['Int'];
  sellPricePerPack: Scalars['Float'];
  storeId: Scalars['String'];
  totalNumberOfPacks: Scalars['Int'];
};

export type StockLineResponse = NodeError | StockLineNode;

export type StockLinesResponse = ConnectorError | StockLineConnector;

/** Generic Error Wrapper */
export type UpdateCustomerInvoiceError = {
  __typename?: 'UpdateCustomerInvoiceError';
  error: UpdateCustomerInvoiceErrorInterface;
};

export type UpdateCustomerInvoiceErrorInterface = {
  description: Scalars['String'];
};

export type UpdateCustomerInvoiceInput = {
  comment?: Maybe<Scalars['String']>;
  /** The new invoice id provided by the client */
  id: Scalars['String'];
  /**
   * The other party must be a customer of the current store.
   * This field can be used to change the other_party of an invoice
   */
  otherPartyId?: Maybe<Scalars['String']>;
  /**
   * When changing the status from DRAFT to CONFIRMED or FINALISED the total_number_of_packs for
   * existing invoice items gets updated.
   */
  status?: Maybe<InvoiceNodeStatus>;
  /** External invoice reference, e.g. purchase or shipment number */
  theirReference?: Maybe<Scalars['String']>;
};

/** Generic Error Wrapper */
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

/** Generic Error Wrapper */
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

/** Generic Error Wrapper */
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
        __typename?: 'InvoiceNode';
        id: string;
        comment?: string | null | undefined;
        confirmedDatetime?: any | null | undefined;
        entryDatetime: any;
        finalisedDatetime?: any | null | undefined;
        invoiceNumber: number;
        otherPartyId: string;
        otherPartyName: string;
        status: InvoiceNodeStatus;
        theirReference?: string | null | undefined;
        type: InvoiceNodeType;
        lines:
          | { __typename?: 'ConnectorError' }
          | {
              __typename?: 'InvoiceLineConnector';
              totalCount: number;
              nodes: Array<{
                __typename?: 'InvoiceLineNode';
                batch?: string | null | undefined;
                costPricePerPack: number;
                expiryDate?: any | null | undefined;
                id: string;
                itemCode: string;
                itemId: string;
                itemName: string;
                numberOfPacks: number;
                packSize: number;
                sellPricePerPack: number;
              }>;
            };
        pricing:
          | { __typename: 'InvoicePricingNode'; totalAfterTax: number }
          | { __typename?: 'NodeError' };
      }
    | {
        __typename: 'NodeError';
        error:
          | { __typename?: 'DatabaseError'; description: string }
          | { __typename?: 'RecordNotFound'; description: string };
      };
};

export type NamesQueryVariables = Exact<{ [key: string]: never }>;

export type NamesQuery = {
  __typename?: 'Queries';
  names:
    | { __typename?: 'ConnectorError' }
    | {
        __typename?: 'NameConnector';
        totalCount: number;
        nodes: Array<{
          __typename?: 'NameNode';
          id: string;
          code: string;
          name: string;
          isSupplier: boolean;
          isCustomer: boolean;
        }>;
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
          | { __typename?: 'PaginationError'; description: string };
      }
    | {
        __typename?: 'InvoiceConnector';
        totalCount: number;
        nodes: Array<{
          __typename?: 'InvoiceNode';
          id: string;
          invoiceNumber: number;
          finalisedDatetime?: any | null | undefined;
          entryDatetime: any;
          confirmedDatetime?: any | null | undefined;
          comment?: string | null | undefined;
          otherPartyName: string;
          status: InvoiceNodeStatus;
          theirReference?: string | null | undefined;
          type: InvoiceNodeType;
          pricing:
            | { __typename: 'InvoicePricingNode'; totalAfterTax: number }
            | {
                __typename: 'NodeError';
                error:
                  | { __typename?: 'DatabaseError'; description: string }
                  | { __typename?: 'RecordNotFound'; description: string };
              };
        }>;
      };
};

export const InvoiceDocument = gql`
  query invoice($id: String!) {
    invoice(id: $id) {
      ... on InvoiceNode {
        id
        comment
        confirmedDatetime
        entryDatetime
        finalisedDatetime
        invoiceNumber
        lines {
          ... on InvoiceLineConnector {
            nodes {
              batch
              costPricePerPack
              expiryDate
              id
              itemCode
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
          ... on InvoicePricingNode {
            __typename
            totalAfterTax
          }
        }
        status
        theirReference
        type
      }
      ... on NodeError {
        __typename
        error {
          description
        }
      }
    }
  }
`;
export const NamesDocument = gql`
  query names {
    names(filter: { isCustomer: true }) {
      ... on NameConnector {
        nodes {
          id
          code
          name
          isSupplier
          isCustomer
        }
        totalCount
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
        }
      }
      ... on InvoiceConnector {
        nodes {
          id
          invoiceNumber
          finalisedDatetime
          entryDatetime
          confirmedDatetime
          comment
          otherPartyName
          status
          theirReference
          type
          pricing {
            ... on NodeError {
              __typename
              error {
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

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = action => action();

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
    names(
      variables?: NamesQueryVariables,
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
  };
}
export type Sdk = ReturnType<typeof getSdk>;
