import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw';
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
  DateTime: string;
  NaiveDate: string;
};

export type AccessDenied = LogoutErrorInterface &
  UserErrorInterface & {
    __typename?: 'AccessDenied';
    description: Scalars['String'];
    fullError: Scalars['String'];
  };

export type AuthToken = {
  __typename?: 'AuthToken';
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

export type BatchCustomerRequisitionInput = {
  deleteCustomerRequisitionLines?: Maybe<
    Array<DeleteCustomerRequisitionLineInput>
  >;
  deleteCustomerRequisitions?: Maybe<Array<DeleteCustomerRequisitionInput>>;
  insertCustomerRequisitionLines?: Maybe<
    Array<InsertCustomerRequisitionLineInput>
  >;
  insertCustomerRequisitions?: Maybe<Array<InsertCustomerRequisitionInput>>;
  updateCustomerRequisitionLines?: Maybe<
    Array<UpdateCustomerRequisitionLineInput>
  >;
  updateCustomerRequisitions?: Maybe<Array<UpdateCustomerRequisitionInput>>;
};

export type BatchCustomerRequisitionResponse = {
  __typename?: 'BatchCustomerRequisitionResponse';
  deleteCustomerRequisitionLines?: Maybe<
    Array<DeleteCustomerRequisitionLineResponseWithId>
  >;
  deleteCustomerRequisitions?: Maybe<
    Array<DeleteCustomerRequisitionResponseWithId>
  >;
  insertCustomerRequisitionLines?: Maybe<
    Array<InsertCustomerRequisitionLineResponseWithId>
  >;
  insertCustomerRequisitions?: Maybe<
    Array<InsertCustomerRequisitionResponseWithId>
  >;
  updateCustomerRequisitionLines?: Maybe<
    Array<UpdateCustomerRequisitionLineResponseWithId>
  >;
  updateCustomerRequisitions?: Maybe<
    Array<UpdateCustomerRequisitionResponseWithId>
  >;
};

export type BatchInboundShipmentInput = {
  deleteInboundShipmentLines?: Maybe<Array<DeleteInboundShipmentLineInput>>;
  deleteInboundShipments?: Maybe<Array<DeleteInboundShipmentInput>>;
  insertInboundShipmentLines?: Maybe<Array<InsertInboundShipmentLineInput>>;
  insertOutboundShipments?: Maybe<Array<InsertInboundShipmentInput>>;
  updateInboundShipmentLines?: Maybe<Array<UpdateInboundShipmentLineInput>>;
  updateInboundShipments?: Maybe<Array<UpdateInboundShipmentInput>>;
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

export type BatchStocktakeInput = {
  deleteStocktakeLines?: Maybe<Array<DeleteStocktakeLineInput>>;
  deleteStocktakes?: Maybe<Array<DeleteStocktakeInput>>;
  insertStocktakeLines?: Maybe<Array<InsertStocktakeLineInput>>;
  insertStocktakes?: Maybe<Array<InsertStocktakeInput>>;
  updateStocktakeLines?: Maybe<Array<UpdateStocktakeLineInput>>;
  updateStocktakes?: Maybe<Array<UpdateStocktakeInput>>;
};

export type BatchStocktakeResponse = {
  __typename?: 'BatchStocktakeResponse';
  deleteStocktakeLines?: Maybe<Array<DeleteStocktakeLineResponseWithId>>;
  deleteStocktakes?: Maybe<Array<DeleteStocktakeResponseWithId>>;
  insertStocktakeLines?: Maybe<Array<InsertStocktakeLineResponseWithId>>;
  insertStocktakes?: Maybe<Array<InsertStocktakeResponseWithId>>;
  updateStocktakeLines?: Maybe<Array<UpdateStocktakeLineResponseWithId>>;
  updateStocktakes?: Maybe<Array<UpdateStocktakeResponseWithId>>;
};

export type BatchSupplierRequisitionInput = {
  deleteSupplierRequisitionLines?: Maybe<
    Array<DeleteSupplierRequisitionLineInput>
  >;
  deleteSupplierRequisitions?: Maybe<Array<DeleteSupplierRequisitionInput>>;
  insertSupplierRequisitionLines?: Maybe<
    Array<InsertSupplierRequisitionLineInput>
  >;
  insertSupplierRequisitions?: Maybe<Array<InsertSupplierRequisitionInput>>;
  updateSupplierRequisitionLines?: Maybe<
    Array<UpdateSupplierRequisitionLineInput>
  >;
  updateSupplierRequisitions?: Maybe<Array<UpdateSupplierRequisitionInput>>;
};

export type BatchSupplierRequisitionResponse = {
  __typename?: 'BatchSupplierRequisitionResponse';
  deleteSupplierRequisitionLines?: Maybe<
    Array<DeleteSupplierRequisitionLineResponseWithId>
  >;
  deleteSupplierRequisitions?: Maybe<
    Array<DeleteSupplierRequisitionResponseWithId>
  >;
  insertSupplierRequisitionLines?: Maybe<
    Array<InsertSupplierRequisitionLineResponseWithId>
  >;
  insertSupplierRequisitions?: Maybe<
    Array<InsertSupplierRequisitionResponseWithId>
  >;
  updateSupplierRequisitionLines?: Maybe<
    Array<UpdateSupplierRequisitionLineResponseWithId>
  >;
  updateSupplierRequisitions?: Maybe<
    Array<UpdateSupplierRequisitionResponseWithId>
  >;
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

export type CountError = {
  __typename?: 'CountError';
  description: Scalars['String'];
};

export enum CustomerRequisitionNodeStatus {
  Finalised = 'FINALISED',
  InProgress = 'IN_PROGRESS',
  New = 'NEW',
}

export type DatabaseError = AuthTokenErrorInterface &
  ConnectorErrorInterface &
  DeleteInboundShipmentErrorInterface &
  DeleteInboundShipmentLineErrorInterface &
  DeleteOutboundShipmentErrorInterface &
  DeleteOutboundShipmentLineErrorInterface &
  InsertInboundShipmentErrorInterface &
  InsertInboundShipmentLineErrorInterface &
  InsertOutboundShipmentErrorInterface &
  InsertOutboundShipmentLineErrorInterface &
  NodeErrorInterface &
  RefreshTokenErrorInterface &
  UpdateInboundShipmentErrorInterface &
  UpdateInboundShipmentLineErrorInterface &
  UpdateOutboundShipmentErrorInterface &
  UpdateOutboundShipmentLineErrorInterface &
  UserErrorInterface &
  UserRegisterErrorInterface & {
    __typename?: 'DatabaseError';
    description: Scalars['String'];
    fullError: Scalars['String'];
  };

export type DatetimeFilterInput = {
  afterOrEqualTo?: Maybe<Scalars['DateTime']>;
  beforeOrEqualTo?: Maybe<Scalars['DateTime']>;
  equalTo?: Maybe<Scalars['DateTime']>;
};

export type DeleteCustomerRequisitionInput = {
  id: Scalars['String'];
};

export type DeleteCustomerRequisitionLineInput = {
  id: Scalars['String'];
};

export type DeleteCustomerRequisitionLineResponse = DeleteResponse | NodeError;

export type DeleteCustomerRequisitionLineResponseWithId = {
  __typename?: 'DeleteCustomerRequisitionLineResponseWithId';
  id: Scalars['String'];
  response?: Maybe<DeleteCustomerRequisitionLineResponse>;
};

export type DeleteCustomerRequisitionResponse = DeleteResponse | NodeError;

export type DeleteCustomerRequisitionResponseWithId = {
  __typename?: 'DeleteCustomerRequisitionResponseWithId';
  id: Scalars['String'];
  response?: Maybe<DeleteCustomerRequisitionResponse>;
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

export type DeleteStocktakeInput = {
  id: Scalars['String'];
};

export type DeleteStocktakeLineInput = {
  id: Scalars['String'];
};

export type DeleteStocktakeLineResponse = DeleteResponse | NodeError;

export type DeleteStocktakeLineResponseWithId = {
  __typename?: 'DeleteStocktakeLineResponseWithId';
  id: Scalars['String'];
  response?: Maybe<DeleteResponse>;
};

export type DeleteStocktakeResponse = DeleteResponse | NodeError;

export type DeleteStocktakeResponseWithId = {
  __typename?: 'DeleteStocktakeResponseWithId';
  id: Scalars['String'];
  response?: Maybe<DeleteResponse>;
};

export type DeleteSupplierRequisitionInput = {
  id: Scalars['String'];
};

export type DeleteSupplierRequisitionLineInput = {
  id: Scalars['String'];
};

export type DeleteSupplierRequisitionLineResponse = DeleteResponse | NodeError;

export type DeleteSupplierRequisitionLineResponseWithId = {
  __typename?: 'DeleteSupplierRequisitionLineResponseWithId';
  id: Scalars['String'];
  response?: Maybe<DeleteSupplierRequisitionLineResponse>;
};

export type DeleteSupplierRequisitionResponse = DeleteResponse | NodeError;

export type DeleteSupplierRequisitionResponseWithId = {
  __typename?: 'DeleteSupplierRequisitionResponseWithId';
  id: Scalars['String'];
  response?: Maybe<DeleteSupplierRequisitionResponse>;
};

export type EqualFilterBooleanInput = {
  equalTo?: Maybe<Scalars['Boolean']>;
};

export type EqualFilterInvoiceStatusInput = {
  equalTo?: Maybe<InvoiceNodeStatus>;
};

export type EqualFilterInvoiceTypeInput = {
  equalTo?: Maybe<InvoiceNodeType>;
};

export type EqualFilterNumberInput = {
  equalTo?: Maybe<Scalars['Int']>;
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
  InvoiceId = 'invoiceId',
  ItemId = 'itemId',
  LocationId = 'locationId',
  OtherPartyId = 'otherPartyId',
  StockLineId = 'stockLineId',
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

export type InsertCustomerRequisitionInput = {
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  orderDate?: Maybe<Scalars['String']>;
  otherPartyId: Scalars['String'];
  theirReference?: Maybe<Scalars['String']>;
  type?: Maybe<RequisitionNodeType>;
};

export type InsertCustomerRequisitionLineInput = {
  calculatedQuantity?: Maybe<Scalars['Float']>;
  closingQuantity?: Maybe<Scalars['Int']>;
  comment?: Maybe<Scalars['String']>;
  expiredQuantity?: Maybe<Scalars['Float']>;
  id: Scalars['String'];
  imprestQuantity?: Maybe<Scalars['Float']>;
  issuedQuantity?: Maybe<Scalars['Float']>;
  itemCode?: Maybe<Scalars['String']>;
  itemId: Scalars['String'];
  itemName?: Maybe<Scalars['String']>;
  itemUnit?: Maybe<Scalars['String']>;
  monthlyConsumption?: Maybe<Scalars['Float']>;
  monthsOfSupply?: Maybe<Scalars['Float']>;
  openingQuantity?: Maybe<Scalars['Float']>;
  otherPartyClosingQuantity?: Maybe<Scalars['Int']>;
  previousQuantity?: Maybe<Scalars['Float']>;
  previousStockOnHand?: Maybe<Scalars['Float']>;
  receivedQuantity?: Maybe<Scalars['Float']>;
  requestedQuantity?: Maybe<Scalars['Float']>;
  requisitionId: Scalars['String'];
  stockAdditions?: Maybe<Scalars['Float']>;
  stockLosses?: Maybe<Scalars['Float']>;
  supplyQuantity?: Maybe<Scalars['Float']>;
};

export type InsertCustomerRequisitionLineResponse =
  | NodeError
  | RequisitionLineNode;

export type InsertCustomerRequisitionLineResponseWithId = {
  __typename?: 'InsertCustomerRequisitionLineResponseWithId';
  id: Scalars['String'];
  response?: Maybe<InsertSupplierRequisitionLineResponse>;
};

export type InsertCustomerRequisitionResponse = NodeError | RequisitionNode;

export type InsertCustomerRequisitionResponseWithId = {
  __typename?: 'InsertCustomerRequisitionResponseWithId';
  id: Scalars['String'];
  response?: Maybe<InsertCustomerRequisitionResponse>;
};

export type InsertInboundShipmentError = {
  __typename?: 'InsertInboundShipmentError';
  error: InsertInboundShipmentErrorInterface;
};

export type InsertInboundShipmentErrorInterface = {
  description: Scalars['String'];
};

export type InsertInboundShipmentInput = {
  color?: Maybe<Scalars['String']>;
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
  locationId?: Maybe<Scalars['String']>;
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
  color?: Maybe<Scalars['String']>;
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

export type InsertStocktakeInput = {
  comment?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  stocktakeDatetime?: Maybe<Scalars['String']>;
};

export type InsertStocktakeLineInput = {
  batch?: Maybe<Scalars['String']>;
  costPricePerPack?: Maybe<Scalars['Float']>;
  countedNumPacks?: Maybe<Scalars['Int']>;
  expiryDate?: Maybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  itemId: Scalars['String'];
  sellPricePerPack?: Maybe<Scalars['Float']>;
  stocktakeId: Scalars['String'];
};

export type InsertStocktakeLineResponse = NodeError | StocktakeLineNode;

export type InsertStocktakeLineResponseWithId = {
  __typename?: 'InsertStocktakeLineResponseWithId';
  id: Scalars['String'];
  response?: Maybe<InsertStocktakeLineResponse>;
};

export type InsertStocktakeResponse = NodeError | StocktakeNode;

export type InsertStocktakeResponseWithId = {
  __typename?: 'InsertStocktakeResponseWithId';
  id: Scalars['String'];
  response?: Maybe<InsertStocktakeResponse>;
};

export type InsertSupplierRequisitionInput = {
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  orderDate?: Maybe<Scalars['String']>;
  otherPartyId: Scalars['String'];
  theirReference?: Maybe<Scalars['String']>;
  type?: Maybe<RequisitionNodeType>;
};

export type InsertSupplierRequisitionLineInput = {
  calculatedQuantity?: Maybe<Scalars['Float']>;
  closingQuantity?: Maybe<Scalars['Int']>;
  comment?: Maybe<Scalars['String']>;
  expiredQuantity?: Maybe<Scalars['Float']>;
  id: Scalars['String'];
  imprestQuantity?: Maybe<Scalars['Float']>;
  issuedQuantity?: Maybe<Scalars['Float']>;
  itemCode?: Maybe<Scalars['String']>;
  itemId: Scalars['String'];
  itemName?: Maybe<Scalars['String']>;
  itemUnit?: Maybe<Scalars['String']>;
  monthlyConsumption?: Maybe<Scalars['Float']>;
  monthsOfSupply?: Maybe<Scalars['Float']>;
  openingQuantity?: Maybe<Scalars['Float']>;
  otherPartyClosingQuantity?: Maybe<Scalars['Int']>;
  previousQuantity?: Maybe<Scalars['Float']>;
  previousStockOnHand?: Maybe<Scalars['Float']>;
  receivedQuantity?: Maybe<Scalars['Float']>;
  requestedQuantity?: Maybe<Scalars['Float']>;
  requisitionId: Scalars['String'];
  stockAdditions?: Maybe<Scalars['Float']>;
  stockLosses?: Maybe<Scalars['Float']>;
  supplyQuantity?: Maybe<Scalars['Float']>;
};

export type InsertSupplierRequisitionLineResponse =
  | NodeError
  | RequisitionLineNode;

export type InsertSupplierRequisitionLineResponseWithId = {
  __typename?: 'InsertSupplierRequisitionLineResponseWithId';
  id: Scalars['String'];
  response?: Maybe<InsertSupplierRequisitionLineResponse>;
};

export type InsertSupplierRequisitionResponse = NodeError | RequisitionNode;

export type InsertSupplierRequisitionResponseWithId = {
  __typename?: 'InsertSupplierRequisitionResponseWithId';
  id: Scalars['String'];
  response?: Maybe<InsertSupplierRequisitionResponse>;
};

export type InternalError = AuthTokenErrorInterface &
  LogoutErrorInterface &
  RefreshTokenErrorInterface &
  UserErrorInterface &
  UserRegisterErrorInterface & {
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

export type InvoiceCountsConnector = {
  __typename?: 'InvoiceCountsConnector';
  created?: Maybe<InvoiceCountsCreated>;
  toBePicked?: Maybe<Scalars['Int']>;
};

export type InvoiceCountsCreated = {
  __typename?: 'InvoiceCountsCreated';
  thisWeek: Scalars['Int'];
  today: Scalars['Int'];
};

export type InvoiceCountsResponse = ConnectorError | InvoiceCountsConnector;

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
  invoiceNumber?: Maybe<EqualFilterNumberInput>;
  nameId?: Maybe<EqualFilterStringInput>;
  status?: Maybe<EqualFilterInvoiceStatusInput>;
  storeId?: Maybe<EqualFilterStringInput>;
  theirReference?: Maybe<EqualFilterStringInput>;
  type?: Maybe<EqualFilterInvoiceTypeInput>;
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
  location?: Maybe<LocationResponse>;
  locationId?: Maybe<Scalars['String']>;
  locationName?: Maybe<Scalars['String']>;
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
  color?: Maybe<Scalars['String']>;
  comment?: Maybe<Scalars['String']>;
  confirmedDatetime?: Maybe<Scalars['DateTime']>;
  entryDatetime: Scalars['DateTime'];
  finalisedDatetime?: Maybe<Scalars['DateTime']>;
  id: Scalars['String'];
  invoiceNumber: Scalars['Int'];
  lines: InvoiceLinesResponse;
  onHold: Scalars['Boolean'];
  otherParty: NameResponse;
  otherPartyId: Scalars['String'];
  otherPartyName: Scalars['String'];
  pricing: InvoicePriceResponse;
  status: InvoiceNodeStatus;
  theirReference?: Maybe<Scalars['String']>;
  type: InvoiceNodeType;
};

export enum InvoiceNodeStatus {
  Confirmed = 'CONFIRMED',
  Draft = 'DRAFT',
  Finalised = 'FINALISED',
}

export enum InvoiceNodeType {
  InboundShipment = 'INBOUND_SHIPMENT',
  OutboundShipment = 'OUTBOUND_SHIPMENT',
}

export type InvoicePriceResponse = InvoicePricingNode | NodeError;

export type InvoicePricingNode = {
  __typename?: 'InvoicePricingNode';
  totalAfterTax: Scalars['Float'];
};

export type InvoiceResponse = InvoiceNode | NodeError;

export enum InvoiceSortFieldInput {
  Comment = 'comment',
  ConfirmDatetime = 'confirmDatetime',
  EntryDatetime = 'entryDatetime',
  FinalisedDateTime = 'finalisedDateTime',
  InvoiceNumber = 'invoiceNumber',
  OtherPartyName = 'otherPartyName',
  Status = 'status',
  Type = 'type',
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
  isVisible?: Maybe<EqualFilterBooleanInput>;
  name?: Maybe<SimpleStringFilterInput>;
};

export type ItemNode = {
  __typename?: 'ItemNode';
  availableBatches: StockLinesResponse;
  code: Scalars['String'];
  id: Scalars['String'];
  isVisible: Scalars['Boolean'];
  name: Scalars['String'];
  unitName?: Maybe<Scalars['String']>;
};

export enum ItemSortFieldInput {
  Code = 'code',
  Name = 'name',
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

export type LocationConnector = {
  __typename?: 'LocationConnector';
  nodes: Array<LocationNode>;
  totalCount: Scalars['Int'];
};

export type LocationFilterInput = {
  code?: Maybe<EqualFilterStringInput>;
  id?: Maybe<EqualFilterStringInput>;
  name?: Maybe<EqualFilterStringInput>;
};

export type LocationIsOnHold = InsertOutboundShipmentLineErrorInterface &
  UpdateOutboundShipmentLineErrorInterface & {
    __typename?: 'LocationIsOnHold';
    description: Scalars['String'];
  };

export type LocationNode = {
  __typename?: 'LocationNode';
  code: Scalars['String'];
  id: Scalars['String'];
  name: Scalars['String'];
  onHold: Scalars['Boolean'];
  stock: StockLinesResponse;
};

export type LocationNotFound = InsertOutboundShipmentLineErrorInterface &
  UpdateOutboundShipmentLineErrorInterface & {
    __typename?: 'LocationNotFound';
    description: Scalars['String'];
  };

export type LocationResponse = LocationNode | NodeError;

export enum LocationSortFieldInput {
  Code = 'code',
  Name = 'name',
}

export type LocationSortInput = {
  desc?: Maybe<Scalars['Boolean']>;
  key: LocationSortFieldInput;
};

export type LocationsResponse = ConnectorError | LocationConnector;

export type Logout = {
  __typename?: 'Logout';
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

export type Mutations = {
  __typename?: 'Mutations';
  batchCustomerRequisition: BatchCustomerRequisitionResponse;
  batchInboundShipment: BatchInboundShipmentResponse;
  batchOutboundShipment: BatchOutboundShipmentResponse;
  batchStocktake: BatchStocktakeResponse;
  batchSupplierRequisition: BatchSupplierRequisitionResponse;
  deleteCustomerRequisition: DeleteCustomerRequisitionResponse;
  deleteCustomerRequisitionLine: DeleteCustomerRequisitionLineResponse;
  deleteInboundShipment: DeleteInboundShipmentResponse;
  deleteInboundShipmentLine: DeleteInboundShipmentLineResponse;
  deleteOutboundShipment: DeleteOutboundShipmentResponse;
  deleteOutboundShipmentLine: DeleteOutboundShipmentLineResponse;
  deleteStocktake: DeleteStocktakeResponse;
  deleteSupplierRequisition: DeleteSupplierRequisitionResponse;
  deleteSupplierRequisitionLine: DeleteSupplierRequisitionLineResponse;
  insertCustomerRequisition: InsertCustomerRequisitionResponse;
  insertCustomerRequisitionLine: InsertCustomerRequisitionLineResponse;
  insertInboundShipment: InsertInboundShipmentResponse;
  insertInboundShipmentLine: InsertInboundShipmentLineResponse;
  insertOutboundShipment: InsertOutboundShipmentResponse;
  insertOutboundShipmentLine: InsertOutboundShipmentLineResponse;
  insertStocktake: InsertStocktakeResponse;
  insertSupplierRequisition: InsertSupplierRequisitionResponse;
  insertSupplierRequisitionLine: InsertSupplierRequisitionLineResponse;
  registerUser: UserRegisterResponse;
  updateCustomerRequisition: UpdateCustomerRequisitionResponse;
  updateCustomerRequisitionLine: UpdateCustomerRequisitionLineResponse;
  updateInboundShipment: UpdateInboundShipmentResponse;
  updateInboundShipmentLine: UpdateInboundShipmentLineResponse;
  updateOutboundShipment: UpdateOutboundShipmentResponse;
  updateOutboundShipmentLine: UpdateOutboundShipmentLineResponse;
  updateStocktake: UpdateStocktakeResponse;
  updateSupplierRequisition: UpdateSupplierRequisitionResponse;
  updateSupplierRequisitionLine: UpdateSupplierRequisitionLineResponse;
};

export type MutationsBatchCustomerRequisitionArgs = {
  deleteCustomerRequisitionLines?: Maybe<
    Array<DeleteCustomerRequisitionLineInput>
  >;
  deleteCustomerRequisitions?: Maybe<Array<DeleteCustomerRequisitionInput>>;
  insertCustomerRequisitionLines?: Maybe<
    Array<InsertCustomerRequisitionLineInput>
  >;
  insertCustomerRequisitions?: Maybe<Array<InsertCustomerRequisitionInput>>;
  updateCustomerRequisitionLines?: Maybe<
    Array<UpdateCustomerRequisitionLineInput>
  >;
  updateCustomerRequisitions?: Maybe<Array<UpdateCustomerRequisitionInput>>;
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

export type MutationsBatchStocktakeArgs = {
  deleteStocktakeLines?: Maybe<Array<DeleteStocktakeLineInput>>;
  deleteStocktakes?: Maybe<Array<DeleteStocktakeInput>>;
  insertStocktakeLines?: Maybe<Array<InsertStocktakeLineInput>>;
  insertStocktakes?: Maybe<Array<InsertStocktakeInput>>;
  updateStocktakeLines?: Maybe<Array<UpdateStocktakeLineInput>>;
  updateStocktakes?: Maybe<Array<UpdateStocktakeInput>>;
};

export type MutationsBatchSupplierRequisitionArgs = {
  deleteSupplierRequisitionLines?: Maybe<
    Array<DeleteSupplierRequisitionLineInput>
  >;
  deleteSupplierRequisitions?: Maybe<Array<DeleteSupplierRequisitionInput>>;
  insertSupplierRequisitionLines?: Maybe<
    Array<InsertSupplierRequisitionLineInput>
  >;
  insertSupplierRequisitions?: Maybe<Array<InsertSupplierRequisitionInput>>;
  updateSupplierRequisitionLines?: Maybe<
    Array<UpdateSupplierRequisitionLineInput>
  >;
  updateSupplierRequisitions?: Maybe<Array<UpdateSupplierRequisitionInput>>;
};

export type MutationsDeleteCustomerRequisitionArgs = {
  input: DeleteCustomerRequisitionInput;
};

export type MutationsDeleteCustomerRequisitionLineArgs = {
  input: DeleteCustomerRequisitionLineInput;
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

export type MutationsDeleteStocktakeArgs = {
  input: DeleteStocktakeInput;
};

export type MutationsDeleteSupplierRequisitionArgs = {
  input: DeleteSupplierRequisitionInput;
};

export type MutationsDeleteSupplierRequisitionLineArgs = {
  input: DeleteSupplierRequisitionLineInput;
};

export type MutationsInsertCustomerRequisitionArgs = {
  input: InsertCustomerRequisitionInput;
};

export type MutationsInsertCustomerRequisitionLineArgs = {
  input: InsertCustomerRequisitionLineInput;
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

export type MutationsInsertStocktakeArgs = {
  input: InsertStocktakeInput;
};

export type MutationsInsertSupplierRequisitionArgs = {
  input: InsertSupplierRequisitionInput;
};

export type MutationsInsertSupplierRequisitionLineArgs = {
  input: InsertSupplierRequisitionLineInput;
};

export type MutationsRegisterUserArgs = {
  input: UserRegisterInput;
};

export type MutationsUpdateCustomerRequisitionArgs = {
  input: UpdateCustomerRequisitionInput;
};

export type MutationsUpdateCustomerRequisitionLineArgs = {
  input: UpdateCustomerRequisitionLineInput;
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

export type MutationsUpdateStocktakeArgs = {
  input: UpdateStocktakeInput;
};

export type MutationsUpdateSupplierRequisitionArgs = {
  input: UpdateSupplierRequisitionInput;
};

export type MutationsUpdateSupplierRequisitionLineArgs = {
  input: UpdateSupplierRequisitionLineInput;
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
  Code = 'code',
  Name = 'name',
}

export type NameSortInput = {
  desc?: Maybe<Scalars['Boolean']>;
  key: NameSortFieldInput;
};

export type NamesResponse = ConnectorError | NameConnector;

export type NoRefreshTokenProvided = RefreshTokenErrorInterface & {
  __typename?: 'NoRefreshTokenProvided';
  description: Scalars['String'];
};

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
  authToken: AuthTokenResponse;
  invoice: InvoiceResponse;
  invoiceCounts: InvoiceCountsResponse;
  invoices: InvoicesResponse;
  items: ItemsResponse;
  locations: LocationsResponse;
  logout: LogoutResponse;
  me: UserResponse;
  names: NamesResponse;
  refreshToken: RefreshTokenResponse;
  requisition: RequisitionResponse;
  requisitions: RequisitionsResponse;
  stockCounts: StockCountsResponse;
  stocktake: StocktakeResponse;
  stocktakes: StocktakesResponse;
};

export type QueriesAuthTokenArgs = {
  password: Scalars['String'];
  username: Scalars['String'];
};

export type QueriesInvoiceArgs = {
  id: Scalars['String'];
};

export type QueriesInvoiceCountsArgs = {
  type: InvoiceNodeType;
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

export type QueriesLocationsArgs = {
  filter?: Maybe<LocationFilterInput>;
  page?: Maybe<PaginationInput>;
  sort?: Maybe<Array<LocationSortInput>>;
};

export type QueriesNamesArgs = {
  filter?: Maybe<NameFilterInput>;
  page?: Maybe<PaginationInput>;
  sort?: Maybe<Array<NameSortInput>>;
};

export type QueriesRequisitionArgs = {
  id: Scalars['String'];
};

export type QueriesRequisitionsArgs = {
  params?: Maybe<RequisitionListParameters>;
};

export type QueriesStocktakeArgs = {
  id: Scalars['String'];
};

export type QueriesStocktakesArgs = {
  params?: Maybe<StocktakeListParameters>;
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
  First = 'first',
  NumberOfPacks = 'numberOfPacks',
  PackSize = 'packSize',
}

export type RecordAlreadyExist = InsertInboundShipmentErrorInterface &
  InsertInboundShipmentLineErrorInterface &
  InsertOutboundShipmentErrorInterface &
  InsertOutboundShipmentLineErrorInterface &
  UserRegisterErrorInterface & {
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

export type RefreshToken = {
  __typename?: 'RefreshToken';
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
  nodes: Array<Maybe<RequisitionNode>>;
  totalCount: Scalars['Int'];
};

export type RequisitionFilterInput = {
  comment?: Maybe<SimpleStringFilterInput>;
  type?: Maybe<SimpleStringFilterInput>;
};

export type RequisitionLineConnector = {
  __typename?: 'RequisitionLineConnector';
  nodes: Array<RequisitionLineNode>;
  totalCount: Scalars['Int'];
};

export type RequisitionLineNode = {
  __typename?: 'RequisitionLineNode';
  calculatedQuantity?: Maybe<Scalars['Float']>;
  closingQuantity?: Maybe<Scalars['Float']>;
  comment?: Maybe<Scalars['String']>;
  expiredQuantity?: Maybe<Scalars['Float']>;
  id: Scalars['String'];
  imprestQuantity?: Maybe<Scalars['Float']>;
  issuedQuantity?: Maybe<Scalars['Float']>;
  itemCode?: Maybe<Scalars['String']>;
  itemId: Scalars['String'];
  itemName?: Maybe<Scalars['String']>;
  itemUnit?: Maybe<Scalars['String']>;
  monthlyConsumption?: Maybe<Scalars['Float']>;
  monthsOfSupply?: Maybe<Scalars['Float']>;
  openingQuantity?: Maybe<Scalars['Float']>;
  otherPartyClosingQuantity?: Maybe<Scalars['Float']>;
  previousQuantity?: Maybe<Scalars['Float']>;
  previousStockOnHand?: Maybe<Scalars['Float']>;
  receivedQuantity?: Maybe<Scalars['Float']>;
  requestedQuantity?: Maybe<Scalars['Float']>;
  stockAdditions?: Maybe<Scalars['Float']>;
  stockLosses?: Maybe<Scalars['Float']>;
  supplyQuantity?: Maybe<Scalars['Float']>;
};

export type RequisitionLineResponse = NodeError | RequisitionNode;

export type RequisitionLinesResponse =
  | ConnectorError
  | RequisitionLineConnector;

export type RequisitionListParameters = {
  filter?: Maybe<RequisitionFilterInput>;
  page?: Maybe<PaginationInput>;
  sort?: Maybe<Array<RequisitionSortInput>>;
};

export type RequisitionNode = {
  __typename?: 'RequisitionNode';
  color?: Maybe<Scalars['String']>;
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  lines: RequisitionLinesResponse;
  maxMOS?: Maybe<Scalars['Int']>;
  orderDate?: Maybe<Scalars['String']>;
  otherParty: NameResponse;
  otherPartyId: Scalars['String'];
  otherPartyName: Scalars['String'];
  requisitionNumber: Scalars['Int'];
  status: SupplierRequisitionNodeStatus;
  theirReference?: Maybe<Scalars['String']>;
  thresholdMOS?: Maybe<Scalars['Int']>;
  type?: Maybe<RequisitionNodeType>;
};

export enum RequisitionNodeType {
  CustomerRequisition = 'CUSTOMER_REQUISITION',
  SupplierRequisition = 'SUPPLIER_REQUISITION',
}

export type RequisitionResponse = NodeError | RequisitionNode;

export enum RequisitionSortFieldInput {
  OtherPartyName = 'otherPartyName',
}

export type RequisitionSortInput = {
  desc?: Maybe<Scalars['Boolean']>;
  key: RequisitionSortFieldInput;
};

export type RequisitionsResponse = ConnectorError | RequisitionConnector;

export type SimpleStringFilterInput = {
  equalTo?: Maybe<Scalars['String']>;
  like?: Maybe<Scalars['String']>;
};

export type StockCountsConnector = {
  __typename?: 'StockCountsConnector';
  expired: Scalars['Int'];
  expiringSoon: Scalars['Int'];
};

export type StockCountsResponse = ConnectorError | StockCountsConnector;

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

export type StockLineIsOnHold = InsertOutboundShipmentLineErrorInterface &
  UpdateOutboundShipmentLineErrorInterface & {
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

export type StockLinesResponse = ConnectorError | StockLineConnector;

export type StocktakeConnector = {
  __typename?: 'StocktakeConnector';
  nodes: Array<StocktakeNode>;
  totalCount: Scalars['Int'];
};

export type StocktakeFilterInput = {
  description?: Maybe<SimpleStringFilterInput>;
};

export type StocktakeLineConnector = {
  __typename?: 'StocktakeLineConnector';
  nodes?: Maybe<Array<StocktakeLineNode>>;
  totalCount: Scalars['Int'];
};

export type StocktakeLineNode = {
  __typename?: 'StocktakeLineNode';
  batch?: Maybe<Scalars['String']>;
  costPricePerPack?: Maybe<Scalars['Float']>;
  countedNumPacks?: Maybe<Scalars['Int']>;
  expiryDate?: Maybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  itemCode: Scalars['String'];
  itemId: Scalars['String'];
  itemName: Scalars['String'];
  sellPricePerPack?: Maybe<Scalars['Float']>;
  snapshotNumPacks?: Maybe<Scalars['Int']>;
  snapshotPackSize?: Maybe<Scalars['Int']>;
};

export type StocktakeLinesResponse = ConnectorError | StocktakeLineConnector;

export type StocktakeListParameters = {
  filter?: Maybe<StocktakeFilterInput>;
  page?: Maybe<PaginationInput>;
  sort?: Maybe<Array<StocktakeSortInput>>;
};

export type StocktakeNode = {
  __typename?: 'StocktakeNode';
  comment?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
  enteredByName: Scalars['String'];
  entryDatetime: Scalars['DateTime'];
  id: Scalars['String'];
  lines: StocktakeLinesResponse;
  status: StocktakeNodeStatus;
  stocktakeDatetime?: Maybe<Scalars['String']>;
  stocktakeNumber: Scalars['Int'];
};

export enum StocktakeNodeStatus {
  Confirmed = 'CONFIRMED',
  Draft = 'DRAFT',
  Finalised = 'FINALISED',
}

export type StocktakeResponse = NodeError | StocktakeNode;

export enum StocktakeSortFieldInput {
  Description = 'description',
}

export type StocktakeSortInput = {
  desc?: Maybe<Scalars['Boolean']>;
  key: StocktakeSortFieldInput;
};

export type StocktakesResponse = NodeError | StocktakeConnector;

export enum SupplierRequisitionNodeStatus {
  Draft = 'DRAFT',
  Finalised = 'FINALISED',
  InProgress = 'IN_PROGRESS',
  Sent = 'SENT',
}

export type TokenExpired = RefreshTokenErrorInterface & {
  __typename?: 'TokenExpired';
  description: Scalars['String'];
};

export type UpdateCustomerRequisitionInput = {
  color?: Maybe<Scalars['String']>;
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  nameId?: Maybe<Scalars['String']>;
  orderDate?: Maybe<Scalars['String']>;
  theirReference?: Maybe<Scalars['String']>;
};

export type UpdateCustomerRequisitionLineInput = {
  calculatedQuantity?: Maybe<Scalars['Float']>;
  closingQuantity?: Maybe<Scalars['Int']>;
  comment?: Maybe<Scalars['String']>;
  expiredQuantity?: Maybe<Scalars['Float']>;
  id: Scalars['String'];
  imprestQuantity?: Maybe<Scalars['Float']>;
  issuedQuantity?: Maybe<Scalars['Float']>;
  itemCode?: Maybe<Scalars['String']>;
  itemName?: Maybe<Scalars['String']>;
  itemUnit?: Maybe<Scalars['String']>;
  monthlyConsumption?: Maybe<Scalars['Float']>;
  monthsOfSupply?: Maybe<Scalars['Float']>;
  openingQuantity?: Maybe<Scalars['Float']>;
  otherPartyClosingQuantity?: Maybe<Scalars['Int']>;
  previousQuantity?: Maybe<Scalars['Float']>;
  previousStockOnHand?: Maybe<Scalars['Float']>;
  receivedQuantity?: Maybe<Scalars['Float']>;
  requestedQuantity?: Maybe<Scalars['Float']>;
  stockAdditions?: Maybe<Scalars['Float']>;
  stockLosses?: Maybe<Scalars['Float']>;
  supplyQuantity?: Maybe<Scalars['Float']>;
};

export type UpdateCustomerRequisitionLineResponse =
  | NodeError
  | RequisitionLineNode;

export type UpdateCustomerRequisitionLineResponseWithId = {
  __typename?: 'UpdateCustomerRequisitionLineResponseWithId';
  id: Scalars['String'];
  response?: Maybe<UpdateCustomerRequisitionLineResponse>;
};

export type UpdateCustomerRequisitionResponse = NodeError | RequisitionNode;

export type UpdateCustomerRequisitionResponseWithId = {
  __typename?: 'UpdateCustomerRequisitionResponseWithId';
  id: Scalars['String'];
  response?: Maybe<UpdateCustomerRequisitionResponse>;
};

export type UpdateInboundShipmentError = {
  __typename?: 'UpdateInboundShipmentError';
  error: UpdateInboundShipmentErrorInterface;
};

export type UpdateInboundShipmentErrorInterface = {
  description: Scalars['String'];
};

export type UpdateInboundShipmentInput = {
  color?: Maybe<Scalars['String']>;
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
  locationId?: Maybe<Scalars['String']>;
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

export type UpdateStocktakeInput = {
  comment?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  status?: Maybe<StocktakeNodeStatus>;
  stocktakeDatetime?: Maybe<Scalars['String']>;
};

export type UpdateStocktakeLineInput = {
  batch?: Maybe<Scalars['String']>;
  costPricePerPack?: Maybe<Scalars['Float']>;
  countedNumPacks?: Maybe<Scalars['Int']>;
  expiryDate?: Maybe<Scalars['NaiveDate']>;
  id: Scalars['String'];
  sellPricePerPack?: Maybe<Scalars['Float']>;
};

export type UpdateStocktakeLineResponse = NodeError | StocktakeLineNode;

export type UpdateStocktakeLineResponseWithId = {
  __typename?: 'UpdateStocktakeLineResponseWithId';
  id: Scalars['String'];
  response?: Maybe<UpdateStocktakeLineResponse>;
};

export type UpdateStocktakeResponse = NodeError | StocktakeNode;

export type UpdateStocktakeResponseWithId = {
  __typename?: 'UpdateStocktakeResponseWithId';
  id: Scalars['String'];
  response?: Maybe<UpdateStocktakeResponse>;
};

export type UpdateSupplierRequisitionInput = {
  color?: Maybe<Scalars['String']>;
  comment?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  nameId?: Maybe<Scalars['String']>;
  orderDate?: Maybe<Scalars['String']>;
  theirReference?: Maybe<Scalars['String']>;
};

export type UpdateSupplierRequisitionLineInput = {
  calculatedQuantity?: Maybe<Scalars['Float']>;
  closingQuantity?: Maybe<Scalars['Int']>;
  comment?: Maybe<Scalars['String']>;
  expiredQuantity?: Maybe<Scalars['Float']>;
  id: Scalars['String'];
  imprestQuantity?: Maybe<Scalars['Float']>;
  issuedQuantity?: Maybe<Scalars['Float']>;
  itemCode?: Maybe<Scalars['String']>;
  itemName?: Maybe<Scalars['String']>;
  itemUnit?: Maybe<Scalars['String']>;
  monthlyConsumption?: Maybe<Scalars['Float']>;
  monthsOfSupply?: Maybe<Scalars['Float']>;
  openingQuantity?: Maybe<Scalars['Float']>;
  otherPartyClosingQuantity?: Maybe<Scalars['Int']>;
  previousQuantity?: Maybe<Scalars['Float']>;
  previousStockOnHand?: Maybe<Scalars['Float']>;
  receivedQuantity?: Maybe<Scalars['Float']>;
  requestedQuantity?: Maybe<Scalars['Float']>;
  stockAdditions?: Maybe<Scalars['Float']>;
  stockLosses?: Maybe<Scalars['Float']>;
  supplyQuantity?: Maybe<Scalars['Float']>;
};

export type UpdateSupplierRequisitionLineResponse =
  | NodeError
  | RequisitionLineNode;

export type UpdateSupplierRequisitionLineResponseWithId = {
  __typename?: 'UpdateSupplierRequisitionLineResponseWithId';
  id: Scalars['String'];
  response?: Maybe<UpdateSupplierRequisitionLineResponse>;
};

export type UpdateSupplierRequisitionResponse = NodeError | RequisitionNode;

export type UpdateSupplierRequisitionResponseWithId = {
  __typename?: 'UpdateSupplierRequisitionResponseWithId';
  id: Scalars['String'];
  response?: Maybe<UpdateSupplierRequisitionResponse>;
};

export type User = {
  __typename?: 'User';
  email?: Maybe<Scalars['String']>;
  userId: Scalars['String'];
};

export type UserError = {
  __typename?: 'UserError';
  error: UserErrorInterface;
};

export type UserErrorInterface = {
  description: Scalars['String'];
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
  email?: Maybe<Scalars['String']>;
  password: Scalars['String'];
  username: Scalars['String'];
};

export type UserRegisterResponse = RegisteredUser | UserRegisterError;

export type UserResponse = User | UserError;

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
        entryDatetime: string;
        invoiceNumber: number;
        onHold: boolean;
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
                expiryDate?: string | null | undefined;
                id: string;
                itemCode: string;
                itemId: string;
                itemName: string;
                numberOfPacks: number;
                packSize: number;
                note?: string | null | undefined;
                locationName?: string | null | undefined;
                sellPricePerPack: number;
                stockLine?:
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
                      __typename: 'StockLineNode';
                      availableNumberOfPacks: number;
                      batch?: string | null | undefined;
                      costPricePerPack: number;
                      expiryDate?: string | null | undefined;
                      id: string;
                      itemId: string;
                      packSize: number;
                      sellPricePerPack: number;
                      storeId: string;
                      totalNumberOfPacks: number;
                      onHold: boolean;
                      note?: string | null | undefined;
                    }
                  | null
                  | undefined;
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

export type StocktakeQueryVariables = Exact<{
  stocktakeId: Scalars['String'];
}>;

export type StocktakeQuery = {
  __typename?: 'Queries';
  stocktake:
    | { __typename: 'NodeError' }
    | {
        __typename: 'StocktakeNode';
        id: string;
        stocktakeNumber: number;
        comment?: string | null | undefined;
        stocktakeDatetime?: string | null | undefined;
        status: StocktakeNodeStatus;
        description?: string | null | undefined;
        entryDatetime: string;
        enteredByName: string;
        lines:
          | {
              __typename: 'ConnectorError';
              error:
                | { __typename?: 'DatabaseError'; description: string }
                | { __typename?: 'PaginationError'; description: string };
            }
          | {
              __typename: 'StocktakeLineConnector';
              totalCount: number;
              nodes?:
                | Array<{
                    __typename: 'StocktakeLineNode';
                    batch?: string | null | undefined;
                    itemCode: string;
                    itemName: string;
                    itemId: string;
                    id: string;
                    expiryDate?: string | null | undefined;
                    snapshotNumPacks?: number | null | undefined;
                    snapshotPackSize?: number | null | undefined;
                    countedNumPacks?: number | null | undefined;
                    sellPricePerPack?: number | null | undefined;
                    costPricePerPack?: number | null | undefined;
                  }>
                | null
                | undefined;
            };
      };
};

export type UpsertStocktakeMutationVariables = Exact<{
  deleteStocktakeLines?: Maybe<
    Array<DeleteStocktakeLineInput> | DeleteStocktakeLineInput
  >;
  insertStocktakeLines?: Maybe<
    Array<InsertStocktakeLineInput> | InsertStocktakeLineInput
  >;
  updateStocktakeLines?: Maybe<
    Array<UpdateStocktakeLineInput> | UpdateStocktakeLineInput
  >;
  updateStocktakes?: Maybe<Array<UpdateStocktakeInput> | UpdateStocktakeInput>;
}>;

export type UpsertStocktakeMutation = {
  __typename?: 'Mutations';
  batchStocktake: {
    __typename: 'BatchStocktakeResponse';
    updateStocktakes?:
      | Array<{ __typename: 'UpdateStocktakeResponseWithId'; id: string }>
      | null
      | undefined;
    insertStocktakeLines?:
      | Array<{ __typename: 'InsertStocktakeLineResponseWithId'; id: string }>
      | null
      | undefined;
    deleteStocktakeLines?:
      | Array<{ __typename: 'DeleteStocktakeLineResponseWithId'; id: string }>
      | null
      | undefined;
    updateStocktakeLines?:
      | Array<{ __typename: 'UpdateStocktakeLineResponseWithId'; id: string }>
      | null
      | undefined;
  };
};

export type StocktakesQueryVariables = Exact<{
  params?: Maybe<StocktakeListParameters>;
}>;

export type StocktakesQuery = {
  __typename?: 'Queries';
  stocktakes:
    | { __typename: 'NodeError' }
    | {
        __typename: 'StocktakeConnector';
        totalCount: number;
        nodes: Array<{
          __typename?: 'StocktakeNode';
          id: string;
          comment?: string | null | undefined;
          description?: string | null | undefined;
          stocktakeDatetime?: string | null | undefined;
          stocktakeNumber: number;
          status: StocktakeNodeStatus;
        }>;
      };
};

export type DeleteStocktakesMutationVariables = Exact<{
  ids?: Maybe<Array<DeleteStocktakeInput> | DeleteStocktakeInput>;
}>;

export type DeleteStocktakesMutation = {
  __typename?: 'Mutations';
  batchStocktake: {
    __typename: 'BatchStocktakeResponse';
    deleteStocktakes?:
      | Array<{ __typename: 'DeleteStocktakeResponseWithId'; id: string }>
      | null
      | undefined;
  };
};

export type UpdateStocktakeMutationVariables = Exact<{
  input: UpdateStocktakeInput;
}>;

export type UpdateStocktakeMutation = {
  __typename?: 'Mutations';
  updateStocktake:
    | { __typename?: 'NodeError' }
    | { __typename: 'StocktakeNode'; id: string };
};

export type InsertStocktakeMutationVariables = Exact<{
  input: InsertStocktakeInput;
}>;

export type InsertStocktakeMutation = {
  __typename?: 'Mutations';
  insertStocktake:
    | { __typename?: 'NodeError' }
    | { __typename: 'StocktakeNode'; id: string };
};

export type RequisitionsQueryVariables = Exact<{
  params?: Maybe<RequisitionListParameters>;
}>;

export type RequisitionsQuery = {
  __typename?: 'Queries';
  requisitions:
    | { __typename: 'ConnectorError' }
    | {
        __typename: 'RequisitionConnector';
        totalCount: number;
        nodes: Array<
          | {
              __typename?: 'RequisitionNode';
              id: string;
              comment?: string | null | undefined;
              orderDate?: string | null | undefined;
              theirReference?: string | null | undefined;
              requisitionNumber: number;
              status: SupplierRequisitionNodeStatus;
              otherPartyName: string;
            }
          | null
          | undefined
        >;
      };
};

export type DeleteSupplierRequisitionsMutationVariables = Exact<{
  ids?: Maybe<
    Array<DeleteSupplierRequisitionInput> | DeleteSupplierRequisitionInput
  >;
}>;

export type DeleteSupplierRequisitionsMutation = {
  __typename?: 'Mutations';
  batchSupplierRequisition: {
    __typename: 'BatchSupplierRequisitionResponse';
    deleteSupplierRequisitions?:
      | Array<{
          __typename: 'DeleteSupplierRequisitionResponseWithId';
          id: string;
        }>
      | null
      | undefined;
  };
};

export type UpdateSupplierRequisitionMutationVariables = Exact<{
  input: UpdateSupplierRequisitionInput;
}>;

export type UpdateSupplierRequisitionMutation = {
  __typename?: 'Mutations';
  updateSupplierRequisition:
    | { __typename?: 'NodeError' }
    | { __typename: 'RequisitionNode'; id: string };
};

export type InsertSupplierRequisitionMutationVariables = Exact<{
  input: InsertSupplierRequisitionInput;
}>;

export type InsertSupplierRequisitionMutation = {
  __typename?: 'Mutations';
  insertSupplierRequisition:
    | { __typename?: 'NodeError' }
    | { __typename: 'RequisitionNode'; id: string };
};

export type DeleteCustomerRequisitionsMutationVariables = Exact<{
  ids?: Maybe<
    Array<DeleteCustomerRequisitionInput> | DeleteCustomerRequisitionInput
  >;
}>;

export type DeleteCustomerRequisitionsMutation = {
  __typename?: 'Mutations';
  batchCustomerRequisition: {
    __typename: 'BatchCustomerRequisitionResponse';
    deleteCustomerRequisitions?:
      | Array<{
          __typename: 'DeleteCustomerRequisitionResponseWithId';
          id: string;
        }>
      | null
      | undefined;
  };
};

export type UpdateCustomerRequisitionMutationVariables = Exact<{
  input: UpdateCustomerRequisitionInput;
}>;

export type UpdateCustomerRequisitionMutation = {
  __typename?: 'Mutations';
  updateCustomerRequisition:
    | { __typename?: 'NodeError' }
    | { __typename: 'RequisitionNode'; id: string };
};

export type InsertCustomerRequisitionMutationVariables = Exact<{
  input: InsertCustomerRequisitionInput;
}>;

export type InsertCustomerRequisitionMutation = {
  __typename?: 'Mutations';
  insertCustomerRequisition:
    | { __typename?: 'NodeError' }
    | { __typename: 'RequisitionNode'; id: string };
};

export type RequisitionQueryVariables = Exact<{
  id: Scalars['String'];
}>;

export type RequisitionQuery = {
  __typename?: 'Queries';
  requisition:
    | { __typename: 'NodeError' }
    | {
        __typename: 'RequisitionNode';
        id: string;
        orderDate?: string | null | undefined;
        comment?: string | null | undefined;
        theirReference?: string | null | undefined;
        type?: RequisitionNodeType | null | undefined;
        requisitionNumber: number;
        thresholdMOS?: number | null | undefined;
        maxMOS?: number | null | undefined;
        status: SupplierRequisitionNodeStatus;
        otherPartyId: string;
        lines:
          | {
              __typename: 'ConnectorError';
              error:
                | { __typename?: 'DatabaseError'; description: string }
                | { __typename?: 'PaginationError'; description: string };
            }
          | {
              __typename: 'RequisitionLineConnector';
              totalCount: number;
              nodes: Array<{
                __typename?: 'RequisitionLineNode';
                id: string;
                itemName?: string | null | undefined;
                itemCode?: string | null | undefined;
                itemUnit?: string | null | undefined;
                itemId: string;
                comment?: string | null | undefined;
                monthlyConsumption?: number | null | undefined;
                monthsOfSupply?: number | null | undefined;
                supplyQuantity?: number | null | undefined;
                openingQuantity?: number | null | undefined;
                issuedQuantity?: number | null | undefined;
                requestedQuantity?: number | null | undefined;
                receivedQuantity?: number | null | undefined;
                imprestQuantity?: number | null | undefined;
                previousQuantity?: number | null | undefined;
                calculatedQuantity?: number | null | undefined;
                previousStockOnHand?: number | null | undefined;
                closingQuantity?: number | null | undefined;
                stockAdditions?: number | null | undefined;
                stockLosses?: number | null | undefined;
                expiredQuantity?: number | null | undefined;
                otherPartyClosingQuantity?: number | null | undefined;
              }>;
            };
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
                | { __typename?: 'DatabaseError'; description: string }
                | { __typename?: 'RecordNotFound'; description: string };
            };
      };
};

export type UpsertSupplierRequisitionMutationVariables = Exact<{
  deleteSupplierRequisitionLines?: Maybe<
    | Array<DeleteSupplierRequisitionLineInput>
    | DeleteSupplierRequisitionLineInput
  >;
  insertSupplierRequisitionLines?: Maybe<
    | Array<InsertSupplierRequisitionLineInput>
    | InsertSupplierRequisitionLineInput
  >;
  updateSupplierRequisitionLines?: Maybe<
    | Array<UpdateSupplierRequisitionLineInput>
    | UpdateSupplierRequisitionLineInput
  >;
  updateSupplierRequisitions?: Maybe<
    Array<UpdateSupplierRequisitionInput> | UpdateSupplierRequisitionInput
  >;
}>;

export type UpsertSupplierRequisitionMutation = {
  __typename?: 'Mutations';
  batchSupplierRequisition: {
    __typename: 'BatchSupplierRequisitionResponse';
    updateSupplierRequisitions?:
      | Array<{
          __typename: 'UpdateSupplierRequisitionResponseWithId';
          id: string;
        }>
      | null
      | undefined;
    insertSupplierRequisitionLines?:
      | Array<{
          __typename: 'InsertSupplierRequisitionLineResponseWithId';
          id: string;
        }>
      | null
      | undefined;
    deleteSupplierRequisitionLines?:
      | Array<{
          __typename: 'DeleteSupplierRequisitionLineResponseWithId';
          id: string;
        }>
      | null
      | undefined;
    updateSupplierRequisitionLines?:
      | Array<{
          __typename: 'UpdateSupplierRequisitionLineResponseWithId';
          id: string;
        }>
      | null
      | undefined;
  };
};

export type UpsertCustomerRequisitionMutationVariables = Exact<{
  deleteCustomerRequisitionLines?: Maybe<
    | Array<DeleteCustomerRequisitionLineInput>
    | DeleteCustomerRequisitionLineInput
  >;
  insertCustomerRequisitionLines?: Maybe<
    | Array<InsertCustomerRequisitionLineInput>
    | InsertCustomerRequisitionLineInput
  >;
  updateCustomerRequisitionLines?: Maybe<
    | Array<UpdateCustomerRequisitionLineInput>
    | UpdateCustomerRequisitionLineInput
  >;
  updateCustomerRequisitions?: Maybe<
    Array<UpdateCustomerRequisitionInput> | UpdateCustomerRequisitionInput
  >;
}>;

export type UpsertCustomerRequisitionMutation = {
  __typename?: 'Mutations';
  batchCustomerRequisition: {
    __typename: 'BatchCustomerRequisitionResponse';
    updateCustomerRequisitions?:
      | Array<{
          __typename: 'UpdateCustomerRequisitionResponseWithId';
          id: string;
        }>
      | null
      | undefined;
    insertCustomerRequisitionLines?:
      | Array<{
          __typename: 'InsertCustomerRequisitionLineResponseWithId';
          id: string;
        }>
      | null
      | undefined;
    deleteCustomerRequisitionLines?:
      | Array<{
          __typename: 'DeleteCustomerRequisitionLineResponseWithId';
          id: string;
        }>
      | null
      | undefined;
    updateCustomerRequisitionLines?:
      | Array<{
          __typename: 'UpdateCustomerRequisitionLineResponseWithId';
          id: string;
        }>
      | null
      | undefined;
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
          entryDatetime: string;
          id: string;
          invoiceNumber: number;
          otherPartyId: string;
          otherPartyName: string;
          theirReference?: string | null | undefined;
          type: InvoiceNodeType;
          status: InvoiceNodeStatus;
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
  filter?: Maybe<NameFilterInput>;
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
  filter?: Maybe<ItemFilterInput>;
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
          code: string;
          id: string;
          isVisible: boolean;
          name: string;
          unitName?: string | null | undefined;
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
                  expiryDate?: string | null | undefined;
                  id: string;
                  itemId: string;
                  packSize: number;
                  sellPricePerPack: number;
                  totalNumberOfPacks: number;
                  onHold: boolean;
                  note?: string | null | undefined;
                  storeId: string;
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
  filter?: Maybe<ItemFilterInput>;
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
          code: string;
          id: string;
          isVisible: boolean;
          name: string;
          unitName?: string | null | undefined;
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

export type InvoiceCountsQueryVariables = Exact<{
  type: InvoiceNodeType;
}>;

export type InvoiceCountsQuery = {
  __typename?: 'Queries';
  invoiceCounts:
    | {
        __typename: 'ConnectorError';
        error:
          | { __typename?: 'DatabaseError'; description: string }
          | { __typename?: 'PaginationError'; description: string };
      }
    | {
        __typename: 'InvoiceCountsConnector';
        toBePicked?: number | null | undefined;
        created?:
          | {
              __typename?: 'InvoiceCountsCreated';
              today: number;
              thisWeek: number;
            }
          | null
          | undefined;
      };
};

export type StockCountsQueryVariables = Exact<{ [key: string]: never }>;

export type StockCountsQuery = {
  __typename?: 'Queries';
  stockCounts:
    | {
        __typename: 'ConnectorError';
        error:
          | { __typename?: 'DatabaseError'; description: string }
          | { __typename?: 'PaginationError'; description: string };
      }
    | {
        __typename: 'StockCountsConnector';
        expired: number;
        expiringSoon: number;
      };
};

export type UpsertOutboundShipmentMutationVariables = Exact<{
  deleteOutboundShipmentLines?: Maybe<
    Array<DeleteOutboundShipmentLineInput> | DeleteOutboundShipmentLineInput
  >;
  insertOutboundShipmentLines?: Maybe<
    Array<InsertOutboundShipmentLineInput> | InsertOutboundShipmentLineInput
  >;
  updateOutboundShipmentLines?: Maybe<
    Array<UpdateOutboundShipmentLineInput> | UpdateOutboundShipmentLineInput
  >;
  updateOutboundShipments?: Maybe<
    Array<UpdateOutboundShipmentInput> | UpdateOutboundShipmentInput
  >;
}>;

export type UpsertOutboundShipmentMutation = {
  __typename?: 'Mutations';
  batchOutboundShipment: {
    __typename: 'BatchOutboundShipmentResponse';
    insertOutboundShipmentLines?:
      | Array<{
          __typename: 'InsertOutboundShipmentLineResponseWithId';
          id: string;
        }>
      | null
      | undefined;
    updateOutboundShipments?:
      | Array<{
          __typename: 'UpdateOutboundShipmentResponseWithId';
          id: string;
        }>
      | null
      | undefined;
    deleteOutboundShipmentLines?:
      | Array<{
          __typename: 'DeleteOutboundShipmentLineResponseWithId';
          id: string;
        }>
      | null
      | undefined;
    updateOutboundShipmentLines?:
      | Array<{
          __typename: 'UpdateOutboundShipmentLineResponseWithId';
          id: string;
        }>
      | null
      | undefined;
  };
};

export type UpsertInboundShipmentMutationVariables = Exact<{
  deleteInboundShipmentLines?: Maybe<
    Array<DeleteInboundShipmentLineInput> | DeleteInboundShipmentLineInput
  >;
  insertInboundShipmentLines?: Maybe<
    Array<InsertInboundShipmentLineInput> | InsertInboundShipmentLineInput
  >;
  updateInboundShipmentLines?: Maybe<
    Array<UpdateInboundShipmentLineInput> | UpdateInboundShipmentLineInput
  >;
  updateInboundShipments?: Maybe<
    Array<UpdateInboundShipmentInput> | UpdateInboundShipmentInput
  >;
}>;

export type UpsertInboundShipmentMutation = {
  __typename?: 'Mutations';
  batchInboundShipment: {
    __typename: 'BatchInboundShipmentResponse';
    updateInboundShipments?:
      | Array<{ __typename: 'UpdateInboundShipmentResponseWithId'; id: string }>
      | null
      | undefined;
    insertInboundShipmentLines?:
      | Array<{
          __typename: 'InsertInboundShipmentLineResponseWithId';
          id: string;
        }>
      | null
      | undefined;
    deleteInboundShipmentLines?:
      | Array<{
          __typename: 'DeleteInboundShipmentLineResponseWithId';
          id: string;
        }>
      | null
      | undefined;
    updateInboundShipmentLines?:
      | Array<{
          __typename: 'UpdateInboundShipmentLineResponseWithId';
          id: string;
        }>
      | null
      | undefined;
  };
};

export type UpdateInboundShipmentMutationVariables = Exact<{
  input: UpdateInboundShipmentInput;
}>;

export type UpdateInboundShipmentMutation = {
  __typename?: 'Mutations';
  updateInboundShipment:
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
        __typename: 'UpdateInboundShipmentError';
        error:
          | {
              __typename?: 'CannotChangeInvoiceBackToDraft';
              description: string;
            }
          | {
              __typename?: 'CannotChangeStatusOfInvoiceOnHold';
              description: string;
            }
          | { __typename?: 'CannotEditFinalisedInvoice'; description: string }
          | { __typename?: 'DatabaseError'; description: string }
          | { __typename?: 'ForeignKeyError'; description: string }
          | {
              __typename?: 'InvoiceDoesNotBelongToCurrentStore';
              description: string;
            }
          | { __typename?: 'NotAnInboundShipment'; description: string }
          | { __typename?: 'OtherPartyNotASupplier'; description: string }
          | { __typename?: 'RecordNotFound'; description: string };
      };
};

export type DeleteInboundShipmentsMutationVariables = Exact<{
  ids?: Maybe<Array<DeleteInboundShipmentInput> | DeleteInboundShipmentInput>;
}>;

export type DeleteInboundShipmentsMutation = {
  __typename?: 'Mutations';
  batchInboundShipment: {
    __typename: 'BatchInboundShipmentResponse';
    deleteInboundShipments?:
      | Array<{ __typename: 'DeleteInboundShipmentResponseWithId'; id: string }>
      | null
      | undefined;
  };
};

export type InsertInboundShipmentMutationVariables = Exact<{
  id: Scalars['String'];
  otherPartyId: Scalars['String'];
}>;

export type InsertInboundShipmentMutation = {
  __typename?: 'Mutations';
  insertInboundShipment:
    | {
        __typename: 'InsertInboundShipmentError';
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
              __typename: 'OtherPartyNotASupplier';
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
        entryDatetime
        invoiceNumber
        onHold
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
              itemId
              itemName
              numberOfPacks
              packSize
              note
              locationName
              sellPricePerPack
              stockLine {
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
                ... on StockLineNode {
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
                  note
                }
              }
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
export const StocktakeDocument = gql`
  query stocktake($stocktakeId: String!) {
    stocktake(id: $stocktakeId) {
      __typename
      ... on StocktakeNode {
        __typename
        id
        stocktakeNumber
        comment
        stocktakeDatetime
        status
        description
        entryDatetime
        enteredByName
        lines {
          __typename
          ... on ConnectorError {
            __typename
            error {
              description
            }
          }
          ... on StocktakeLineConnector {
            __typename
            nodes {
              __typename
              batch
              itemCode
              itemName
              itemId
              id
              expiryDate
              snapshotNumPacks
              snapshotPackSize
              countedNumPacks
              sellPricePerPack
              costPricePerPack
            }
            totalCount
          }
        }
      }
    }
  }
`;
export const UpsertStocktakeDocument = gql`
  mutation upsertStocktake(
    $deleteStocktakeLines: [DeleteStocktakeLineInput!]
    $insertStocktakeLines: [InsertStocktakeLineInput!]
    $updateStocktakeLines: [UpdateStocktakeLineInput!]
    $updateStocktakes: [UpdateStocktakeInput!]
  ) {
    batchStocktake(
      deleteStocktakeLines: $deleteStocktakeLines
      insertStocktakeLines: $insertStocktakeLines
      updateStocktakeLines: $updateStocktakeLines
      updateStocktakes: $updateStocktakes
    ) {
      __typename
      updateStocktakes {
        __typename
        id
      }
      insertStocktakeLines {
        __typename
        id
      }
      deleteStocktakeLines {
        __typename
        id
      }
      updateStocktakeLines {
        __typename
        id
      }
    }
  }
`;
export const StocktakesDocument = gql`
  query stocktakes($params: StocktakeListParameters) {
    stocktakes(params: $params) {
      __typename
      ... on StocktakeConnector {
        nodes {
          id
          comment
          description
          stocktakeDatetime
          stocktakeNumber
          status
        }
        totalCount
      }
    }
  }
`;
export const DeleteStocktakesDocument = gql`
  mutation deleteStocktakes($ids: [DeleteStocktakeInput!]) {
    batchStocktake(deleteStocktakes: $ids) {
      __typename
      deleteStocktakes {
        __typename
        id
      }
    }
  }
`;
export const UpdateStocktakeDocument = gql`
  mutation updateStocktake($input: UpdateStocktakeInput!) {
    updateStocktake(input: $input) {
      ... on StocktakeNode {
        __typename
        id
      }
    }
  }
`;
export const InsertStocktakeDocument = gql`
  mutation insertStocktake($input: InsertStocktakeInput!) {
    insertStocktake(input: $input) {
      ... on StocktakeNode {
        __typename
        id
      }
    }
  }
`;
export const RequisitionsDocument = gql`
  query requisitions($params: RequisitionListParameters) {
    requisitions(params: $params) {
      __typename
      ... on RequisitionConnector {
        nodes {
          id
          comment
          orderDate
          theirReference
          requisitionNumber
          status
          otherPartyName
        }
        totalCount
      }
    }
  }
`;
export const DeleteSupplierRequisitionsDocument = gql`
  mutation deleteSupplierRequisitions($ids: [DeleteSupplierRequisitionInput!]) {
    batchSupplierRequisition(deleteSupplierRequisitions: $ids) {
      __typename
      deleteSupplierRequisitions {
        __typename
        id
      }
    }
  }
`;
export const UpdateSupplierRequisitionDocument = gql`
  mutation updateSupplierRequisition($input: UpdateSupplierRequisitionInput!) {
    updateSupplierRequisition(input: $input) {
      ... on RequisitionNode {
        __typename
        id
      }
    }
  }
`;
export const InsertSupplierRequisitionDocument = gql`
  mutation insertSupplierRequisition($input: InsertSupplierRequisitionInput!) {
    insertSupplierRequisition(input: $input) {
      ... on RequisitionNode {
        __typename
        id
      }
    }
  }
`;
export const DeleteCustomerRequisitionsDocument = gql`
  mutation deleteCustomerRequisitions($ids: [DeleteCustomerRequisitionInput!]) {
    batchCustomerRequisition(deleteCustomerRequisitions: $ids) {
      __typename
      deleteCustomerRequisitions {
        __typename
        id
      }
    }
  }
`;
export const UpdateCustomerRequisitionDocument = gql`
  mutation updateCustomerRequisition($input: UpdateCustomerRequisitionInput!) {
    updateCustomerRequisition(input: $input) {
      ... on RequisitionNode {
        __typename
        id
      }
    }
  }
`;
export const InsertCustomerRequisitionDocument = gql`
  mutation insertCustomerRequisition($input: InsertCustomerRequisitionInput!) {
    insertCustomerRequisition(input: $input) {
      ... on RequisitionNode {
        __typename
        id
      }
    }
  }
`;
export const RequisitionDocument = gql`
  query requisition($id: String!) {
    requisition(id: $id) {
      __typename
      ... on RequisitionNode {
        __typename
        id
        orderDate
        comment
        theirReference
        type
        requisitionNumber
        thresholdMOS
        maxMOS
        status
        otherPartyId
        lines {
          __typename
          ... on ConnectorError {
            error {
              description
            }
          }
          ... on RequisitionLineConnector {
            totalCount
            nodes {
              id
              itemName
              itemCode
              itemUnit
              itemId
              comment
              monthlyConsumption
              monthsOfSupply
              supplyQuantity
              openingQuantity
              issuedQuantity
              requestedQuantity
              receivedQuantity
              imprestQuantity
              previousQuantity
              calculatedQuantity
              previousStockOnHand
              closingQuantity
              stockAdditions
              stockLosses
              expiredQuantity
              otherPartyClosingQuantity
            }
          }
        }
        otherParty {
          __typename
          ... on NodeError {
            error {
              description
            }
          }
          ... on NameNode {
            id
            name
            code
            isCustomer
            isSupplier
          }
        }
      }
    }
  }
`;
export const UpsertSupplierRequisitionDocument = gql`
  mutation upsertSupplierRequisition(
    $deleteSupplierRequisitionLines: [DeleteSupplierRequisitionLineInput!]
    $insertSupplierRequisitionLines: [InsertSupplierRequisitionLineInput!]
    $updateSupplierRequisitionLines: [UpdateSupplierRequisitionLineInput!]
    $updateSupplierRequisitions: [UpdateSupplierRequisitionInput!]
  ) {
    batchSupplierRequisition(
      deleteSupplierRequisitionLines: $deleteSupplierRequisitionLines
      insertSupplierRequisitionLines: $insertSupplierRequisitionLines
      updateSupplierRequisitionLines: $updateSupplierRequisitionLines
      updateSupplierRequisitions: $updateSupplierRequisitions
    ) {
      __typename
      updateSupplierRequisitions {
        __typename
        id
      }
      insertSupplierRequisitionLines {
        __typename
        id
      }
      deleteSupplierRequisitionLines {
        __typename
        id
      }
      updateSupplierRequisitionLines {
        __typename
        id
      }
    }
  }
`;
export const UpsertCustomerRequisitionDocument = gql`
  mutation upsertCustomerRequisition(
    $deleteCustomerRequisitionLines: [DeleteCustomerRequisitionLineInput!]
    $insertCustomerRequisitionLines: [InsertCustomerRequisitionLineInput!]
    $updateCustomerRequisitionLines: [UpdateCustomerRequisitionLineInput!]
    $updateCustomerRequisitions: [UpdateCustomerRequisitionInput!]
  ) {
    batchCustomerRequisition(
      deleteCustomerRequisitionLines: $deleteCustomerRequisitionLines
      insertCustomerRequisitionLines: $insertCustomerRequisitionLines
      updateCustomerRequisitionLines: $updateCustomerRequisitionLines
      updateCustomerRequisitions: $updateCustomerRequisitions
    ) {
      __typename
      updateCustomerRequisitions {
        __typename
        id
      }
      insertCustomerRequisitionLines {
        __typename
        id
      }
      deleteCustomerRequisitionLines {
        __typename
        id
      }
      updateCustomerRequisitionLines {
        __typename
        id
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
          entryDatetime
          id
          invoiceNumber
          otherPartyId
          otherPartyName
          theirReference
          type
          status
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
    $filter: NameFilterInput
  ) {
    names(
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
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
    $filter: ItemFilterInput
  ) {
    items(
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
                totalNumberOfPacks
                onHold
                note
                storeId
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
    $filter: ItemFilterInput
  ) {
    items(
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
      ... on ItemConnector {
        __typename
        nodes {
          __typename
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
export const InvoiceCountsDocument = gql`
  query invoiceCounts($type: InvoiceNodeType!) {
    invoiceCounts(type: $type) {
      ... on InvoiceCountsConnector {
        __typename
        created {
          today
          thisWeek
        }
        toBePicked
      }
      ... on ConnectorError {
        __typename
        error {
          description
        }
      }
    }
  }
`;
export const StockCountsDocument = gql`
  query stockCounts {
    stockCounts {
      ... on StockCountsConnector {
        __typename
        expired
        expiringSoon
      }
      ... on ConnectorError {
        __typename
        error {
          description
        }
      }
    }
  }
`;
export const UpsertOutboundShipmentDocument = gql`
  mutation upsertOutboundShipment(
    $deleteOutboundShipmentLines: [DeleteOutboundShipmentLineInput!]
    $insertOutboundShipmentLines: [InsertOutboundShipmentLineInput!]
    $updateOutboundShipmentLines: [UpdateOutboundShipmentLineInput!]
    $updateOutboundShipments: [UpdateOutboundShipmentInput!]
  ) {
    batchOutboundShipment(
      deleteOutboundShipmentLines: $deleteOutboundShipmentLines
      insertOutboundShipmentLines: $insertOutboundShipmentLines
      updateOutboundShipmentLines: $updateOutboundShipmentLines
      updateOutboundShipments: $updateOutboundShipments
    ) {
      __typename
      insertOutboundShipmentLines {
        __typename
        id
      }
      updateOutboundShipments {
        __typename
        id
      }
      deleteOutboundShipmentLines {
        __typename
        id
      }
      updateOutboundShipmentLines {
        __typename
        id
      }
    }
  }
`;
export const UpsertInboundShipmentDocument = gql`
  mutation upsertInboundShipment(
    $deleteInboundShipmentLines: [DeleteInboundShipmentLineInput!]
    $insertInboundShipmentLines: [InsertInboundShipmentLineInput!]
    $updateInboundShipmentLines: [UpdateInboundShipmentLineInput!]
    $updateInboundShipments: [UpdateInboundShipmentInput!]
  ) {
    batchInboundShipment(
      deleteInboundShipmentLines: $deleteInboundShipmentLines
      insertInboundShipmentLines: $insertInboundShipmentLines
      updateInboundShipmentLines: $updateInboundShipmentLines
      updateInboundShipments: $updateInboundShipments
    ) {
      __typename
      updateInboundShipments {
        __typename
        id
      }
      insertInboundShipmentLines {
        __typename
        id
      }
      deleteInboundShipmentLines {
        __typename
        id
      }
      updateInboundShipmentLines {
        __typename
        id
      }
    }
  }
`;
export const UpdateInboundShipmentDocument = gql`
  mutation updateInboundShipment($input: UpdateInboundShipmentInput!) {
    updateInboundShipment(input: $input) {
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
      ... on UpdateInboundShipmentError {
        __typename
        error {
          description
        }
      }
    }
  }
`;
export const DeleteInboundShipmentsDocument = gql`
  mutation deleteInboundShipments($ids: [DeleteInboundShipmentInput!]) {
    batchInboundShipment(deleteInboundShipments: $ids) {
      __typename
      deleteInboundShipments {
        __typename
        id
      }
    }
  }
`;
export const InsertInboundShipmentDocument = gql`
  mutation insertInboundShipment($id: String!, $otherPartyId: String!) {
    insertInboundShipment(
      input: { id: $id, status: DRAFT, otherPartyId: $otherPartyId }
    ) {
      __typename
      ... on InvoiceNode {
        id
      }
      ... on InsertInboundShipmentError {
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
          ... on OtherPartyNotASupplier {
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
    stocktake(
      variables: StocktakeQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<StocktakeQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StocktakeQuery>(StocktakeDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'stocktake'
      );
    },
    upsertStocktake(
      variables?: UpsertStocktakeMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<UpsertStocktakeMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertStocktakeMutation>(
            UpsertStocktakeDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'upsertStocktake'
      );
    },
    stocktakes(
      variables?: StocktakesQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<StocktakesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StocktakesQuery>(StocktakesDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'stocktakes'
      );
    },
    deleteStocktakes(
      variables?: DeleteStocktakesMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<DeleteStocktakesMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteStocktakesMutation>(
            DeleteStocktakesDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deleteStocktakes'
      );
    },
    updateStocktake(
      variables: UpdateStocktakeMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<UpdateStocktakeMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateStocktakeMutation>(
            UpdateStocktakeDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateStocktake'
      );
    },
    insertStocktake(
      variables: InsertStocktakeMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<InsertStocktakeMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertStocktakeMutation>(
            InsertStocktakeDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertStocktake'
      );
    },
    requisitions(
      variables?: RequisitionsQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<RequisitionsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<RequisitionsQuery>(RequisitionsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'requisitions'
      );
    },
    deleteSupplierRequisitions(
      variables?: DeleteSupplierRequisitionsMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<DeleteSupplierRequisitionsMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteSupplierRequisitionsMutation>(
            DeleteSupplierRequisitionsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deleteSupplierRequisitions'
      );
    },
    updateSupplierRequisition(
      variables: UpdateSupplierRequisitionMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<UpdateSupplierRequisitionMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateSupplierRequisitionMutation>(
            UpdateSupplierRequisitionDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateSupplierRequisition'
      );
    },
    insertSupplierRequisition(
      variables: InsertSupplierRequisitionMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<InsertSupplierRequisitionMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertSupplierRequisitionMutation>(
            InsertSupplierRequisitionDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertSupplierRequisition'
      );
    },
    deleteCustomerRequisitions(
      variables?: DeleteCustomerRequisitionsMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<DeleteCustomerRequisitionsMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteCustomerRequisitionsMutation>(
            DeleteCustomerRequisitionsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deleteCustomerRequisitions'
      );
    },
    updateCustomerRequisition(
      variables: UpdateCustomerRequisitionMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<UpdateCustomerRequisitionMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateCustomerRequisitionMutation>(
            UpdateCustomerRequisitionDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateCustomerRequisition'
      );
    },
    insertCustomerRequisition(
      variables: InsertCustomerRequisitionMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<InsertCustomerRequisitionMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertCustomerRequisitionMutation>(
            InsertCustomerRequisitionDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertCustomerRequisition'
      );
    },
    requisition(
      variables: RequisitionQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<RequisitionQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<RequisitionQuery>(RequisitionDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'requisition'
      );
    },
    upsertSupplierRequisition(
      variables?: UpsertSupplierRequisitionMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<UpsertSupplierRequisitionMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertSupplierRequisitionMutation>(
            UpsertSupplierRequisitionDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'upsertSupplierRequisition'
      );
    },
    upsertCustomerRequisition(
      variables?: UpsertCustomerRequisitionMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<UpsertCustomerRequisitionMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertCustomerRequisitionMutation>(
            UpsertCustomerRequisitionDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'upsertCustomerRequisition'
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
    invoiceCounts(
      variables: InvoiceCountsQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<InvoiceCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InvoiceCountsQuery>(InvoiceCountsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'invoiceCounts'
      );
    },
    stockCounts(
      variables?: StockCountsQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<StockCountsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<StockCountsQuery>(StockCountsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'stockCounts'
      );
    },
    upsertOutboundShipment(
      variables?: UpsertOutboundShipmentMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<UpsertOutboundShipmentMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertOutboundShipmentMutation>(
            UpsertOutboundShipmentDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'upsertOutboundShipment'
      );
    },
    upsertInboundShipment(
      variables?: UpsertInboundShipmentMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<UpsertInboundShipmentMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertInboundShipmentMutation>(
            UpsertInboundShipmentDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'upsertInboundShipment'
      );
    },
    updateInboundShipment(
      variables: UpdateInboundShipmentMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<UpdateInboundShipmentMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateInboundShipmentMutation>(
            UpdateInboundShipmentDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateInboundShipment'
      );
    },
    deleteInboundShipments(
      variables?: DeleteInboundShipmentsMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<DeleteInboundShipmentsMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteInboundShipmentsMutation>(
            DeleteInboundShipmentsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deleteInboundShipments'
      );
    },
    insertInboundShipment(
      variables: InsertInboundShipmentMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<InsertInboundShipmentMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertInboundShipmentMutation>(
            InsertInboundShipmentDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertInboundShipment'
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInvoiceQuery((req, res, ctx) => {
 *   const { id } = req.variables;
 *   return res(
 *     ctx.data({ invoice })
 *   )
 * })
 */
export const mockInvoiceQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<InvoiceQueryVariables>,
    GraphQLContext<InvoiceQuery>,
    any
  >
) => graphql.query<InvoiceQuery, InvoiceQueryVariables>('invoice', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockStocktakeQuery((req, res, ctx) => {
 *   const { stocktakeId } = req.variables;
 *   return res(
 *     ctx.data({ stocktake })
 *   )
 * })
 */
export const mockStocktakeQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<StocktakeQueryVariables>,
    GraphQLContext<StocktakeQuery>,
    any
  >
) =>
  graphql.query<StocktakeQuery, StocktakeQueryVariables>('stocktake', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpsertStocktakeMutation((req, res, ctx) => {
 *   const { deleteStocktakeLines, insertStocktakeLines, updateStocktakeLines, updateStocktakes } = req.variables;
 *   return res(
 *     ctx.data({ batchStocktake })
 *   )
 * })
 */
export const mockUpsertStocktakeMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<UpsertStocktakeMutationVariables>,
    GraphQLContext<UpsertStocktakeMutation>,
    any
  >
) =>
  graphql.mutation<UpsertStocktakeMutation, UpsertStocktakeMutationVariables>(
    'upsertStocktake',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockStocktakesQuery((req, res, ctx) => {
 *   const { params } = req.variables;
 *   return res(
 *     ctx.data({ stocktakes })
 *   )
 * })
 */
export const mockStocktakesQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<StocktakesQueryVariables>,
    GraphQLContext<StocktakesQuery>,
    any
  >
) =>
  graphql.query<StocktakesQuery, StocktakesQueryVariables>(
    'stocktakes',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteStocktakesMutation((req, res, ctx) => {
 *   const { ids } = req.variables;
 *   return res(
 *     ctx.data({ batchStocktake })
 *   )
 * })
 */
export const mockDeleteStocktakesMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<DeleteStocktakesMutationVariables>,
    GraphQLContext<DeleteStocktakesMutation>,
    any
  >
) =>
  graphql.mutation<DeleteStocktakesMutation, DeleteStocktakesMutationVariables>(
    'deleteStocktakes',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateStocktakeMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ updateStocktake })
 *   )
 * })
 */
export const mockUpdateStocktakeMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<UpdateStocktakeMutationVariables>,
    GraphQLContext<UpdateStocktakeMutation>,
    any
  >
) =>
  graphql.mutation<UpdateStocktakeMutation, UpdateStocktakeMutationVariables>(
    'updateStocktake',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertStocktakeMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ insertStocktake })
 *   )
 * })
 */
export const mockInsertStocktakeMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<InsertStocktakeMutationVariables>,
    GraphQLContext<InsertStocktakeMutation>,
    any
  >
) =>
  graphql.mutation<InsertStocktakeMutation, InsertStocktakeMutationVariables>(
    'insertStocktake',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockRequisitionsQuery((req, res, ctx) => {
 *   const { params } = req.variables;
 *   return res(
 *     ctx.data({ requisitions })
 *   )
 * })
 */
export const mockRequisitionsQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<RequisitionsQueryVariables>,
    GraphQLContext<RequisitionsQuery>,
    any
  >
) =>
  graphql.query<RequisitionsQuery, RequisitionsQueryVariables>(
    'requisitions',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteSupplierRequisitionsMutation((req, res, ctx) => {
 *   const { ids } = req.variables;
 *   return res(
 *     ctx.data({ batchSupplierRequisition })
 *   )
 * })
 */
export const mockDeleteSupplierRequisitionsMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<DeleteSupplierRequisitionsMutationVariables>,
    GraphQLContext<DeleteSupplierRequisitionsMutation>,
    any
  >
) =>
  graphql.mutation<
    DeleteSupplierRequisitionsMutation,
    DeleteSupplierRequisitionsMutationVariables
  >('deleteSupplierRequisitions', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateSupplierRequisitionMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ updateSupplierRequisition })
 *   )
 * })
 */
export const mockUpdateSupplierRequisitionMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<UpdateSupplierRequisitionMutationVariables>,
    GraphQLContext<UpdateSupplierRequisitionMutation>,
    any
  >
) =>
  graphql.mutation<
    UpdateSupplierRequisitionMutation,
    UpdateSupplierRequisitionMutationVariables
  >('updateSupplierRequisition', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertSupplierRequisitionMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ insertSupplierRequisition })
 *   )
 * })
 */
export const mockInsertSupplierRequisitionMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<InsertSupplierRequisitionMutationVariables>,
    GraphQLContext<InsertSupplierRequisitionMutation>,
    any
  >
) =>
  graphql.mutation<
    InsertSupplierRequisitionMutation,
    InsertSupplierRequisitionMutationVariables
  >('insertSupplierRequisition', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteCustomerRequisitionsMutation((req, res, ctx) => {
 *   const { ids } = req.variables;
 *   return res(
 *     ctx.data({ batchCustomerRequisition })
 *   )
 * })
 */
export const mockDeleteCustomerRequisitionsMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<DeleteCustomerRequisitionsMutationVariables>,
    GraphQLContext<DeleteCustomerRequisitionsMutation>,
    any
  >
) =>
  graphql.mutation<
    DeleteCustomerRequisitionsMutation,
    DeleteCustomerRequisitionsMutationVariables
  >('deleteCustomerRequisitions', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateCustomerRequisitionMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ updateCustomerRequisition })
 *   )
 * })
 */
export const mockUpdateCustomerRequisitionMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<UpdateCustomerRequisitionMutationVariables>,
    GraphQLContext<UpdateCustomerRequisitionMutation>,
    any
  >
) =>
  graphql.mutation<
    UpdateCustomerRequisitionMutation,
    UpdateCustomerRequisitionMutationVariables
  >('updateCustomerRequisition', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertCustomerRequisitionMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ insertCustomerRequisition })
 *   )
 * })
 */
export const mockInsertCustomerRequisitionMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<InsertCustomerRequisitionMutationVariables>,
    GraphQLContext<InsertCustomerRequisitionMutation>,
    any
  >
) =>
  graphql.mutation<
    InsertCustomerRequisitionMutation,
    InsertCustomerRequisitionMutationVariables
  >('insertCustomerRequisition', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockRequisitionQuery((req, res, ctx) => {
 *   const { id } = req.variables;
 *   return res(
 *     ctx.data({ requisition })
 *   )
 * })
 */
export const mockRequisitionQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<RequisitionQueryVariables>,
    GraphQLContext<RequisitionQuery>,
    any
  >
) =>
  graphql.query<RequisitionQuery, RequisitionQueryVariables>(
    'requisition',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpsertSupplierRequisitionMutation((req, res, ctx) => {
 *   const { deleteSupplierRequisitionLines, insertSupplierRequisitionLines, updateSupplierRequisitionLines, updateSupplierRequisitions } = req.variables;
 *   return res(
 *     ctx.data({ batchSupplierRequisition })
 *   )
 * })
 */
export const mockUpsertSupplierRequisitionMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<UpsertSupplierRequisitionMutationVariables>,
    GraphQLContext<UpsertSupplierRequisitionMutation>,
    any
  >
) =>
  graphql.mutation<
    UpsertSupplierRequisitionMutation,
    UpsertSupplierRequisitionMutationVariables
  >('upsertSupplierRequisition', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpsertCustomerRequisitionMutation((req, res, ctx) => {
 *   const { deleteCustomerRequisitionLines, insertCustomerRequisitionLines, updateCustomerRequisitionLines, updateCustomerRequisitions } = req.variables;
 *   return res(
 *     ctx.data({ batchCustomerRequisition })
 *   )
 * })
 */
export const mockUpsertCustomerRequisitionMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<UpsertCustomerRequisitionMutationVariables>,
    GraphQLContext<UpsertCustomerRequisitionMutation>,
    any
  >
) =>
  graphql.mutation<
    UpsertCustomerRequisitionMutation,
    UpsertCustomerRequisitionMutationVariables
  >('upsertCustomerRequisition', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInvoicesQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter } = req.variables;
 *   return res(
 *     ctx.data({ invoices })
 *   )
 * })
 */
export const mockInvoicesQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<InvoicesQueryVariables>,
    GraphQLContext<InvoicesQuery>,
    any
  >
) => graphql.query<InvoicesQuery, InvoicesQueryVariables>('invoices', resolver);

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
export const mockNamesQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<NamesQueryVariables>,
    GraphQLContext<NamesQuery>,
    any
  >
) => graphql.query<NamesQuery, NamesQueryVariables>('names', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockItemsWithStockLinesQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter } = req.variables;
 *   return res(
 *     ctx.data({ items })
 *   )
 * })
 */
export const mockItemsWithStockLinesQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<ItemsWithStockLinesQueryVariables>,
    GraphQLContext<ItemsWithStockLinesQuery>,
    any
  >
) =>
  graphql.query<ItemsWithStockLinesQuery, ItemsWithStockLinesQueryVariables>(
    'itemsWithStockLines',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockItemsListViewQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter } = req.variables;
 *   return res(
 *     ctx.data({ items })
 *   )
 * })
 */
export const mockItemsListViewQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<ItemsListViewQueryVariables>,
    GraphQLContext<ItemsListViewQuery>,
    any
  >
) =>
  graphql.query<ItemsListViewQuery, ItemsListViewQueryVariables>(
    'itemsListView',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertOutboundShipmentMutation((req, res, ctx) => {
 *   const { id, otherPartyId } = req.variables;
 *   return res(
 *     ctx.data({ insertOutboundShipment })
 *   )
 * })
 */
export const mockInsertOutboundShipmentMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<InsertOutboundShipmentMutationVariables>,
    GraphQLContext<InsertOutboundShipmentMutation>,
    any
  >
) =>
  graphql.mutation<
    InsertOutboundShipmentMutation,
    InsertOutboundShipmentMutationVariables
  >('insertOutboundShipment', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateOutboundShipmentMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ updateOutboundShipment })
 *   )
 * })
 */
export const mockUpdateOutboundShipmentMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<UpdateOutboundShipmentMutationVariables>,
    GraphQLContext<UpdateOutboundShipmentMutation>,
    any
  >
) =>
  graphql.mutation<
    UpdateOutboundShipmentMutation,
    UpdateOutboundShipmentMutationVariables
  >('updateOutboundShipment', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteOutboundShipmentsMutation((req, res, ctx) => {
 *   const { ids } = req.variables;
 *   return res(
 *     ctx.data({ batchOutboundShipment })
 *   )
 * })
 */
export const mockDeleteOutboundShipmentsMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<DeleteOutboundShipmentsMutationVariables>,
    GraphQLContext<DeleteOutboundShipmentsMutation>,
    any
  >
) =>
  graphql.mutation<
    DeleteOutboundShipmentsMutation,
    DeleteOutboundShipmentsMutationVariables
  >('deleteOutboundShipments', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInvoiceCountsQuery((req, res, ctx) => {
 *   const { type } = req.variables;
 *   return res(
 *     ctx.data({ invoiceCounts })
 *   )
 * })
 */
export const mockInvoiceCountsQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<InvoiceCountsQueryVariables>,
    GraphQLContext<InvoiceCountsQuery>,
    any
  >
) =>
  graphql.query<InvoiceCountsQuery, InvoiceCountsQueryVariables>(
    'invoiceCounts',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockStockCountsQuery((req, res, ctx) => {
 *   return res(
 *     ctx.data({ stockCounts })
 *   )
 * })
 */
export const mockStockCountsQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<StockCountsQueryVariables>,
    GraphQLContext<StockCountsQuery>,
    any
  >
) =>
  graphql.query<StockCountsQuery, StockCountsQueryVariables>(
    'stockCounts',
    resolver
  );

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpsertOutboundShipmentMutation((req, res, ctx) => {
 *   const { deleteOutboundShipmentLines, insertOutboundShipmentLines, updateOutboundShipmentLines, updateOutboundShipments } = req.variables;
 *   return res(
 *     ctx.data({ batchOutboundShipment })
 *   )
 * })
 */
export const mockUpsertOutboundShipmentMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<UpsertOutboundShipmentMutationVariables>,
    GraphQLContext<UpsertOutboundShipmentMutation>,
    any
  >
) =>
  graphql.mutation<
    UpsertOutboundShipmentMutation,
    UpsertOutboundShipmentMutationVariables
  >('upsertOutboundShipment', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpsertInboundShipmentMutation((req, res, ctx) => {
 *   const { deleteInboundShipmentLines, insertInboundShipmentLines, updateInboundShipmentLines, updateInboundShipments } = req.variables;
 *   return res(
 *     ctx.data({ batchInboundShipment })
 *   )
 * })
 */
export const mockUpsertInboundShipmentMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<UpsertInboundShipmentMutationVariables>,
    GraphQLContext<UpsertInboundShipmentMutation>,
    any
  >
) =>
  graphql.mutation<
    UpsertInboundShipmentMutation,
    UpsertInboundShipmentMutationVariables
  >('upsertInboundShipment', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateInboundShipmentMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ updateInboundShipment })
 *   )
 * })
 */
export const mockUpdateInboundShipmentMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<UpdateInboundShipmentMutationVariables>,
    GraphQLContext<UpdateInboundShipmentMutation>,
    any
  >
) =>
  graphql.mutation<
    UpdateInboundShipmentMutation,
    UpdateInboundShipmentMutationVariables
  >('updateInboundShipment', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteInboundShipmentsMutation((req, res, ctx) => {
 *   const { ids } = req.variables;
 *   return res(
 *     ctx.data({ batchInboundShipment })
 *   )
 * })
 */
export const mockDeleteInboundShipmentsMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<DeleteInboundShipmentsMutationVariables>,
    GraphQLContext<DeleteInboundShipmentsMutation>,
    any
  >
) =>
  graphql.mutation<
    DeleteInboundShipmentsMutation,
    DeleteInboundShipmentsMutationVariables
  >('deleteInboundShipments', resolver);

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertInboundShipmentMutation((req, res, ctx) => {
 *   const { id, otherPartyId } = req.variables;
 *   return res(
 *     ctx.data({ insertInboundShipment })
 *   )
 * })
 */
export const mockInsertInboundShipmentMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<InsertInboundShipmentMutationVariables>,
    GraphQLContext<InsertInboundShipmentMutation>,
    any
  >
) =>
  graphql.mutation<
    InsertInboundShipmentMutation,
    InsertInboundShipmentMutationVariables
  >('insertInboundShipment', resolver);
