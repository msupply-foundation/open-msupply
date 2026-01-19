import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type SupplierReturnRowFragment = {
  __typename: 'InvoiceNode';
  id: string;
  otherPartyId: string;
  otherPartyName: string;
  status: Types.InvoiceNodeStatus;
  invoiceNumber: number;
  colour?: string | null;
  onHold: boolean;
  createdDatetime: string;
  pickedDatetime?: string | null;
  shippedDatetime?: string | null;
  receivedDatetime?: string | null;
  verifiedDatetime?: string | null;
  comment?: string | null;
  theirReference?: string | null;
};

export type CustomerReturnRowFragment = {
  __typename: 'InvoiceNode';
  id: string;
  otherPartyName: string;
  status: Types.InvoiceNodeStatus;
  invoiceNumber: number;
  colour?: string | null;
  createdDatetime: string;
  deliveredDatetime?: string | null;
  receivedDatetime?: string | null;
  comment?: string | null;
  theirReference?: string | null;
  linkedShipment?: { __typename: 'InvoiceNode'; id: string } | null;
};

export type SupplierReturnFragment = {
  __typename: 'InvoiceNode';
  id: string;
  status: Types.InvoiceNodeStatus;
  invoiceNumber: number;
  colour?: string | null;
  onHold: boolean;
  comment?: string | null;
  createdDatetime: string;
  pickedDatetime?: string | null;
  shippedDatetime?: string | null;
  deliveredDatetime?: string | null;
  verifiedDatetime?: string | null;
  otherPartyName: string;
  otherPartyId: string;
  theirReference?: string | null;
  transportReference?: string | null;
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
  user?: {
    __typename: 'UserNode';
    username: string;
    email?: string | null;
  } | null;
  originalShipment?: {
    __typename: 'InvoiceNode';
    id: string;
    invoiceNumber: number;
    createdDatetime: string;
    user?: { __typename: 'UserNode'; username: string } | null;
  } | null;
};

export type CustomerReturnFragment = {
  __typename: 'InvoiceNode';
  id: string;
  status: Types.InvoiceNodeStatus;
  invoiceNumber: number;
  colour?: string | null;
  onHold: boolean;
  comment?: string | null;
  createdDatetime: string;
  pickedDatetime?: string | null;
  shippedDatetime?: string | null;
  deliveredDatetime?: string | null;
  receivedDatetime?: string | null;
  verifiedDatetime?: string | null;
  otherPartyId: string;
  otherPartyName: string;
  theirReference?: string | null;
  transportReference?: string | null;
  user?: {
    __typename: 'UserNode';
    username: string;
    email?: string | null;
  } | null;
  linkedShipment?: { __typename: 'InvoiceNode'; id: string } | null;
  originalShipment?: {
    __typename: 'InvoiceNode';
    id: string;
    invoiceNumber: number;
    createdDatetime: string;
    user?: { __typename: 'UserNode'; username: string } | null;
  } | null;
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
};

export type SupplierReturnLineFragment = {
  __typename: 'InvoiceLineNode';
  id: string;
  itemCode: string;
  itemName: string;
  itemId: string;
  batch?: string | null;
  expiryDate?: string | null;
  numberOfPacks: number;
  packSize: number;
  costPricePerPack: number;
  item: {
    __typename: 'ItemNode';
    id: string;
    name: string;
    code: string;
    unitName?: string | null;
    defaultPackSize: number;
  };
};

export type CustomerReturnLineFragment = {
  __typename: 'InvoiceLineNode';
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  batch?: string | null;
  expiryDate?: string | null;
  numberOfPacks: number;
  packSize: number;
  volumePerPack: number;
  item: {
    __typename: 'ItemNode';
    id: string;
    name: string;
    code: string;
    unitName?: string | null;
    defaultPackSize: number;
  };
};

export type SupplierReturnsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type SupplierReturnsQuery = {
  __typename: 'Queries';
  invoices: {
    __typename: 'InvoiceConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'InvoiceNode';
      id: string;
      otherPartyId: string;
      otherPartyName: string;
      status: Types.InvoiceNodeStatus;
      invoiceNumber: number;
      colour?: string | null;
      onHold: boolean;
      createdDatetime: string;
      pickedDatetime?: string | null;
      shippedDatetime?: string | null;
      receivedDatetime?: string | null;
      verifiedDatetime?: string | null;
      comment?: string | null;
      theirReference?: string | null;
    }>;
  };
};

export type CustomerReturnsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type CustomerReturnsQuery = {
  __typename: 'Queries';
  invoices: {
    __typename: 'InvoiceConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'InvoiceNode';
      id: string;
      otherPartyName: string;
      status: Types.InvoiceNodeStatus;
      invoiceNumber: number;
      colour?: string | null;
      createdDatetime: string;
      deliveredDatetime?: string | null;
      receivedDatetime?: string | null;
      comment?: string | null;
      theirReference?: string | null;
      linkedShipment?: { __typename: 'InvoiceNode'; id: string } | null;
    }>;
  };
};

export type GenerateSupplierReturnLineFragment = {
  __typename: 'SupplierReturnLineNode';
  availableNumberOfPacks: number;
  batch?: string | null;
  expiryDate?: string | null;
  id: string;
  numberOfPacksToReturn: number;
  packSize: number;
  stockLineId: string;
  note?: string | null;
  reasonId?: string | null;
  itemName: string;
  itemCode: string;
  item: { __typename: 'ItemNode'; id: string; unitName?: string | null };
  reasonOption?: {
    __typename: 'ReasonOptionNode';
    id: string;
    isActive: boolean;
    reason: string;
    type: Types.ReasonOptionNodeType;
  } | null;
};

export type GenerateSupplierReturnLinesQueryVariables = Types.Exact<{
  input: Types.GenerateSupplierReturnLinesInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type GenerateSupplierReturnLinesQuery = {
  __typename: 'Queries';
  generateSupplierReturnLines: {
    __typename: 'SupplierReturnLineConnector';
    nodes: Array<{
      __typename: 'SupplierReturnLineNode';
      availableNumberOfPacks: number;
      batch?: string | null;
      expiryDate?: string | null;
      id: string;
      numberOfPacksToReturn: number;
      packSize: number;
      stockLineId: string;
      note?: string | null;
      reasonId?: string | null;
      itemName: string;
      itemCode: string;
      item: { __typename: 'ItemNode'; id: string; unitName?: string | null };
      reasonOption?: {
        __typename: 'ReasonOptionNode';
        id: string;
        isActive: boolean;
        reason: string;
        type: Types.ReasonOptionNodeType;
      } | null;
    }>;
  };
};

export type GenerateCustomerReturnLineFragment = {
  __typename: 'CustomerReturnLineNode';
  batch?: string | null;
  expiryDate?: string | null;
  id: string;
  packSize: number;
  stockLineId?: string | null;
  numberOfPacksReturned: number;
  numberOfPacksIssued?: number | null;
  note?: string | null;
  reasonId?: string | null;
  itemName: string;
  itemCode: string;
  itemVariantId?: string | null;
  volumePerPack: number;
  item: {
    __typename: 'ItemNode';
    id: string;
    unitName?: string | null;
    code: string;
    name: string;
  };
  reasonOption?: {
    __typename: 'ReasonOptionNode';
    id: string;
    isActive: boolean;
    reason: string;
    type: Types.ReasonOptionNodeType;
  } | null;
  itemVariant?: {
    __typename: 'ItemVariantNode';
    id: string;
    packagingVariants: Array<{
      __typename: 'PackagingVariantNode';
      id: string;
      packSize?: number | null;
      volumePerUnit?: number | null;
    }>;
  } | null;
};

export type GenerateCustomerReturnLinesQueryVariables = Types.Exact<{
  input: Types.GenerateCustomerReturnLinesInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type GenerateCustomerReturnLinesQuery = {
  __typename: 'Queries';
  generateCustomerReturnLines: {
    __typename: 'GeneratedCustomerReturnLineConnector';
    nodes: Array<{
      __typename: 'CustomerReturnLineNode';
      batch?: string | null;
      expiryDate?: string | null;
      id: string;
      packSize: number;
      stockLineId?: string | null;
      numberOfPacksReturned: number;
      numberOfPacksIssued?: number | null;
      note?: string | null;
      reasonId?: string | null;
      itemName: string;
      itemCode: string;
      itemVariantId?: string | null;
      volumePerPack: number;
      item: {
        __typename: 'ItemNode';
        id: string;
        unitName?: string | null;
        code: string;
        name: string;
      };
      reasonOption?: {
        __typename: 'ReasonOptionNode';
        id: string;
        isActive: boolean;
        reason: string;
        type: Types.ReasonOptionNodeType;
      } | null;
      itemVariant?: {
        __typename: 'ItemVariantNode';
        id: string;
        packagingVariants: Array<{
          __typename: 'PackagingVariantNode';
          id: string;
          packSize?: number | null;
          volumePerUnit?: number | null;
        }>;
      } | null;
    }>;
  };
};

export type SupplierReturnByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type SupplierReturnByNumberQuery = {
  __typename: 'Queries';
  invoiceByNumber:
    | {
        __typename: 'InvoiceNode';
        id: string;
        status: Types.InvoiceNodeStatus;
        invoiceNumber: number;
        colour?: string | null;
        onHold: boolean;
        comment?: string | null;
        createdDatetime: string;
        pickedDatetime?: string | null;
        shippedDatetime?: string | null;
        deliveredDatetime?: string | null;
        verifiedDatetime?: string | null;
        otherPartyName: string;
        otherPartyId: string;
        theirReference?: string | null;
        transportReference?: string | null;
        lines: {
          __typename: 'InvoiceLineConnector';
          nodes: Array<{
            __typename: 'InvoiceLineNode';
            id: string;
            itemCode: string;
            itemName: string;
            itemId: string;
            batch?: string | null;
            expiryDate?: string | null;
            numberOfPacks: number;
            packSize: number;
            costPricePerPack: number;
            item: {
              __typename: 'ItemNode';
              id: string;
              name: string;
              code: string;
              unitName?: string | null;
              defaultPackSize: number;
            };
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
        user?: {
          __typename: 'UserNode';
          username: string;
          email?: string | null;
        } | null;
        originalShipment?: {
          __typename: 'InvoiceNode';
          id: string;
          invoiceNumber: number;
          createdDatetime: string;
          user?: { __typename: 'UserNode'; username: string } | null;
        } | null;
      }
    | { __typename: 'NodeError' };
};

export type SupplierReturnByIdQueryVariables = Types.Exact<{
  invoiceId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type SupplierReturnByIdQuery = {
  __typename: 'Queries';
  invoice:
    | {
        __typename: 'InvoiceNode';
        id: string;
        status: Types.InvoiceNodeStatus;
        invoiceNumber: number;
        colour?: string | null;
        onHold: boolean;
        comment?: string | null;
        createdDatetime: string;
        pickedDatetime?: string | null;
        shippedDatetime?: string | null;
        deliveredDatetime?: string | null;
        verifiedDatetime?: string | null;
        otherPartyName: string;
        otherPartyId: string;
        theirReference?: string | null;
        transportReference?: string | null;
        lines: {
          __typename: 'InvoiceLineConnector';
          nodes: Array<{
            __typename: 'InvoiceLineNode';
            id: string;
            itemCode: string;
            itemName: string;
            itemId: string;
            batch?: string | null;
            expiryDate?: string | null;
            numberOfPacks: number;
            packSize: number;
            costPricePerPack: number;
            item: {
              __typename: 'ItemNode';
              id: string;
              name: string;
              code: string;
              unitName?: string | null;
              defaultPackSize: number;
            };
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
        user?: {
          __typename: 'UserNode';
          username: string;
          email?: string | null;
        } | null;
        originalShipment?: {
          __typename: 'InvoiceNode';
          id: string;
          invoiceNumber: number;
          createdDatetime: string;
          user?: { __typename: 'UserNode'; username: string } | null;
        } | null;
      }
    | { __typename: 'NodeError' };
};

export type CustomerReturnByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type CustomerReturnByNumberQuery = {
  __typename: 'Queries';
  invoiceByNumber:
    | {
        __typename: 'InvoiceNode';
        id: string;
        status: Types.InvoiceNodeStatus;
        invoiceNumber: number;
        colour?: string | null;
        onHold: boolean;
        comment?: string | null;
        createdDatetime: string;
        pickedDatetime?: string | null;
        shippedDatetime?: string | null;
        deliveredDatetime?: string | null;
        receivedDatetime?: string | null;
        verifiedDatetime?: string | null;
        otherPartyId: string;
        otherPartyName: string;
        theirReference?: string | null;
        transportReference?: string | null;
        lines: {
          __typename: 'InvoiceLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'InvoiceLineNode';
            id: string;
            itemId: string;
            itemCode: string;
            itemName: string;
            batch?: string | null;
            expiryDate?: string | null;
            numberOfPacks: number;
            packSize: number;
            volumePerPack: number;
            item: {
              __typename: 'ItemNode';
              id: string;
              name: string;
              code: string;
              unitName?: string | null;
              defaultPackSize: number;
            };
          }>;
        };
        user?: {
          __typename: 'UserNode';
          username: string;
          email?: string | null;
        } | null;
        linkedShipment?: { __typename: 'InvoiceNode'; id: string } | null;
        originalShipment?: {
          __typename: 'InvoiceNode';
          id: string;
          invoiceNumber: number;
          createdDatetime: string;
          user?: { __typename: 'UserNode'; username: string } | null;
        } | null;
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
      }
    | { __typename: 'NodeError' };
};

export type CustomerReturnByIdQueryVariables = Types.Exact<{
  invoiceId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type CustomerReturnByIdQuery = {
  __typename: 'Queries';
  invoice:
    | {
        __typename: 'InvoiceNode';
        id: string;
        status: Types.InvoiceNodeStatus;
        invoiceNumber: number;
        colour?: string | null;
        onHold: boolean;
        comment?: string | null;
        createdDatetime: string;
        pickedDatetime?: string | null;
        shippedDatetime?: string | null;
        deliveredDatetime?: string | null;
        receivedDatetime?: string | null;
        verifiedDatetime?: string | null;
        otherPartyId: string;
        otherPartyName: string;
        theirReference?: string | null;
        transportReference?: string | null;
        lines: {
          __typename: 'InvoiceLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'InvoiceLineNode';
            id: string;
            itemId: string;
            itemCode: string;
            itemName: string;
            batch?: string | null;
            expiryDate?: string | null;
            numberOfPacks: number;
            packSize: number;
            volumePerPack: number;
            item: {
              __typename: 'ItemNode';
              id: string;
              name: string;
              code: string;
              unitName?: string | null;
              defaultPackSize: number;
            };
          }>;
        };
        user?: {
          __typename: 'UserNode';
          username: string;
          email?: string | null;
        } | null;
        linkedShipment?: { __typename: 'InvoiceNode'; id: string } | null;
        originalShipment?: {
          __typename: 'InvoiceNode';
          id: string;
          invoiceNumber: number;
          createdDatetime: string;
          user?: { __typename: 'UserNode'; username: string } | null;
        } | null;
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
      }
    | { __typename: 'NodeError' };
};

export type InsertSupplierReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.SupplierReturnInput;
}>;

export type InsertSupplierReturnMutation = {
  __typename: 'Mutations';
  insertSupplierReturn:
    | {
        __typename: 'InsertSupplierReturnError';
        error:
          | { __typename: 'OtherPartyNotASupplier'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string };
      }
    | {
        __typename: 'InvoiceNode';
        id: string;
        invoiceNumber: number;
        originalShipment?: { __typename: 'InvoiceNode'; id: string } | null;
      };
};

export type UpdateSupplierReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateSupplierReturnInput;
}>;

export type UpdateSupplierReturnMutation = {
  __typename: 'Mutations';
  updateSupplierReturn: { __typename: 'InvoiceNode'; id: string };
};

export type UpdateSupplierReturnLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateSupplierReturnLinesInput;
}>;

export type UpdateSupplierReturnLinesMutation = {
  __typename: 'Mutations';
  updateSupplierReturnLines: {
    __typename: 'InvoiceNode';
    id: string;
    originalShipment?: { __typename: 'InvoiceNode'; id: string } | null;
  };
};

export type InsertCustomerReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.CustomerReturnInput;
}>;

export type InsertCustomerReturnMutation = {
  __typename: 'Mutations';
  insertCustomerReturn:
    | {
        __typename: 'InsertCustomerReturnError';
        error:
          | { __typename: 'OtherPartyNotACustomer'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string };
      }
    | {
        __typename: 'InvoiceNode';
        id: string;
        invoiceNumber: number;
        originalShipment?: { __typename: 'InvoiceNode'; id: string } | null;
      };
};

export type DeleteSupplierReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  id: Types.Scalars['String']['input'];
}>;

export type DeleteSupplierReturnMutation = {
  __typename: 'Mutations';
  deleteSupplierReturn:
    | { __typename: 'DeleteResponse'; id: string }
    | { __typename: 'DeleteSupplierReturnError' };
};

export type UpdateCustomerReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateCustomerReturnInput;
}>;

export type UpdateCustomerReturnMutation = {
  __typename: 'Mutations';
  updateCustomerReturn:
    | { __typename: 'InvoiceNode'; id: string }
    | { __typename: 'UpdateCustomerReturnError' };
};

export type UpdateCustomerReturnLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.UpdateCustomerReturnLinesInput;
}>;

export type UpdateCustomerReturnLinesMutation = {
  __typename: 'Mutations';
  updateCustomerReturnLines: {
    __typename: 'InvoiceNode';
    id: string;
    originalShipment?: { __typename: 'InvoiceNode'; id: string } | null;
  };
};

export type DeleteCustomerReturnMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  id: Types.Scalars['String']['input'];
}>;

export type DeleteCustomerReturnMutation = {
  __typename: 'Mutations';
  deleteCustomerReturn:
    | { __typename: 'DeleteCustomerReturnError' }
    | { __typename: 'DeleteResponse'; id: string };
};

export type UpdateSupplierReturnOtherPartyMutationVariables = Types.Exact<{
  input: Types.UpdateSupplierReturnOtherPartyInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type UpdateSupplierReturnOtherPartyMutation = {
  __typename: 'Mutations';
  updateSupplierReturnOtherParty:
    | { __typename: 'InvoiceNode'; id: string }
    | {
        __typename: 'UpdateSupplierReturnOtherPartyError';
        error:
          | { __typename: 'InvoiceIsNotEditable'; description: string }
          | { __typename: 'OtherPartyNotASupplier'; description: string }
          | { __typename: 'OtherPartyNotVisible'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      };
};

export const SupplierReturnRowFragmentDoc = gql`
  fragment SupplierReturnRow on InvoiceNode {
    __typename
    id
    otherPartyId
    otherPartyName
    status
    invoiceNumber
    colour
    onHold
    createdDatetime
    pickedDatetime
    shippedDatetime
    receivedDatetime
    verifiedDatetime
    comment
    theirReference
  }
`;
export const CustomerReturnRowFragmentDoc = gql`
  fragment CustomerReturnRow on InvoiceNode {
    __typename
    id
    otherPartyName
    status
    invoiceNumber
    colour
    createdDatetime
    deliveredDatetime
    receivedDatetime
    comment
    theirReference
    linkedShipment {
      __typename
      id
    }
  }
`;
export const SupplierReturnFragmentDoc = gql`
  fragment SupplierReturn on InvoiceNode {
    __typename
    id
    status
    invoiceNumber
    colour
    onHold
    comment
    createdDatetime
    pickedDatetime
    shippedDatetime
    deliveredDatetime
    verifiedDatetime
    otherPartyName
    otherPartyId
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
    user {
      __typename
      username
      email
    }
    theirReference
    transportReference
    originalShipment {
      id
      invoiceNumber
      createdDatetime
      user {
        username
      }
    }
  }
`;
export const CustomerReturnFragmentDoc = gql`
  fragment CustomerReturn on InvoiceNode {
    __typename
    id
    status
    invoiceNumber
    colour
    onHold
    comment
    createdDatetime
    pickedDatetime
    shippedDatetime
    deliveredDatetime
    receivedDatetime
    verifiedDatetime
    otherPartyId
    otherPartyName
    user {
      __typename
      username
      email
    }
    linkedShipment {
      __typename
      id
    }
    theirReference
    transportReference
    originalShipment {
      __typename
      id
      invoiceNumber
      createdDatetime
      user {
        username
      }
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
  }
`;
export const SupplierReturnLineFragmentDoc = gql`
  fragment SupplierReturnLine on InvoiceLineNode {
    id
    itemCode
    itemName
    itemId
    batch
    expiryDate
    numberOfPacks
    packSize
    costPricePerPack
    item {
      __typename
      id
      name
      code
      unitName
      defaultPackSize
    }
  }
`;
export const CustomerReturnLineFragmentDoc = gql`
  fragment CustomerReturnLine on InvoiceLineNode {
    id
    itemId
    itemCode
    itemName
    batch
    expiryDate
    numberOfPacks
    packSize
    item {
      __typename
      id
      name
      code
      unitName
      defaultPackSize
    }
    volumePerPack
  }
`;
export const GenerateSupplierReturnLineFragmentDoc = gql`
  fragment GenerateSupplierReturnLine on SupplierReturnLineNode {
    availableNumberOfPacks
    batch
    expiryDate
    id
    numberOfPacksToReturn
    packSize
    stockLineId
    note
    reasonId
    itemName
    itemCode
    item {
      id
      unitName
    }
    reasonOption {
      id
      isActive
      reason
      type
    }
  }
`;
export const GenerateCustomerReturnLineFragmentDoc = gql`
  fragment GenerateCustomerReturnLine on CustomerReturnLineNode {
    batch
    expiryDate
    id
    packSize
    stockLineId
    numberOfPacksReturned
    numberOfPacksIssued
    note
    reasonId
    itemName
    itemCode
    itemVariantId
    volumePerPack
    item {
      id
      unitName
      code
      name
    }
    reasonOption {
      id
      isActive
      reason
      type
    }
    itemVariant {
      __typename
      id
      packagingVariants {
        __typename
        id
        packSize
        volumePerUnit
      }
    }
  }
`;
export const SupplierReturnsDocument = gql`
  query supplierReturns(
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
        nodes {
          ...SupplierReturnRow
        }
        totalCount
      }
    }
  }
  ${SupplierReturnRowFragmentDoc}
`;
export const CustomerReturnsDocument = gql`
  query customerReturns(
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
        nodes {
          ...CustomerReturnRow
        }
        totalCount
      }
    }
  }
  ${CustomerReturnRowFragmentDoc}
`;
export const GenerateSupplierReturnLinesDocument = gql`
  query generateSupplierReturnLines(
    $input: GenerateSupplierReturnLinesInput!
    $storeId: String!
  ) {
    generateSupplierReturnLines(input: $input, storeId: $storeId) {
      ... on SupplierReturnLineConnector {
        nodes {
          ...GenerateSupplierReturnLine
        }
      }
    }
  }
  ${GenerateSupplierReturnLineFragmentDoc}
`;
export const GenerateCustomerReturnLinesDocument = gql`
  query generateCustomerReturnLines(
    $input: GenerateCustomerReturnLinesInput!
    $storeId: String!
  ) {
    generateCustomerReturnLines(input: $input, storeId: $storeId) {
      ... on GeneratedCustomerReturnLineConnector {
        nodes {
          ...GenerateCustomerReturnLine
        }
      }
    }
  }
  ${GenerateCustomerReturnLineFragmentDoc}
`;
export const SupplierReturnByNumberDocument = gql`
  query supplierReturnByNumber($invoiceNumber: Int!, $storeId: String!) {
    invoiceByNumber(
      invoiceNumber: $invoiceNumber
      storeId: $storeId
      type: SUPPLIER_RETURN
    ) {
      ... on InvoiceNode {
        __typename
        ...SupplierReturn
        lines {
          nodes {
            ...SupplierReturnLine
          }
        }
      }
    }
  }
  ${SupplierReturnFragmentDoc}
  ${SupplierReturnLineFragmentDoc}
`;
export const SupplierReturnByIdDocument = gql`
  query supplierReturnById($invoiceId: String!, $storeId: String!) {
    invoice(id: $invoiceId, storeId: $storeId) {
      ... on InvoiceNode {
        __typename
        ...SupplierReturn
        lines {
          nodes {
            ...SupplierReturnLine
          }
        }
      }
    }
  }
  ${SupplierReturnFragmentDoc}
  ${SupplierReturnLineFragmentDoc}
`;
export const CustomerReturnByNumberDocument = gql`
  query customerReturnByNumber($invoiceNumber: Int!, $storeId: String!) {
    invoiceByNumber(
      invoiceNumber: $invoiceNumber
      storeId: $storeId
      type: CUSTOMER_RETURN
    ) {
      ... on InvoiceNode {
        __typename
        ...CustomerReturn
        lines {
          nodes {
            ...CustomerReturnLine
          }
          totalCount
        }
      }
    }
  }
  ${CustomerReturnFragmentDoc}
  ${CustomerReturnLineFragmentDoc}
`;
export const CustomerReturnByIdDocument = gql`
  query customerReturnById($invoiceId: String!, $storeId: String!) {
    invoice(id: $invoiceId, storeId: $storeId) {
      ... on InvoiceNode {
        __typename
        ...CustomerReturn
        lines {
          nodes {
            ...CustomerReturnLine
          }
          totalCount
        }
      }
    }
  }
  ${CustomerReturnFragmentDoc}
  ${CustomerReturnLineFragmentDoc}
`;
export const InsertSupplierReturnDocument = gql`
  mutation insertSupplierReturn(
    $storeId: String!
    $input: SupplierReturnInput!
  ) {
    insertSupplierReturn(storeId: $storeId, input: $input) {
      ... on InvoiceNode {
        __typename
        id
        invoiceNumber
        originalShipment {
          id
        }
      }
      ... on InsertSupplierReturnError {
        __typename
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const UpdateSupplierReturnDocument = gql`
  mutation updateSupplierReturn(
    $storeId: String!
    $input: UpdateSupplierReturnInput!
  ) {
    updateSupplierReturn(storeId: $storeId, input: $input) {
      ... on InvoiceNode {
        __typename
        id
      }
    }
  }
`;
export const UpdateSupplierReturnLinesDocument = gql`
  mutation updateSupplierReturnLines(
    $storeId: String!
    $input: UpdateSupplierReturnLinesInput!
  ) {
    updateSupplierReturnLines(storeId: $storeId, input: $input) {
      ... on InvoiceNode {
        __typename
        id
        originalShipment {
          id
        }
      }
    }
  }
`;
export const InsertCustomerReturnDocument = gql`
  mutation insertCustomerReturn(
    $storeId: String!
    $input: CustomerReturnInput!
  ) {
    insertCustomerReturn(storeId: $storeId, input: $input) {
      ... on InvoiceNode {
        __typename
        id
        invoiceNumber
        originalShipment {
          id
        }
      }
      ... on InsertCustomerReturnError {
        __typename
        error {
          __typename
          description
        }
      }
    }
  }
`;
export const DeleteSupplierReturnDocument = gql`
  mutation deleteSupplierReturn($storeId: String!, $id: String!) {
    deleteSupplierReturn(storeId: $storeId, id: $id) {
      __typename
      ... on DeleteResponse {
        id
      }
    }
  }
`;
export const UpdateCustomerReturnDocument = gql`
  mutation updateCustomerReturn(
    $storeId: String!
    $input: UpdateCustomerReturnInput!
  ) {
    updateCustomerReturn(storeId: $storeId, input: $input) {
      ... on InvoiceNode {
        __typename
        id
      }
    }
  }
`;
export const UpdateCustomerReturnLinesDocument = gql`
  mutation updateCustomerReturnLines(
    $storeId: String!
    $input: UpdateCustomerReturnLinesInput!
  ) {
    updateCustomerReturnLines(storeId: $storeId, input: $input) {
      ... on InvoiceNode {
        __typename
        id
        originalShipment {
          id
        }
      }
    }
  }
`;
export const DeleteCustomerReturnDocument = gql`
  mutation deleteCustomerReturn($storeId: String!, $id: String!) {
    deleteCustomerReturn(storeId: $storeId, id: $id) {
      __typename
      ... on DeleteResponse {
        id
      }
    }
  }
`;
export const UpdateSupplierReturnOtherPartyDocument = gql`
  mutation updateSupplierReturnOtherParty(
    $input: UpdateSupplierReturnOtherPartyInput!
    $storeId: String!
  ) {
    updateSupplierReturnOtherParty(input: $input, storeId: $storeId) {
      ... on UpdateSupplierReturnOtherPartyError {
        __typename
        error {
          description
          ... on RecordNotFound {
            __typename
            description
          }
          ... on InvoiceIsNotEditable {
            __typename
            description
          }
          ... on OtherPartyNotVisible {
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
    supplierReturns(
      variables: SupplierReturnsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<SupplierReturnsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SupplierReturnsQuery>({
            document: SupplierReturnsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'supplierReturns',
        'query',
        variables
      );
    },
    customerReturns(
      variables: CustomerReturnsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<CustomerReturnsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<CustomerReturnsQuery>({
            document: CustomerReturnsDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'customerReturns',
        'query',
        variables
      );
    },
    generateSupplierReturnLines(
      variables: GenerateSupplierReturnLinesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<GenerateSupplierReturnLinesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GenerateSupplierReturnLinesQuery>({
            document: GenerateSupplierReturnLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'generateSupplierReturnLines',
        'query',
        variables
      );
    },
    generateCustomerReturnLines(
      variables: GenerateCustomerReturnLinesQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<GenerateCustomerReturnLinesQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GenerateCustomerReturnLinesQuery>({
            document: GenerateCustomerReturnLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'generateCustomerReturnLines',
        'query',
        variables
      );
    },
    supplierReturnByNumber(
      variables: SupplierReturnByNumberQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<SupplierReturnByNumberQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SupplierReturnByNumberQuery>({
            document: SupplierReturnByNumberDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'supplierReturnByNumber',
        'query',
        variables
      );
    },
    supplierReturnById(
      variables: SupplierReturnByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<SupplierReturnByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<SupplierReturnByIdQuery>({
            document: SupplierReturnByIdDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'supplierReturnById',
        'query',
        variables
      );
    },
    customerReturnByNumber(
      variables: CustomerReturnByNumberQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<CustomerReturnByNumberQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<CustomerReturnByNumberQuery>({
            document: CustomerReturnByNumberDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'customerReturnByNumber',
        'query',
        variables
      );
    },
    customerReturnById(
      variables: CustomerReturnByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<CustomerReturnByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<CustomerReturnByIdQuery>({
            document: CustomerReturnByIdDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'customerReturnById',
        'query',
        variables
      );
    },
    insertSupplierReturn(
      variables: InsertSupplierReturnMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InsertSupplierReturnMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertSupplierReturnMutation>({
            document: InsertSupplierReturnDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertSupplierReturn',
        'mutation',
        variables
      );
    },
    updateSupplierReturn(
      variables: UpdateSupplierReturnMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdateSupplierReturnMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateSupplierReturnMutation>({
            document: UpdateSupplierReturnDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateSupplierReturn',
        'mutation',
        variables
      );
    },
    updateSupplierReturnLines(
      variables: UpdateSupplierReturnLinesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdateSupplierReturnLinesMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateSupplierReturnLinesMutation>({
            document: UpdateSupplierReturnLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateSupplierReturnLines',
        'mutation',
        variables
      );
    },
    insertCustomerReturn(
      variables: InsertCustomerReturnMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<InsertCustomerReturnMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertCustomerReturnMutation>({
            document: InsertCustomerReturnDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'insertCustomerReturn',
        'mutation',
        variables
      );
    },
    deleteSupplierReturn(
      variables: DeleteSupplierReturnMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DeleteSupplierReturnMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteSupplierReturnMutation>({
            document: DeleteSupplierReturnDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deleteSupplierReturn',
        'mutation',
        variables
      );
    },
    updateCustomerReturn(
      variables: UpdateCustomerReturnMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdateCustomerReturnMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateCustomerReturnMutation>({
            document: UpdateCustomerReturnDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateCustomerReturn',
        'mutation',
        variables
      );
    },
    updateCustomerReturnLines(
      variables: UpdateCustomerReturnLinesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdateCustomerReturnLinesMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateCustomerReturnLinesMutation>({
            document: UpdateCustomerReturnLinesDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateCustomerReturnLines',
        'mutation',
        variables
      );
    },
    deleteCustomerReturn(
      variables: DeleteCustomerReturnMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<DeleteCustomerReturnMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteCustomerReturnMutation>({
            document: DeleteCustomerReturnDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'deleteCustomerReturn',
        'mutation',
        variables
      );
    },
    updateSupplierReturnOtherParty(
      variables: UpdateSupplierReturnOtherPartyMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal']
    ): Promise<UpdateSupplierReturnOtherPartyMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateSupplierReturnOtherPartyMutation>({
            document: UpdateSupplierReturnOtherPartyDocument,
            variables,
            requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders },
            signal,
          }),
        'updateSupplierReturnOtherParty',
        'mutation',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
