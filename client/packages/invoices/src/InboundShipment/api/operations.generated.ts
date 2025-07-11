import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type InboundLineFragment = {
  __typename: 'InvoiceLineNode';
  id: string;
  type: Types.InvoiceLineNodeType;
  batch?: string | null;
  costPricePerPack: number;
  sellPricePerPack: number;
  expiryDate?: string | null;
  numberOfPacks: number;
  shippedNumberOfPacks?: number | null;
  packSize: number;
  note?: string | null;
  invoiceId: string;
  totalBeforeTax: number;
  totalAfterTax: number;
  taxPercentage?: number | null;
  foreignCurrencyPriceBeforeTax?: number | null;
  itemName: string;
  itemVariantId?: string | null;
  vvmStatusId?: string | null;
  linkedInvoiceId?: string | null;
  donor?: { __typename: 'NameNode'; id: string; name: string } | null;
  campaign?: { __typename: 'CampaignNode'; id: string; name: string } | null;
  item: {
    __typename: 'ItemNode';
    id: string;
    name: string;
    code: string;
    unitName?: string | null;
    defaultPackSize: number;
    isVaccine: boolean;
    doses: number;
  };
  location?: {
    __typename: 'LocationNode';
    name: string;
    id: string;
    code: string;
    onHold: boolean;
  } | null;
  stockLine?: {
    __typename: 'StockLineNode';
    availableNumberOfPacks: number;
    batch?: string | null;
    costPricePerPack: number;
    expiryDate?: string | null;
    id: string;
    itemId: string;
    packSize: number;
    sellPricePerPack: number;
    storeId: string;
    totalNumberOfPacks: number;
    onHold: boolean;
    note?: string | null;
    vvmStatusId?: string | null;
  } | null;
};

export type InboundFragment = {
  __typename: 'InvoiceNode';
  id: string;
  comment?: string | null;
  createdDatetime: string;
  allocatedDatetime?: string | null;
  deliveredDatetime?: string | null;
  receivedDatetime?: string | null;
  pickedDatetime?: string | null;
  shippedDatetime?: string | null;
  verifiedDatetime?: string | null;
  invoiceNumber: number;
  colour?: string | null;
  onHold: boolean;
  otherPartyId: string;
  otherPartyName: string;
  status: Types.InvoiceNodeStatus;
  theirReference?: string | null;
  transportReference?: string | null;
  type: Types.InvoiceNodeType;
  taxPercentage?: number | null;
  expectedDeliveryDate?: string | null;
  currencyRate: number;
  defaultDonor?: { __typename: 'NameNode'; id: string; name: string } | null;
  linkedShipment?: { __typename: 'InvoiceNode'; id: string } | null;
  user?: {
    __typename: 'UserNode';
    username: string;
    email?: string | null;
  } | null;
  requisition?: {
    __typename: 'RequisitionNode';
    id: string;
    requisitionNumber: number;
    createdDatetime: string;
    user?: { __typename: 'UserNode'; username: string } | null;
  } | null;
  lines: {
    __typename: 'InvoiceLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'InvoiceLineNode';
      id: string;
      type: Types.InvoiceLineNodeType;
      batch?: string | null;
      costPricePerPack: number;
      sellPricePerPack: number;
      expiryDate?: string | null;
      numberOfPacks: number;
      shippedNumberOfPacks?: number | null;
      packSize: number;
      note?: string | null;
      invoiceId: string;
      totalBeforeTax: number;
      totalAfterTax: number;
      taxPercentage?: number | null;
      foreignCurrencyPriceBeforeTax?: number | null;
      itemName: string;
      itemVariantId?: string | null;
      vvmStatusId?: string | null;
      linkedInvoiceId?: string | null;
      donor?: { __typename: 'NameNode'; id: string; name: string } | null;
      campaign?: {
        __typename: 'CampaignNode';
        id: string;
        name: string;
      } | null;
      item: {
        __typename: 'ItemNode';
        id: string;
        name: string;
        code: string;
        unitName?: string | null;
        defaultPackSize: number;
        isVaccine: boolean;
        doses: number;
      };
      location?: {
        __typename: 'LocationNode';
        name: string;
        id: string;
        code: string;
        onHold: boolean;
      } | null;
      stockLine?: {
        __typename: 'StockLineNode';
        availableNumberOfPacks: number;
        batch?: string | null;
        costPricePerPack: number;
        expiryDate?: string | null;
        id: string;
        itemId: string;
        packSize: number;
        sellPricePerPack: number;
        storeId: string;
        totalNumberOfPacks: number;
        onHold: boolean;
        note?: string | null;
        vvmStatusId?: string | null;
      } | null;
    }>;
  };
  otherParty: {
    __typename: 'NameNode';
    id: string;
    name: string;
    code: string;
    isCustomer: boolean;
    isSupplier: boolean;
    isOnHold: boolean;
    store?: { __typename: 'StoreNode'; id: string; code: string } | null;
  };
  pricing: {
    __typename: 'PricingNode';
    totalAfterTax: number;
    totalBeforeTax: number;
    stockTotalBeforeTax: number;
    stockTotalAfterTax: number;
    serviceTotalAfterTax: number;
    serviceTotalBeforeTax: number;
    taxPercentage?: number | null;
    foreignCurrencyTotalAfterTax?: number | null;
  };
  currency?: {
    __typename: 'CurrencyNode';
    id: string;
    code: string;
    rate: number;
    isHomeCurrency: boolean;
  } | null;
};

export type InboundRowFragment = {
  __typename: 'InvoiceNode';
  comment?: string | null;
  createdDatetime: string;
  deliveredDatetime?: string | null;
  receivedDatetime?: string | null;
  id: string;
  invoiceNumber: number;
  otherPartyName: string;
  status: Types.InvoiceNodeStatus;
  colour?: string | null;
  theirReference?: string | null;
  taxPercentage?: number | null;
  onHold: boolean;
  currencyRate: number;
  pricing: {
    __typename: 'PricingNode';
    totalAfterTax: number;
    taxPercentage?: number | null;
    foreignCurrencyTotalAfterTax?: number | null;
  };
  linkedShipment?: { __typename: 'InvoiceNode'; id: string } | null;
  currency?: {
    __typename: 'CurrencyNode';
    id: string;
    code: string;
    rate: number;
    isHomeCurrency: boolean;
  } | null;
};

export type InvoicesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type InvoicesQuery = {
  __typename: 'Queries';
  invoices: {
    __typename: 'InvoiceConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'InvoiceNode';
      comment?: string | null;
      createdDatetime: string;
      deliveredDatetime?: string | null;
      receivedDatetime?: string | null;
      id: string;
      invoiceNumber: number;
      otherPartyName: string;
      status: Types.InvoiceNodeStatus;
      colour?: string | null;
      theirReference?: string | null;
      taxPercentage?: number | null;
      onHold: boolean;
      currencyRate: number;
      pricing: {
        __typename: 'PricingNode';
        totalAfterTax: number;
        taxPercentage?: number | null;
        foreignCurrencyTotalAfterTax?: number | null;
      };
      linkedShipment?: { __typename: 'InvoiceNode'; id: string } | null;
      currency?: {
        __typename: 'CurrencyNode';
        id: string;
        code: string;
        rate: number;
        isHomeCurrency: boolean;
      } | null;
    }>;
  };
};

export type InvoiceQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type InvoiceQuery = {
  __typename: 'Queries';
  invoice:
    | {
        __typename: 'InvoiceNode';
        id: string;
        comment?: string | null;
        createdDatetime: string;
        allocatedDatetime?: string | null;
        deliveredDatetime?: string | null;
        receivedDatetime?: string | null;
        pickedDatetime?: string | null;
        shippedDatetime?: string | null;
        verifiedDatetime?: string | null;
        invoiceNumber: number;
        colour?: string | null;
        onHold: boolean;
        otherPartyId: string;
        otherPartyName: string;
        status: Types.InvoiceNodeStatus;
        theirReference?: string | null;
        transportReference?: string | null;
        type: Types.InvoiceNodeType;
        taxPercentage?: number | null;
        expectedDeliveryDate?: string | null;
        currencyRate: number;
        defaultDonor?: {
          __typename: 'NameNode';
          id: string;
          name: string;
        } | null;
        linkedShipment?: { __typename: 'InvoiceNode'; id: string } | null;
        user?: {
          __typename: 'UserNode';
          username: string;
          email?: string | null;
        } | null;
        requisition?: {
          __typename: 'RequisitionNode';
          id: string;
          requisitionNumber: number;
          createdDatetime: string;
          user?: { __typename: 'UserNode'; username: string } | null;
        } | null;
        lines: {
          __typename: 'InvoiceLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'InvoiceLineNode';
            id: string;
            type: Types.InvoiceLineNodeType;
            batch?: string | null;
            costPricePerPack: number;
            sellPricePerPack: number;
            expiryDate?: string | null;
            numberOfPacks: number;
            shippedNumberOfPacks?: number | null;
            packSize: number;
            note?: string | null;
            invoiceId: string;
            totalBeforeTax: number;
            totalAfterTax: number;
            taxPercentage?: number | null;
            foreignCurrencyPriceBeforeTax?: number | null;
            itemName: string;
            itemVariantId?: string | null;
            vvmStatusId?: string | null;
            linkedInvoiceId?: string | null;
            donor?: { __typename: 'NameNode'; id: string; name: string } | null;
            campaign?: {
              __typename: 'CampaignNode';
              id: string;
              name: string;
            } | null;
            item: {
              __typename: 'ItemNode';
              id: string;
              name: string;
              code: string;
              unitName?: string | null;
              defaultPackSize: number;
              isVaccine: boolean;
              doses: number;
            };
            location?: {
              __typename: 'LocationNode';
              name: string;
              id: string;
              code: string;
              onHold: boolean;
            } | null;
            stockLine?: {
              __typename: 'StockLineNode';
              availableNumberOfPacks: number;
              batch?: string | null;
              costPricePerPack: number;
              expiryDate?: string | null;
              id: string;
              itemId: string;
              packSize: number;
              sellPricePerPack: number;
              storeId: string;
              totalNumberOfPacks: number;
              onHold: boolean;
              note?: string | null;
              vvmStatusId?: string | null;
            } | null;
          }>;
        };
        otherParty: {
          __typename: 'NameNode';
          id: string;
          name: string;
          code: string;
          isCustomer: boolean;
          isSupplier: boolean;
          isOnHold: boolean;
          store?: { __typename: 'StoreNode'; id: string; code: string } | null;
        };
        pricing: {
          __typename: 'PricingNode';
          totalAfterTax: number;
          totalBeforeTax: number;
          stockTotalBeforeTax: number;
          stockTotalAfterTax: number;
          serviceTotalAfterTax: number;
          serviceTotalBeforeTax: number;
          taxPercentage?: number | null;
          foreignCurrencyTotalAfterTax?: number | null;
        };
        currency?: {
          __typename: 'CurrencyNode';
          id: string;
          code: string;
          rate: number;
          isHomeCurrency: boolean;
        } | null;
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

export type InboundByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type InboundByNumberQuery = {
  __typename: 'Queries';
  invoiceByNumber:
    | {
        __typename: 'InvoiceNode';
        id: string;
        comment?: string | null;
        createdDatetime: string;
        allocatedDatetime?: string | null;
        deliveredDatetime?: string | null;
        receivedDatetime?: string | null;
        pickedDatetime?: string | null;
        shippedDatetime?: string | null;
        verifiedDatetime?: string | null;
        invoiceNumber: number;
        colour?: string | null;
        onHold: boolean;
        otherPartyId: string;
        otherPartyName: string;
        status: Types.InvoiceNodeStatus;
        theirReference?: string | null;
        transportReference?: string | null;
        type: Types.InvoiceNodeType;
        taxPercentage?: number | null;
        expectedDeliveryDate?: string | null;
        currencyRate: number;
        defaultDonor?: {
          __typename: 'NameNode';
          id: string;
          name: string;
        } | null;
        linkedShipment?: { __typename: 'InvoiceNode'; id: string } | null;
        user?: {
          __typename: 'UserNode';
          username: string;
          email?: string | null;
        } | null;
        requisition?: {
          __typename: 'RequisitionNode';
          id: string;
          requisitionNumber: number;
          createdDatetime: string;
          user?: { __typename: 'UserNode'; username: string } | null;
        } | null;
        lines: {
          __typename: 'InvoiceLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'InvoiceLineNode';
            id: string;
            type: Types.InvoiceLineNodeType;
            batch?: string | null;
            costPricePerPack: number;
            sellPricePerPack: number;
            expiryDate?: string | null;
            numberOfPacks: number;
            shippedNumberOfPacks?: number | null;
            packSize: number;
            note?: string | null;
            invoiceId: string;
            totalBeforeTax: number;
            totalAfterTax: number;
            taxPercentage?: number | null;
            foreignCurrencyPriceBeforeTax?: number | null;
            itemName: string;
            itemVariantId?: string | null;
            vvmStatusId?: string | null;
            linkedInvoiceId?: string | null;
            donor?: { __typename: 'NameNode'; id: string; name: string } | null;
            campaign?: {
              __typename: 'CampaignNode';
              id: string;
              name: string;
            } | null;
            item: {
              __typename: 'ItemNode';
              id: string;
              name: string;
              code: string;
              unitName?: string | null;
              defaultPackSize: number;
              isVaccine: boolean;
              doses: number;
            };
            location?: {
              __typename: 'LocationNode';
              name: string;
              id: string;
              code: string;
              onHold: boolean;
            } | null;
            stockLine?: {
              __typename: 'StockLineNode';
              availableNumberOfPacks: number;
              batch?: string | null;
              costPricePerPack: number;
              expiryDate?: string | null;
              id: string;
              itemId: string;
              packSize: number;
              sellPricePerPack: number;
              storeId: string;
              totalNumberOfPacks: number;
              onHold: boolean;
              note?: string | null;
              vvmStatusId?: string | null;
            } | null;
          }>;
        };
        otherParty: {
          __typename: 'NameNode';
          id: string;
          name: string;
          code: string;
          isCustomer: boolean;
          isSupplier: boolean;
          isOnHold: boolean;
          store?: { __typename: 'StoreNode'; id: string; code: string } | null;
        };
        pricing: {
          __typename: 'PricingNode';
          totalAfterTax: number;
          totalBeforeTax: number;
          stockTotalBeforeTax: number;
          stockTotalAfterTax: number;
          serviceTotalAfterTax: number;
          serviceTotalBeforeTax: number;
          taxPercentage?: number | null;
          foreignCurrencyTotalAfterTax?: number | null;
        };
        currency?: {
          __typename: 'CurrencyNode';
          id: string;
          code: string;
          rate: number;
          isHomeCurrency: boolean;
        } | null;
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

export type UpdateInboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateInboundShipmentInput;
}>;

export type UpdateInboundShipmentMutation = {
  __typename: 'Mutations';
  updateInboundShipment:
    | { __typename: 'InvoiceNode'; id: string; invoiceNumber: number }
    | {
        __typename: 'UpdateInboundShipmentError';
        error:
          | {
              __typename: 'CannotChangeStatusOfInvoiceOnHold';
              description: string;
            }
          | { __typename: 'CannotEditInvoice'; description: string }
          | { __typename: 'CannotIssueInForeignCurrency'; description: string }
          | { __typename: 'CannotReverseInvoiceStatus'; description: string }
          | { __typename: 'OtherPartyNotASupplier'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      };
};

export type DeleteInboundShipmentsMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  deleteInboundShipments:
    | Array<Types.DeleteInboundShipmentInput>
    | Types.DeleteInboundShipmentInput;
}>;

export type DeleteInboundShipmentsMutation = {
  __typename: 'Mutations';
  batchInboundShipment: {
    __typename: 'BatchInboundShipmentResponse';
    deleteInboundShipments?: Array<{
      __typename: 'DeleteInboundShipmentResponseWithId';
      id: string;
      response:
        | {
            __typename: 'DeleteInboundShipmentError';
            error:
              | {
                  __typename: 'CannotDeleteInvoiceWithLines';
                  description: string;
                }
              | { __typename: 'CannotEditInvoice'; description: string }
              | { __typename: 'RecordNotFound'; description: string };
          }
        | { __typename: 'DeleteResponse'; id: string };
    }> | null;
  };
};

export type InsertInboundShipmentMutationVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  otherPartyId: Types.Scalars['String']['input'];
  requisitionId?: Types.InputMaybe<Types.Scalars['String']['input']>;
  storeId: Types.Scalars['String']['input'];
}>;

export type InsertInboundShipmentMutation = {
  __typename: 'Mutations';
  insertInboundShipment:
    | {
        __typename: 'InsertInboundShipmentError';
        error:
          | { __typename: 'OtherPartyNotASupplier'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string };
      }
    | { __typename: 'InvoiceNode'; id: string; invoiceNumber: number };
};

export type LineLinkedToTransferredInvoiceErrorFragment = {
  __typename: 'LineLinkedToTransferredInvoice';
  description: string;
};

export type DeleteInboundShipmentLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchInboundShipmentInput;
}>;

export type DeleteInboundShipmentLinesMutation = {
  __typename: 'Mutations';
  batchInboundShipment: {
    __typename: 'BatchInboundShipmentResponse';
    deleteInboundShipmentLines?: Array<{
      __typename: 'DeleteInboundShipmentLineResponseWithId';
      id: string;
      response:
        | {
            __typename: 'DeleteInboundShipmentLineError';
            error:
              | { __typename: 'BatchIsReserved'; description: string }
              | { __typename: 'CannotEditInvoice'; description: string }
              | {
                  __typename: 'ForeignKeyError';
                  description: string;
                  key: Types.ForeignKey;
                }
              | {
                  __typename: 'LineLinkedToTransferredInvoice';
                  description: string;
                }
              | { __typename: 'RecordNotFound'; description: string };
          }
        | { __typename: 'DeleteResponse'; id: string };
    }> | null;
  };
};

export type UpsertInboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchInboundShipmentInput;
}>;

export type UpsertInboundShipmentMutation = {
  __typename: 'Mutations';
  batchInboundShipment: {
    __typename: 'BatchInboundShipmentResponse';
    updateInboundShipments?: Array<{
      __typename: 'UpdateInboundShipmentResponseWithId';
      id: string;
      response:
        | { __typename: 'InvoiceNode'; id: string; invoiceNumber: number }
        | {
            __typename: 'UpdateInboundShipmentError';
            error:
              | {
                  __typename: 'CannotChangeStatusOfInvoiceOnHold';
                  description: string;
                }
              | { __typename: 'CannotEditInvoice'; description: string }
              | {
                  __typename: 'CannotIssueInForeignCurrency';
                  description: string;
                }
              | {
                  __typename: 'CannotReverseInvoiceStatus';
                  description: string;
                }
              | { __typename: 'OtherPartyNotASupplier'; description: string }
              | { __typename: 'OtherPartyNotVisible'; description: string }
              | { __typename: 'RecordNotFound'; description: string };
          };
    }> | null;
    insertInboundShipments?: Array<{
      __typename: 'InsertInboundShipmentResponseWithId';
      id: string;
      response:
        | {
            __typename: 'InsertInboundShipmentError';
            error:
              | { __typename: 'OtherPartyNotASupplier'; description: string }
              | { __typename: 'OtherPartyNotVisible'; description: string };
          }
        | { __typename: 'InvoiceNode'; id: string; invoiceNumber: number };
    }> | null;
    deleteInboundShipments?: Array<{
      __typename: 'DeleteInboundShipmentResponseWithId';
      id: string;
      response:
        | {
            __typename: 'DeleteInboundShipmentError';
            error:
              | {
                  __typename: 'CannotDeleteInvoiceWithLines';
                  description: string;
                }
              | { __typename: 'CannotEditInvoice'; description: string }
              | { __typename: 'RecordNotFound'; description: string };
          }
        | { __typename: 'DeleteResponse'; id: string };
    }> | null;
    updateInboundShipmentServiceLines?: Array<{
      __typename: 'UpdateInboundShipmentServiceLineResponseWithId';
      id: string;
      response:
        | { __typename: 'InvoiceLineNode'; id: string }
        | {
            __typename: 'UpdateInboundShipmentServiceLineError';
            error:
              | { __typename: 'CannotEditInvoice'; description: string }
              | {
                  __typename: 'ForeignKeyError';
                  description: string;
                  key: Types.ForeignKey;
                }
              | { __typename: 'RecordNotFound'; description: string };
          };
    }> | null;
    updateInboundShipmentLines?: Array<{
      __typename: 'UpdateInboundShipmentLineResponseWithId';
      id: string;
      response:
        | { __typename: 'InvoiceLineNode'; id: string }
        | {
            __typename: 'UpdateInboundShipmentLineError';
            error:
              | { __typename: 'BatchIsReserved'; description: string }
              | { __typename: 'CannotEditInvoice'; description: string }
              | {
                  __typename: 'ForeignKeyError';
                  description: string;
                  key: Types.ForeignKey;
                }
              | { __typename: 'NotAnInboundShipment'; description: string }
              | { __typename: 'RecordNotFound'; description: string };
          };
    }> | null;
    insertInboundShipmentServiceLines?: Array<{
      __typename: 'InsertInboundShipmentServiceLineResponseWithId';
      id: string;
      response:
        | {
            __typename: 'InsertInboundShipmentServiceLineError';
            error:
              | { __typename: 'CannotEditInvoice'; description: string }
              | {
                  __typename: 'ForeignKeyError';
                  description: string;
                  key: Types.ForeignKey;
                };
          }
        | { __typename: 'InvoiceLineNode'; id: string };
    }> | null;
    insertInboundShipmentLines?: Array<{
      __typename: 'InsertInboundShipmentLineResponseWithId';
      id: string;
      response:
        | {
            __typename: 'InsertInboundShipmentLineError';
            error:
              | { __typename: 'CannotEditInvoice'; description: string }
              | {
                  __typename: 'ForeignKeyError';
                  description: string;
                  key: Types.ForeignKey;
                };
          }
        | { __typename: 'InvoiceLineNode'; id: string };
    }> | null;
    deleteInboundShipmentServiceLines?: Array<{
      __typename: 'DeleteInboundShipmentServiceLineResponseWithId';
      id: string;
      response:
        | {
            __typename: 'DeleteInboundShipmentServiceLineError';
            error:
              | { __typename: 'CannotEditInvoice'; description: string }
              | {
                  __typename: 'ForeignKeyError';
                  description: string;
                  key: Types.ForeignKey;
                }
              | { __typename: 'RecordNotFound'; description: string };
          }
        | { __typename: 'DeleteResponse'; id: string };
    }> | null;
    deleteInboundShipmentLines?: Array<{
      __typename: 'DeleteInboundShipmentLineResponseWithId';
      id: string;
      response:
        | {
            __typename: 'DeleteInboundShipmentLineError';
            error:
              | { __typename: 'BatchIsReserved'; description: string }
              | { __typename: 'CannotEditInvoice'; description: string }
              | {
                  __typename: 'ForeignKeyError';
                  description: string;
                  key: Types.ForeignKey;
                }
              | {
                  __typename: 'LineLinkedToTransferredInvoice';
                  description: string;
                }
              | { __typename: 'RecordNotFound'; description: string };
          }
        | { __typename: 'DeleteResponse'; id: string };
    }> | null;
  };
};

export type AddToInboundShipmentFromMasterListMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  shipmentId: Types.Scalars['String']['input'];
  masterListId: Types.Scalars['String']['input'];
}>;

export type AddToInboundShipmentFromMasterListMutation = {
  __typename: 'Mutations';
  addToInboundShipmentFromMasterList:
    | {
        __typename: 'AddToInboundShipmentFromMasterListError';
        error:
          | { __typename: 'CannotEditInvoice'; description: string }
          | {
              __typename: 'MasterListNotFoundForThisStore';
              description: string;
            }
          | { __typename: 'RecordNotFound'; description: string };
      }
    | { __typename: 'InvoiceLineConnector'; totalCount: number };
};

export type LinkedRequestRowFragment = {
  __typename: 'RequisitionNode';
  id: string;
  createdDatetime: string;
  requisitionNumber: number;
  theirReference?: string | null;
  comment?: string | null;
  user?: { __typename: 'UserNode'; username: string } | null;
  program?: { __typename: 'ProgramNode'; name: string } | null;
};

export type LinkedRequestLineFragment = {
  __typename: 'RequisitionLineNode';
  id: string;
  requestedQuantity: number;
  item: { __typename: 'ItemNode'; id: string; code: string; name: string };
};

export type LinkedRequestWithLinesFragment = {
  __typename: 'RequisitionNode';
  id: string;
  createdDatetime: string;
  requisitionNumber: number;
  theirReference?: string | null;
  comment?: string | null;
  lines: {
    __typename: 'RequisitionLineConnector';
    nodes: Array<{
      __typename: 'RequisitionLineNode';
      id: string;
      requestedQuantity: number;
      item: { __typename: 'ItemNode'; id: string; code: string; name: string };
    }>;
  };
  user?: { __typename: 'UserNode'; username: string } | null;
  program?: { __typename: 'ProgramNode'; name: string } | null;
};

export type RequestsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.RequisitionFilterInput>;
  sort?: Types.InputMaybe<
    Array<Types.RequisitionSortInput> | Types.RequisitionSortInput
  >;
}>;

export type RequestsQuery = {
  __typename: 'Queries';
  requisitions: {
    __typename: 'RequisitionConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'RequisitionNode';
      id: string;
      createdDatetime: string;
      requisitionNumber: number;
      theirReference?: string | null;
      comment?: string | null;
      user?: { __typename: 'UserNode'; username: string } | null;
      program?: { __typename: 'ProgramNode'; name: string } | null;
    }>;
  };
};

export type RequestQueryVariables = Types.Exact<{
  id: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type RequestQuery = {
  __typename: 'Queries';
  requisition:
    | { __typename: 'RecordNotFound' }
    | {
        __typename: 'RequisitionNode';
        id: string;
        createdDatetime: string;
        requisitionNumber: number;
        theirReference?: string | null;
        comment?: string | null;
        lines: {
          __typename: 'RequisitionLineConnector';
          nodes: Array<{
            __typename: 'RequisitionLineNode';
            id: string;
            requestedQuantity: number;
            item: {
              __typename: 'ItemNode';
              id: string;
              code: string;
              name: string;
            };
          }>;
        };
        user?: { __typename: 'UserNode'; username: string } | null;
        program?: { __typename: 'ProgramNode'; name: string } | null;
      };
};

export type InsertLinesFromInternalOrderMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchInboundShipmentInput;
}>;

export type InsertLinesFromInternalOrderMutation = {
  __typename: 'Mutations';
  batchInboundShipment: {
    __typename: 'BatchInboundShipmentResponse';
    insertFromInternalOrderLines?: Array<{
      __typename: 'InsertInboundShipmentLineFromInternalOrderLineResponseWithId';
      id: string;
      response: { __typename: 'InvoiceLineNode'; id: string };
    }> | null;
  };
};

export const InboundLineFragmentDoc = gql`
  fragment InboundLine on InvoiceLineNode {
    __typename
    id
    type
    batch
    costPricePerPack
    sellPricePerPack
    expiryDate
    numberOfPacks
    shippedNumberOfPacks
    packSize
    note
    type
    invoiceId
    totalBeforeTax
    totalAfterTax
    taxPercentage
    foreignCurrencyPriceBeforeTax
    itemName
    itemVariantId
    vvmStatusId
    linkedInvoiceId
    donor(storeId: $storeId) {
      id
      name
    }
    campaign {
      id
      name
    }
    item {
      __typename
      id
      name
      code
      unitName
      defaultPackSize
      isVaccine
      doses
    }
    location {
      __typename
      name
      id
      code
      onHold
    }
    stockLine {
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
      vvmStatusId
    }
  }
`;
export const InboundFragmentDoc = gql`
  fragment Inbound on InvoiceNode {
    __typename
    id
    comment
    createdDatetime
    allocatedDatetime
    deliveredDatetime
    receivedDatetime
    pickedDatetime
    shippedDatetime
    verifiedDatetime
    invoiceNumber
    colour
    onHold
    otherPartyId
    otherPartyName
    status
    theirReference
    transportReference
    type
    taxPercentage
    expectedDeliveryDate
    defaultDonor(storeId: $storeId) {
      id
      name
    }
    linkedShipment {
      __typename
      id
    }
    user {
      __typename
      username
      email
    }
    requisition {
      __typename
      id
      requisitionNumber
      createdDatetime
      user {
        __typename
        username
      }
    }
    lines {
      __typename
      nodes {
        ...InboundLine
      }
      totalCount
    }
    otherParty(storeId: $storeId) {
      __typename
      id
      name
      code
      isCustomer
      isSupplier
      isOnHold
      store {
        id
        code
      }
    }
    pricing {
      __typename
      totalAfterTax
      totalBeforeTax
      stockTotalBeforeTax
      stockTotalAfterTax
      serviceTotalAfterTax
      serviceTotalBeforeTax
      taxPercentage
      foreignCurrencyTotalAfterTax
    }
    currency {
      id
      code
      rate
      isHomeCurrency
    }
    currencyRate
  }
  ${InboundLineFragmentDoc}
`;
export const InboundRowFragmentDoc = gql`
  fragment InboundRow on InvoiceNode {
    __typename
    comment
    createdDatetime
    deliveredDatetime
    receivedDatetime
    id
    invoiceNumber
    otherPartyName
    status
    colour
    theirReference
    taxPercentage
    onHold
    pricing {
      __typename
      totalAfterTax
      taxPercentage
      foreignCurrencyTotalAfterTax
    }
    linkedShipment {
      id
    }
    currency {
      id
      code
      rate
      isHomeCurrency
    }
    currencyRate
  }
`;
export const LineLinkedToTransferredInvoiceErrorFragmentDoc = gql`
  fragment LineLinkedToTransferredInvoiceError on LineLinkedToTransferredInvoice {
    __typename
    description
  }
`;
export const LinkedRequestRowFragmentDoc = gql`
  fragment LinkedRequestRow on RequisitionNode {
    __typename
    id
    createdDatetime
    requisitionNumber
    theirReference
    user {
      username
    }
    program {
      name
    }
    comment
  }
`;
export const LinkedRequestLineFragmentDoc = gql`
  fragment LinkedRequestLine on RequisitionLineNode {
    __typename
    id
    requestedQuantity
    item {
      id
      code
      name
    }
  }
`;
export const LinkedRequestWithLinesFragmentDoc = gql`
  fragment LinkedRequestWithLines on RequisitionNode {
    ...LinkedRequestRow
    lines {
      nodes {
        ...LinkedRequestLine
      }
    }
  }
  ${LinkedRequestRowFragmentDoc}
  ${LinkedRequestLineFragmentDoc}
`;
export const InvoicesDocument = gql`
  query invoices(
    $first: Int
    $offset: Int
    $key: InvoiceSortFieldInput!
    $desc: Boolean
    $filter: InvoiceFilterInput
    $storeId: String!
  ) {
    invoices(
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
      storeId: $storeId
    ) {
      ... on InvoiceConnector {
        __typename
        totalCount
        nodes {
          ...InboundRow
        }
      }
    }
  }
  ${InboundRowFragmentDoc}
`;
export const InvoiceDocument = gql`
  query invoice($id: String!, $storeId: String!) {
    invoice(id: $id, storeId: $storeId) {
      ... on InvoiceNode {
        ...Inbound
      }
      ... on NodeError {
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
        }
      }
    }
  }
  ${InboundFragmentDoc}
`;
export const InboundByNumberDocument = gql`
  query inboundByNumber($invoiceNumber: Int!, $storeId: String!) {
    invoiceByNumber(
      invoiceNumber: $invoiceNumber
      storeId: $storeId
      type: INBOUND_SHIPMENT
    ) {
      ... on InvoiceNode {
        ...Inbound
      }
      ... on NodeError {
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
        }
      }
    }
  }
  ${InboundFragmentDoc}
`;
export const UpdateInboundShipmentDocument = gql`
  mutation updateInboundShipment(
    $storeId: String!
    $input: UpdateInboundShipmentInput!
  ) {
    updateInboundShipment(storeId: $storeId, input: $input) {
      ... on UpdateInboundShipmentError {
        __typename
        error {
          description
          ... on RecordNotFound {
            __typename
            description
          }
          ... on CannotChangeStatusOfInvoiceOnHold {
            __typename
            description
          }
          ... on CannotEditInvoice {
            __typename
            description
          }
          ... on CannotReverseInvoiceStatus {
            __typename
            description
          }
          ... on OtherPartyNotASupplier {
            __typename
            description
          }
        }
      }
      ... on InvoiceNode {
        __typename
        id
        invoiceNumber
      }
    }
  }
`;
export const DeleteInboundShipmentsDocument = gql`
  mutation deleteInboundShipments(
    $storeId: String!
    $deleteInboundShipments: [DeleteInboundShipmentInput!]!
  ) {
    batchInboundShipment(
      storeId: $storeId
      input: { deleteInboundShipments: $deleteInboundShipments }
    ) {
      __typename
      deleteInboundShipments {
        id
        response {
          ... on DeleteInboundShipmentError {
            __typename
            error {
              description
            }
          }
          ... on DeleteResponse {
            __typename
            id
          }
        }
      }
    }
  }
`;
export const InsertInboundShipmentDocument = gql`
  mutation insertInboundShipment(
    $id: String!
    $otherPartyId: String!
    $requisitionId: String
    $storeId: String!
  ) {
    insertInboundShipment(
      storeId: $storeId
      input: {
        id: $id
        otherPartyId: $otherPartyId
        requisitionId: $requisitionId
      }
    ) {
      ... on InsertInboundShipmentError {
        __typename
        error {
          description
          ... on OtherPartyNotASupplier {
            __typename
            description
          }
        }
      }
      ... on InvoiceNode {
        __typename
        id
        invoiceNumber
      }
    }
  }
`;
export const DeleteInboundShipmentLinesDocument = gql`
  mutation deleteInboundShipmentLines(
    $storeId: String!
    $input: BatchInboundShipmentInput!
  ) {
    batchInboundShipment(storeId: $storeId, input: $input) {
      deleteInboundShipmentLines {
        id
        response {
          ... on DeleteInboundShipmentLineError {
            __typename
            error {
              description
              ... on RecordNotFound {
                __typename
                description
              }
              ... on BatchIsReserved {
                __typename
                description
              }
              ... on LineLinkedToTransferredInvoice {
                ...LineLinkedToTransferredInvoiceError
              }
              ... on CannotEditInvoice {
                __typename
                description
              }
              ... on ForeignKeyError {
                __typename
                description
                key
              }
            }
          }
          ... on DeleteResponse {
            __typename
            id
          }
        }
      }
    }
  }
  ${LineLinkedToTransferredInvoiceErrorFragmentDoc}
`;
export const UpsertInboundShipmentDocument = gql`
  mutation upsertInboundShipment(
    $storeId: String!
    $input: BatchInboundShipmentInput!
  ) {
    batchInboundShipment(storeId: $storeId, input: $input) {
      __typename
      updateInboundShipments {
        id
        response {
          ... on UpdateInboundShipmentError {
            __typename
            error {
              description
              ... on RecordNotFound {
                __typename
                description
              }
              ... on CannotChangeStatusOfInvoiceOnHold {
                __typename
                description
              }
              ... on CannotEditInvoice {
                __typename
                description
              }
              ... on CannotReverseInvoiceStatus {
                __typename
                description
              }
              ... on OtherPartyNotASupplier {
                __typename
                description
              }
            }
          }
          ... on InvoiceNode {
            __typename
            id
            invoiceNumber
          }
        }
      }
      insertInboundShipments {
        id
        response {
          ... on InsertInboundShipmentError {
            __typename
            error {
              description
              ... on OtherPartyNotASupplier {
                __typename
                description
              }
            }
          }
          ... on InvoiceNode {
            __typename
            id
            invoiceNumber
          }
        }
      }
      deleteInboundShipments {
        id
        response {
          ... on DeleteInboundShipmentError {
            __typename
            error {
              description
              ... on RecordNotFound {
                __typename
                description
              }
              ... on CannotDeleteInvoiceWithLines {
                __typename
                description
              }
              ... on CannotEditInvoice {
                __typename
                description
              }
            }
          }
          ... on DeleteResponse {
            __typename
            id
          }
        }
      }
      updateInboundShipmentServiceLines {
        id
        response {
          ... on UpdateInboundShipmentServiceLineError {
            __typename
            error {
              description
              ... on RecordNotFound {
                __typename
                description
              }
              ... on CannotEditInvoice {
                __typename
                description
              }
              ... on ForeignKeyError {
                __typename
                description
                key
              }
            }
          }
          ... on InvoiceLineNode {
            __typename
            id
          }
        }
      }
      updateInboundShipmentLines {
        id
        response {
          ... on UpdateInboundShipmentLineError {
            __typename
            error {
              description
              ... on RecordNotFound {
                __typename
                description
              }
              ... on BatchIsReserved {
                __typename
                description
              }
              ... on CannotEditInvoice {
                __typename
                description
              }
              ... on ForeignKeyError {
                __typename
                description
                key
              }
              ... on NotAnInboundShipment {
                __typename
                description
              }
            }
          }
          ... on InvoiceLineNode {
            __typename
            id
          }
        }
      }
      insertInboundShipmentServiceLines {
        id
        response {
          ... on InsertInboundShipmentServiceLineError {
            __typename
            error {
              description
              ... on CannotEditInvoice {
                __typename
                description
              }
              ... on ForeignKeyError {
                __typename
                description
                key
              }
            }
          }
          ... on InvoiceLineNode {
            __typename
            id
          }
        }
      }
      insertInboundShipmentLines {
        id
        response {
          ... on InsertInboundShipmentLineError {
            __typename
            error {
              description
              ... on CannotEditInvoice {
                __typename
                description
              }
              ... on ForeignKeyError {
                __typename
                description
                key
              }
            }
          }
          ... on InvoiceLineNode {
            __typename
            id
          }
        }
      }
      deleteInboundShipmentServiceLines {
        id
        response {
          ... on DeleteInboundShipmentServiceLineError {
            __typename
            error {
              description
              ... on RecordNotFound {
                __typename
                description
              }
              ... on CannotEditInvoice {
                __typename
                description
              }
              ... on ForeignKeyError {
                __typename
                description
                key
              }
            }
          }
          ... on DeleteResponse {
            __typename
            id
          }
        }
      }
      deleteInboundShipmentLines {
        id
        response {
          ... on DeleteInboundShipmentLineError {
            __typename
            error {
              description
              ... on RecordNotFound {
                __typename
                description
              }
              ... on BatchIsReserved {
                __typename
                description
              }
              ... on CannotEditInvoice {
                __typename
                description
              }
              ... on ForeignKeyError {
                __typename
                description
                key
              }
            }
          }
          ... on DeleteResponse {
            __typename
            id
          }
        }
      }
    }
  }
`;
export const AddToInboundShipmentFromMasterListDocument = gql`
  mutation addToInboundShipmentFromMasterList(
    $storeId: String!
    $shipmentId: String!
    $masterListId: String!
  ) {
    addToInboundShipmentFromMasterList(
      input: { shipmentId: $shipmentId, masterListId: $masterListId }
      storeId: $storeId
    ) {
      ... on AddToInboundShipmentFromMasterListError {
        __typename
        error {
          ... on MasterListNotFoundForThisStore {
            __typename
            description
          }
          ... on CannotEditInvoice {
            __typename
            description
          }
          ... on RecordNotFound {
            __typename
            description
          }
          description
        }
      }
      ... on InvoiceLineConnector {
        __typename
        totalCount
      }
    }
  }
`;
export const RequestsDocument = gql`
  query requests(
    $storeId: String!
    $filter: RequisitionFilterInput
    $sort: [RequisitionSortInput!]
  ) {
    requisitions(storeId: $storeId, filter: $filter, sort: $sort) {
      ... on RequisitionConnector {
        totalCount
        nodes {
          ...LinkedRequestRow
        }
      }
    }
  }
  ${LinkedRequestRowFragmentDoc}
`;
export const RequestDocument = gql`
  query request($id: String!, $storeId: String!) {
    requisition(id: $id, storeId: $storeId) {
      ... on RequisitionNode {
        __typename
        ...LinkedRequestWithLines
      }
    }
  }
  ${LinkedRequestWithLinesFragmentDoc}
`;
export const InsertLinesFromInternalOrderDocument = gql`
  mutation insertLinesFromInternalOrder(
    $storeId: String!
    $input: BatchInboundShipmentInput!
  ) {
    batchInboundShipment(storeId: $storeId, input: $input) {
      insertFromInternalOrderLines {
        id
        response {
          ... on InvoiceLineNode {
            __typename
            id
          }
        }
      }
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    invoices(
      variables: InvoicesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InvoicesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InvoicesQuery>(InvoicesDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'invoices',
        'query',
        variables
      );
    },
    invoice(
      variables: InvoiceQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InvoiceQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InvoiceQuery>(InvoiceDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'invoice',
        'query',
        variables
      );
    },
    inboundByNumber(
      variables: InboundByNumberQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InboundByNumberQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InboundByNumberQuery>(
            InboundByNumberDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'inboundByNumber',
        'query',
        variables
      );
    },
    updateInboundShipment(
      variables: UpdateInboundShipmentMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpdateInboundShipmentMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateInboundShipmentMutation>(
            UpdateInboundShipmentDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateInboundShipment',
        'mutation',
        variables
      );
    },
    deleteInboundShipments(
      variables: DeleteInboundShipmentsMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<DeleteInboundShipmentsMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteInboundShipmentsMutation>(
            DeleteInboundShipmentsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deleteInboundShipments',
        'mutation',
        variables
      );
    },
    insertInboundShipment(
      variables: InsertInboundShipmentMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertInboundShipmentMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertInboundShipmentMutation>(
            InsertInboundShipmentDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertInboundShipment',
        'mutation',
        variables
      );
    },
    deleteInboundShipmentLines(
      variables: DeleteInboundShipmentLinesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<DeleteInboundShipmentLinesMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteInboundShipmentLinesMutation>(
            DeleteInboundShipmentLinesDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deleteInboundShipmentLines',
        'mutation',
        variables
      );
    },
    upsertInboundShipment(
      variables: UpsertInboundShipmentMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpsertInboundShipmentMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertInboundShipmentMutation>(
            UpsertInboundShipmentDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'upsertInboundShipment',
        'mutation',
        variables
      );
    },
    addToInboundShipmentFromMasterList(
      variables: AddToInboundShipmentFromMasterListMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<AddToInboundShipmentFromMasterListMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<AddToInboundShipmentFromMasterListMutation>(
            AddToInboundShipmentFromMasterListDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'addToInboundShipmentFromMasterList',
        'mutation',
        variables
      );
    },
    requests(
      variables: RequestsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<RequestsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<RequestsQuery>(RequestsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'requests',
        'query',
        variables
      );
    },
    request(
      variables: RequestQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<RequestQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<RequestQuery>(RequestDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'request',
        'query',
        variables
      );
    },
    insertLinesFromInternalOrder(
      variables: InsertLinesFromInternalOrderMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertLinesFromInternalOrderMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertLinesFromInternalOrderMutation>(
            InsertLinesFromInternalOrderDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertLinesFromInternalOrder',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
