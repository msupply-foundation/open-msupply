import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type PrescriptionRowFragment = {
  __typename: 'InvoiceNode';
  comment?: string | null;
  createdDatetime: string;
  pickedDatetime?: string | null;
  verifiedDatetime?: string | null;
  cancelledDatetime?: string | null;
  id: string;
  invoiceNumber: number;
  otherPartyName: string;
  clinicianId?: string | null;
  type: Types.InvoiceNodeType;
  status: Types.InvoiceNodeStatus;
  colour?: string | null;
  nameInsuranceJoinId?: string | null;
  insuranceDiscountAmount?: number | null;
  insuranceDiscountPercentage?: number | null;
  currencyRate: number;
  theirReference?: string | null;
  diagnosisId?: string | null;
  programId?: string | null;
  prescriptionDate?: string | null;
  patientId: string;
  pricing: {
    __typename: 'PricingNode';
    totalAfterTax: number;
    totalBeforeTax: number;
    stockTotalBeforeTax: number;
    stockTotalAfterTax: number;
    serviceTotalAfterTax: number;
    serviceTotalBeforeTax: number;
    taxPercentage?: number | null;
  };
  user?: {
    __typename: 'UserNode';
    username: string;
    email?: string | null;
  } | null;
  lines: {
    __typename: 'InvoiceLineConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'InvoiceLineNode';
      id: string;
      type: Types.InvoiceLineNodeType;
      batch?: string | null;
      expiryDate?: string | null;
      numberOfPacks: number;
      prescribedQuantity?: number | null;
      packSize: number;
      invoiceId: string;
      costPricePerPack: number;
      sellPricePerPack: number;
      note?: string | null;
      totalBeforeTax: number;
      totalAfterTax: number;
      taxPercentage?: number | null;
      itemName: string;
      item: {
        __typename: 'ItemNode';
        id: string;
        name: string;
        code: string;
        unitName?: string | null;
        itemDirections: Array<{
          __typename: 'ItemDirectionNode';
          directions: string;
          id: string;
          itemId: string;
          priority: number;
        }>;
      };
      location?: {
        __typename: 'LocationNode';
        id: string;
        name: string;
        code: string;
        onHold: boolean;
      } | null;
      stockLine?: {
        __typename: 'StockLineNode';
        id: string;
        itemId: string;
        batch?: string | null;
        availableNumberOfPacks: number;
        totalNumberOfPacks: number;
        onHold: boolean;
        sellPricePerPack: number;
        costPricePerPack: number;
        packSize: number;
        expiryDate?: string | null;
        item: {
          __typename: 'ItemNode';
          name: string;
          code: string;
          itemDirections: Array<{
            __typename: 'ItemDirectionNode';
            directions: string;
            id: string;
            itemId: string;
            priority: number;
          }>;
        };
      } | null;
    }>;
  };
  patient?: {
    __typename: 'PatientNode';
    id: string;
    name: string;
    code: string;
    gender?: Types.GenderType | null;
    dateOfBirth?: string | null;
    isDeceased: boolean;
  } | null;
  clinician?: {
    __typename: 'ClinicianNode';
    id: string;
    firstName?: string | null;
    lastName: string;
  } | null;
  currency?: {
    __typename: 'CurrencyNode';
    id: string;
    code: string;
    rate: number;
    isHomeCurrency: boolean;
  } | null;
  diagnosis?: {
    __typename: 'DiagnosisNode';
    id: string;
    code: string;
    description: string;
  } | null;
  insurancePolicy?: {
    __typename: 'InsurancePolicyNode';
    policyNumber: string;
    insuranceProviders?: {
      __typename: 'InsuranceProviderNode';
      providerName: string;
    } | null;
  } | null;
  store?: { __typename: 'StoreNode'; id: string } | null;
};

export type PrescriptionLineFragment = {
  __typename: 'InvoiceLineNode';
  id: string;
  type: Types.InvoiceLineNodeType;
  batch?: string | null;
  expiryDate?: string | null;
  numberOfPacks: number;
  prescribedQuantity?: number | null;
  packSize: number;
  invoiceId: string;
  costPricePerPack: number;
  sellPricePerPack: number;
  note?: string | null;
  totalBeforeTax: number;
  totalAfterTax: number;
  taxPercentage?: number | null;
  itemName: string;
  item: {
    __typename: 'ItemNode';
    id: string;
    name: string;
    code: string;
    unitName?: string | null;
    itemDirections: Array<{
      __typename: 'ItemDirectionNode';
      directions: string;
      id: string;
      itemId: string;
      priority: number;
    }>;
  };
  location?: {
    __typename: 'LocationNode';
    id: string;
    name: string;
    code: string;
    onHold: boolean;
  } | null;
  stockLine?: {
    __typename: 'StockLineNode';
    id: string;
    itemId: string;
    batch?: string | null;
    availableNumberOfPacks: number;
    totalNumberOfPacks: number;
    onHold: boolean;
    sellPricePerPack: number;
    costPricePerPack: number;
    packSize: number;
    expiryDate?: string | null;
    item: {
      __typename: 'ItemNode';
      name: string;
      code: string;
      itemDirections: Array<{
        __typename: 'ItemDirectionNode';
        directions: string;
        id: string;
        itemId: string;
        priority: number;
      }>;
    };
  } | null;
};

export type ItemDirectionFragment = {
  __typename: 'ItemDirectionNode';
  directions: string;
  id: string;
  itemId: string;
  priority: number;
};

export type PartialPrescriptionLineFragment = {
  __typename: 'StockLineNode';
  id: string;
  itemId: string;
  availableNumberOfPacks: number;
  totalNumberOfPacks: number;
  onHold: boolean;
  costPricePerPack: number;
  sellPricePerPack: number;
  packSize: number;
  expiryDate?: string | null;
  item: {
    __typename: 'ItemNode';
    name: string;
    code: string;
    itemDirections: Array<{
      __typename: 'ItemDirectionNode';
      directions: string;
      id: string;
      itemId: string;
      priority: number;
    }>;
  };
  location?: {
    __typename: 'LocationNode';
    id: string;
    name: string;
    code: string;
    onHold: boolean;
  } | null;
};

export type PrescriptionsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;

export type PrescriptionsQuery = {
  __typename: 'Queries';
  invoices: {
    __typename: 'InvoiceConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'InvoiceNode';
      theirReference?: string | null;
      comment?: string | null;
      createdDatetime: string;
      pickedDatetime?: string | null;
      verifiedDatetime?: string | null;
      cancelledDatetime?: string | null;
      id: string;
      invoiceNumber: number;
      otherPartyName: string;
      clinicianId?: string | null;
      type: Types.InvoiceNodeType;
      status: Types.InvoiceNodeStatus;
      colour?: string | null;
      nameInsuranceJoinId?: string | null;
      insuranceDiscountAmount?: number | null;
      insuranceDiscountPercentage?: number | null;
      currencyRate: number;
      diagnosisId?: string | null;
      programId?: string | null;
      prescriptionDate?: string | null;
      patientId: string;
      pricing: {
        __typename: 'PricingNode';
        totalAfterTax: number;
        totalBeforeTax: number;
        stockTotalBeforeTax: number;
        stockTotalAfterTax: number;
        serviceTotalAfterTax: number;
        serviceTotalBeforeTax: number;
        taxPercentage?: number | null;
      };
      user?: {
        __typename: 'UserNode';
        username: string;
        email?: string | null;
      } | null;
      lines: {
        __typename: 'InvoiceLineConnector';
        totalCount: number;
        nodes: Array<{
          __typename: 'InvoiceLineNode';
          id: string;
          type: Types.InvoiceLineNodeType;
          batch?: string | null;
          expiryDate?: string | null;
          numberOfPacks: number;
          prescribedQuantity?: number | null;
          packSize: number;
          invoiceId: string;
          costPricePerPack: number;
          sellPricePerPack: number;
          note?: string | null;
          totalBeforeTax: number;
          totalAfterTax: number;
          taxPercentage?: number | null;
          itemName: string;
          item: {
            __typename: 'ItemNode';
            id: string;
            name: string;
            code: string;
            unitName?: string | null;
            itemDirections: Array<{
              __typename: 'ItemDirectionNode';
              directions: string;
              id: string;
              itemId: string;
              priority: number;
            }>;
          };
          location?: {
            __typename: 'LocationNode';
            id: string;
            name: string;
            code: string;
            onHold: boolean;
          } | null;
          stockLine?: {
            __typename: 'StockLineNode';
            id: string;
            itemId: string;
            batch?: string | null;
            availableNumberOfPacks: number;
            totalNumberOfPacks: number;
            onHold: boolean;
            sellPricePerPack: number;
            costPricePerPack: number;
            packSize: number;
            expiryDate?: string | null;
            item: {
              __typename: 'ItemNode';
              name: string;
              code: string;
              itemDirections: Array<{
                __typename: 'ItemDirectionNode';
                directions: string;
                id: string;
                itemId: string;
                priority: number;
              }>;
            };
          } | null;
        }>;
      };
      patient?: {
        __typename: 'PatientNode';
        id: string;
        name: string;
        code: string;
        gender?: Types.GenderType | null;
        dateOfBirth?: string | null;
        isDeceased: boolean;
      } | null;
      clinician?: {
        __typename: 'ClinicianNode';
        id: string;
        firstName?: string | null;
        lastName: string;
      } | null;
      currency?: {
        __typename: 'CurrencyNode';
        id: string;
        code: string;
        rate: number;
        isHomeCurrency: boolean;
      } | null;
      diagnosis?: {
        __typename: 'DiagnosisNode';
        id: string;
        code: string;
        description: string;
      } | null;
      insurancePolicy?: {
        __typename: 'InsurancePolicyNode';
        policyNumber: string;
        insuranceProviders?: {
          __typename: 'InsuranceProviderNode';
          providerName: string;
        } | null;
      } | null;
      store?: { __typename: 'StoreNode'; id: string } | null;
    }>;
  };
};

export type PrescriptionByNumberQueryVariables = Types.Exact<{
  invoiceNumber: Types.Scalars['Int']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type PrescriptionByNumberQuery = {
  __typename: 'Queries';
  invoiceByNumber:
    | {
        __typename: 'InvoiceNode';
        comment?: string | null;
        createdDatetime: string;
        pickedDatetime?: string | null;
        verifiedDatetime?: string | null;
        cancelledDatetime?: string | null;
        id: string;
        invoiceNumber: number;
        otherPartyName: string;
        clinicianId?: string | null;
        type: Types.InvoiceNodeType;
        status: Types.InvoiceNodeStatus;
        colour?: string | null;
        nameInsuranceJoinId?: string | null;
        insuranceDiscountAmount?: number | null;
        insuranceDiscountPercentage?: number | null;
        currencyRate: number;
        theirReference?: string | null;
        diagnosisId?: string | null;
        programId?: string | null;
        prescriptionDate?: string | null;
        patientId: string;
        pricing: {
          __typename: 'PricingNode';
          totalAfterTax: number;
          totalBeforeTax: number;
          stockTotalBeforeTax: number;
          stockTotalAfterTax: number;
          serviceTotalAfterTax: number;
          serviceTotalBeforeTax: number;
          taxPercentage?: number | null;
        };
        user?: {
          __typename: 'UserNode';
          username: string;
          email?: string | null;
        } | null;
        lines: {
          __typename: 'InvoiceLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'InvoiceLineNode';
            id: string;
            type: Types.InvoiceLineNodeType;
            batch?: string | null;
            expiryDate?: string | null;
            numberOfPacks: number;
            prescribedQuantity?: number | null;
            packSize: number;
            invoiceId: string;
            costPricePerPack: number;
            sellPricePerPack: number;
            note?: string | null;
            totalBeforeTax: number;
            totalAfterTax: number;
            taxPercentage?: number | null;
            itemName: string;
            item: {
              __typename: 'ItemNode';
              id: string;
              name: string;
              code: string;
              unitName?: string | null;
              itemDirections: Array<{
                __typename: 'ItemDirectionNode';
                directions: string;
                id: string;
                itemId: string;
                priority: number;
              }>;
            };
            location?: {
              __typename: 'LocationNode';
              id: string;
              name: string;
              code: string;
              onHold: boolean;
            } | null;
            stockLine?: {
              __typename: 'StockLineNode';
              id: string;
              itemId: string;
              batch?: string | null;
              availableNumberOfPacks: number;
              totalNumberOfPacks: number;
              onHold: boolean;
              sellPricePerPack: number;
              costPricePerPack: number;
              packSize: number;
              expiryDate?: string | null;
              item: {
                __typename: 'ItemNode';
                name: string;
                code: string;
                itemDirections: Array<{
                  __typename: 'ItemDirectionNode';
                  directions: string;
                  id: string;
                  itemId: string;
                  priority: number;
                }>;
              };
            } | null;
          }>;
        };
        patient?: {
          __typename: 'PatientNode';
          id: string;
          name: string;
          code: string;
          gender?: Types.GenderType | null;
          dateOfBirth?: string | null;
          isDeceased: boolean;
        } | null;
        clinician?: {
          __typename: 'ClinicianNode';
          id: string;
          firstName?: string | null;
          lastName: string;
        } | null;
        currency?: {
          __typename: 'CurrencyNode';
          id: string;
          code: string;
          rate: number;
          isHomeCurrency: boolean;
        } | null;
        diagnosis?: {
          __typename: 'DiagnosisNode';
          id: string;
          code: string;
          description: string;
        } | null;
        insurancePolicy?: {
          __typename: 'InsurancePolicyNode';
          policyNumber: string;
          insuranceProviders?: {
            __typename: 'InsuranceProviderNode';
            providerName: string;
          } | null;
        } | null;
        store?: { __typename: 'StoreNode'; id: string } | null;
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

export type PrescriptionByIdQueryVariables = Types.Exact<{
  invoiceId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;

export type PrescriptionByIdQuery = {
  __typename: 'Queries';
  invoice:
    | {
        __typename: 'InvoiceNode';
        comment?: string | null;
        createdDatetime: string;
        pickedDatetime?: string | null;
        verifiedDatetime?: string | null;
        cancelledDatetime?: string | null;
        id: string;
        invoiceNumber: number;
        otherPartyName: string;
        clinicianId?: string | null;
        type: Types.InvoiceNodeType;
        status: Types.InvoiceNodeStatus;
        colour?: string | null;
        nameInsuranceJoinId?: string | null;
        insuranceDiscountAmount?: number | null;
        insuranceDiscountPercentage?: number | null;
        currencyRate: number;
        theirReference?: string | null;
        diagnosisId?: string | null;
        programId?: string | null;
        prescriptionDate?: string | null;
        patientId: string;
        pricing: {
          __typename: 'PricingNode';
          totalAfterTax: number;
          totalBeforeTax: number;
          stockTotalBeforeTax: number;
          stockTotalAfterTax: number;
          serviceTotalAfterTax: number;
          serviceTotalBeforeTax: number;
          taxPercentage?: number | null;
        };
        user?: {
          __typename: 'UserNode';
          username: string;
          email?: string | null;
        } | null;
        lines: {
          __typename: 'InvoiceLineConnector';
          totalCount: number;
          nodes: Array<{
            __typename: 'InvoiceLineNode';
            id: string;
            type: Types.InvoiceLineNodeType;
            batch?: string | null;
            expiryDate?: string | null;
            numberOfPacks: number;
            prescribedQuantity?: number | null;
            packSize: number;
            invoiceId: string;
            costPricePerPack: number;
            sellPricePerPack: number;
            note?: string | null;
            totalBeforeTax: number;
            totalAfterTax: number;
            taxPercentage?: number | null;
            itemName: string;
            item: {
              __typename: 'ItemNode';
              id: string;
              name: string;
              code: string;
              unitName?: string | null;
              itemDirections: Array<{
                __typename: 'ItemDirectionNode';
                directions: string;
                id: string;
                itemId: string;
                priority: number;
              }>;
            };
            location?: {
              __typename: 'LocationNode';
              id: string;
              name: string;
              code: string;
              onHold: boolean;
            } | null;
            stockLine?: {
              __typename: 'StockLineNode';
              id: string;
              itemId: string;
              batch?: string | null;
              availableNumberOfPacks: number;
              totalNumberOfPacks: number;
              onHold: boolean;
              sellPricePerPack: number;
              costPricePerPack: number;
              packSize: number;
              expiryDate?: string | null;
              item: {
                __typename: 'ItemNode';
                name: string;
                code: string;
                itemDirections: Array<{
                  __typename: 'ItemDirectionNode';
                  directions: string;
                  id: string;
                  itemId: string;
                  priority: number;
                }>;
              };
            } | null;
          }>;
        };
        patient?: {
          __typename: 'PatientNode';
          id: string;
          name: string;
          code: string;
          gender?: Types.GenderType | null;
          dateOfBirth?: string | null;
          isDeceased: boolean;
        } | null;
        clinician?: {
          __typename: 'ClinicianNode';
          id: string;
          firstName?: string | null;
          lastName: string;
        } | null;
        currency?: {
          __typename: 'CurrencyNode';
          id: string;
          code: string;
          rate: number;
          isHomeCurrency: boolean;
        } | null;
        diagnosis?: {
          __typename: 'DiagnosisNode';
          id: string;
          code: string;
          description: string;
        } | null;
        insurancePolicy?: {
          __typename: 'InsurancePolicyNode';
          policyNumber: string;
          insuranceProviders?: {
            __typename: 'InsuranceProviderNode';
            providerName: string;
          } | null;
        } | null;
        store?: { __typename: 'StoreNode'; id: string } | null;
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

export type InsertPrescriptionMutationVariables = Types.Exact<{
  input: Types.InsertPrescriptionInput;
  storeId: Types.Scalars['String']['input'];
}>;

export type InsertPrescriptionMutation = {
  __typename: 'Mutations';
  insertPrescription: {
    __typename: 'InvoiceNode';
    id: string;
    invoiceNumber: number;
  };
};

export type UpsertPrescriptionMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchPrescriptionInput;
}>;

export type UpsertPrescriptionMutation = {
  __typename: 'Mutations';
  batchPrescription: {
    __typename: 'BatchPrescriptionResponse';
    deletePrescriptionLines?: Array<{
      __typename: 'DeletePrescriptionLineResponseWithId';
      id: string;
      response:
        | {
            __typename: 'DeletePrescriptionLineError';
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
    deletePrescriptions?: Array<{
      __typename: 'DeletePrescriptionResponseWithId';
      id: string;
      response:
        | {
            __typename: 'DeletePrescriptionError';
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
    insertPrescriptionLines?: Array<{
      __typename: 'InsertPrescriptionLineResponseWithId';
      id: string;
      response:
        | {
            __typename: 'InsertPrescriptionLineError';
            error:
              | { __typename: 'CannotEditInvoice'; description: string }
              | { __typename: 'ForeignKeyError'; description: string }
              | { __typename: 'LocationIsOnHold'; description: string }
              | { __typename: 'LocationNotFound'; description: string }
              | {
                  __typename: 'NotEnoughStockForReduction';
                  description: string;
                }
              | {
                  __typename: 'StockLineAlreadyExistsInInvoice';
                  description: string;
                }
              | { __typename: 'StockLineIsOnHold'; description: string };
          }
        | { __typename: 'InvoiceLineNode' };
    }> | null;
    insertPrescriptions?: Array<{
      __typename: 'InsertPrescriptionResponseWithId';
      id: string;
    }> | null;
    updatePrescriptionLines?: Array<{
      __typename: 'UpdatePrescriptionLineResponseWithId';
      id: string;
      response:
        | { __typename: 'InvoiceLineNode' }
        | {
            __typename: 'UpdatePrescriptionLineError';
            error:
              | { __typename: 'CannotEditInvoice'; description: string }
              | {
                  __typename: 'ForeignKeyError';
                  description: string;
                  key: Types.ForeignKey;
                }
              | { __typename: 'LocationIsOnHold'; description: string }
              | { __typename: 'LocationNotFound'; description: string }
              | {
                  __typename: 'NotEnoughStockForReduction';
                  description: string;
                  batch:
                    | {
                        __typename: 'NodeError';
                        error:
                          | {
                              __typename: 'DatabaseError';
                              description: string;
                              fullError: string;
                            }
                          | {
                              __typename: 'RecordNotFound';
                              description: string;
                            };
                      }
                    | { __typename: 'StockLineNode' };
                }
              | { __typename: 'RecordNotFound'; description: string }
              | {
                  __typename: 'StockLineAlreadyExistsInInvoice';
                  description: string;
                }
              | { __typename: 'StockLineIsOnHold'; description: string };
          };
    }> | null;
    updatePrescriptions?: Array<{
      __typename: 'UpdatePrescriptionResponseWithId';
      id: string;
      response:
        | { __typename: 'InvoiceNode' }
        | {
            __typename: 'NodeError';
            error:
              | { __typename: 'DatabaseError'; description: string }
              | { __typename: 'RecordNotFound'; description: string };
          }
        | {
            __typename: 'UpdatePrescriptionError';
            error:
              | {
                  __typename: 'CanOnlyChangeToPickedWhenNoUnallocatedLines';
                  description: string;
                }
              | {
                  __typename: 'CannotReverseInvoiceStatus';
                  description: string;
                }
              | { __typename: 'InvalidStockSelection'; description: string }
              | { __typename: 'InvoiceIsNotEditable'; description: string }
              | { __typename: 'RecordNotFound'; description: string };
          };
    }> | null;
    setPrescribedQuantity?: Array<{
      __typename: 'SetPrescribedQuantityWithId';
      id: string;
      response:
        | { __typename: 'InvoiceLineNode' }
        | {
            __typename: 'SetPrescribedQuantityError';
            error: {
              __typename: 'ForeignKeyError';
              description: string;
              key: Types.ForeignKey;
            };
          };
    }> | null;
  };
};

export type DeletePrescriptionsMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  deletePrescriptions:
    | Array<Types.Scalars['String']['input']>
    | Types.Scalars['String']['input'];
}>;

export type DeletePrescriptionsMutation = {
  __typename: 'Mutations';
  batchPrescription: {
    __typename: 'BatchPrescriptionResponse';
    deletePrescriptions?: Array<{
      __typename: 'DeletePrescriptionResponseWithId';
      id: string;
      response:
        | {
            __typename: 'DeletePrescriptionError';
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

export type DeletePrescriptionLinesMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  deletePrescriptionLines:
    | Array<Types.DeletePrescriptionLineInput>
    | Types.DeletePrescriptionLineInput;
}>;

export type DeletePrescriptionLinesMutation = {
  __typename: 'Mutations';
  batchPrescription: {
    __typename: 'BatchPrescriptionResponse';
    deletePrescriptionLines?: Array<{
      __typename: 'DeletePrescriptionLineResponseWithId';
      id: string;
      response:
        | {
            __typename: 'DeletePrescriptionLineError';
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
  };
};

export type HistoricalStockLineFragment = {
  __typename: 'StockLineNode';
  id: string;
  availableNumberOfPacks: number;
  packSize: number;
  item: {
    __typename: 'ItemNode';
    name: string;
    code: string;
    itemDirections: Array<{
      __typename: 'ItemDirectionNode';
      directions: string;
      id: string;
      itemId: string;
      priority: number;
    }>;
  };
};

export type DiagnosisFragment = {
  __typename: 'DiagnosisNode';
  id: string;
  code: string;
  description: string;
};

export type DiagnosesActiveQueryVariables = Types.Exact<{
  [key: string]: never;
}>;

export type DiagnosesActiveQuery = {
  __typename: 'Queries';
  diagnosesActive: Array<{
    __typename: 'DiagnosisNode';
    id: string;
    code: string;
    description: string;
  }>;
};

export type AbbreviationFragment = {
  __typename: 'AbbreviationNode';
  expansion: string;
  id: string;
  text: string;
};

export type AbbreviationsQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.AbbreviationFilterInput>;
}>;

export type AbbreviationsQuery = {
  __typename: 'Queries';
  abbreviations: Array<{
    __typename: 'AbbreviationNode';
    expansion: string;
    id: string;
    text: string;
  }>;
};

export type LabelPrinterSettingsQueryVariables = Types.Exact<{
  [key: string]: never;
}>;

export type LabelPrinterSettingsQuery = {
  __typename: 'Queries';
  labelPrinterSettings?: {
    __typename: 'LabelPrinterSettingNode';
    address: string;
    labelHeight: number;
    labelWidth: number;
    port: number;
  } | null;
};

export const ItemDirectionFragmentDoc = gql`
  fragment ItemDirection on ItemDirectionNode {
    __typename
    directions
    id
    itemId
    priority
  }
`;
export const PrescriptionLineFragmentDoc = gql`
  fragment PrescriptionLine on InvoiceLineNode {
    __typename
    id
    type
    batch
    expiryDate
    numberOfPacks
    prescribedQuantity
    packSize
    invoiceId
    costPricePerPack
    sellPricePerPack
    note
    totalBeforeTax
    totalAfterTax
    taxPercentage
    note
    itemName
    item {
      __typename
      id
      name
      code
      unitName
      itemDirections {
        ...ItemDirection
      }
    }
    location {
      __typename
      id
      name
      code
      onHold
    }
    stockLine {
      __typename
      id
      itemId
      batch
      availableNumberOfPacks
      totalNumberOfPacks
      onHold
      sellPricePerPack
      costPricePerPack
      packSize
      expiryDate
      item {
        name
        code
        itemDirections {
          ...ItemDirection
        }
      }
    }
  }
  ${ItemDirectionFragmentDoc}
`;
export const PrescriptionRowFragmentDoc = gql`
  fragment PrescriptionRow on InvoiceNode {
    __typename
    comment
    createdDatetime
    prescriptionDate: backdatedDatetime
    pickedDatetime
    verifiedDatetime
    cancelledDatetime
    id
    invoiceNumber
    patientId: otherPartyId
    otherPartyName
    clinicianId
    type
    status
    colour
    nameInsuranceJoinId
    insuranceDiscountAmount
    insuranceDiscountPercentage
    pricing {
      __typename
      totalAfterTax
      totalBeforeTax
      stockTotalBeforeTax
      stockTotalAfterTax
      serviceTotalAfterTax
      serviceTotalBeforeTax
      taxPercentage
    }
    currencyRate
    user {
      __typename
      username
      email
    }
    lines {
      __typename
      nodes {
        ...PrescriptionLine
      }
      totalCount
    }
    patient {
      __typename
      id
      name
      code
      gender
      dateOfBirth
      isDeceased
    }
    clinician {
      id
      firstName
      lastName
    }
    currency {
      id
      code
      rate
      isHomeCurrency
    }
    currencyRate
    theirReference
    diagnosisId
    diagnosis {
      id
      code
      description
    }
    programId
    insuranceDiscountAmount
    insuranceDiscountPercentage
    insurancePolicy {
      insuranceProviders {
        providerName
      }
      policyNumber
    }
    store {
      id
    }
  }
  ${PrescriptionLineFragmentDoc}
`;
export const PartialPrescriptionLineFragmentDoc = gql`
  fragment PartialPrescriptionLine on StockLineNode {
    id
    itemId
    availableNumberOfPacks
    totalNumberOfPacks
    onHold
    costPricePerPack
    sellPricePerPack
    packSize
    expiryDate
    item {
      name
      code
      itemDirections {
        ...ItemDirection
      }
    }
    location {
      __typename
      id
      name
      code
      onHold
    }
  }
  ${ItemDirectionFragmentDoc}
`;
export const HistoricalStockLineFragmentDoc = gql`
  fragment historicalStockLine on StockLineNode {
    id
    availableNumberOfPacks
    packSize
    item {
      name
      code
      itemDirections {
        ...ItemDirection
      }
    }
  }
  ${ItemDirectionFragmentDoc}
`;
export const DiagnosisFragmentDoc = gql`
  fragment diagnosis on DiagnosisNode {
    id
    code
    description
  }
`;
export const AbbreviationFragmentDoc = gql`
  fragment Abbreviation on AbbreviationNode {
    __typename
    expansion
    id
    text
  }
`;
export const PrescriptionsDocument = gql`
  query prescriptions(
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
          ...PrescriptionRow
          theirReference
        }
        totalCount
      }
    }
  }
  ${PrescriptionRowFragmentDoc}
`;
export const PrescriptionByNumberDocument = gql`
  query prescriptionByNumber($invoiceNumber: Int!, $storeId: String!) {
    invoiceByNumber(
      invoiceNumber: $invoiceNumber
      storeId: $storeId
      type: PRESCRIPTION
    ) {
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
        ...PrescriptionRow
      }
    }
  }
  ${PrescriptionRowFragmentDoc}
`;
export const PrescriptionByIdDocument = gql`
  query prescriptionById($invoiceId: String!, $storeId: String!) {
    invoice(id: $invoiceId, storeId: $storeId) {
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
        ...PrescriptionRow
      }
    }
  }
  ${PrescriptionRowFragmentDoc}
`;
export const InsertPrescriptionDocument = gql`
  mutation insertPrescription(
    $input: InsertPrescriptionInput!
    $storeId: String!
  ) {
    insertPrescription(storeId: $storeId, input: $input) {
      __typename
      ... on InvoiceNode {
        id
        invoiceNumber
      }
    }
  }
`;
export const UpsertPrescriptionDocument = gql`
  mutation upsertPrescription(
    $storeId: String!
    $input: BatchPrescriptionInput!
  ) {
    batchPrescription(storeId: $storeId, input: $input) {
      __typename
      deletePrescriptionLines {
        id
        response {
          ... on DeletePrescriptionLineError {
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
            id
          }
        }
      }
      deletePrescriptions {
        id
        response {
          ... on DeleteResponse {
            id
          }
          ... on DeletePrescriptionError {
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
        }
      }
      insertPrescriptionLines {
        id
        response {
          ... on InsertPrescriptionLineError {
            __typename
            error {
              description
            }
          }
        }
      }
      insertPrescriptions {
        id
      }
      updatePrescriptionLines {
        id
        response {
          ... on UpdatePrescriptionLineError {
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
              ... on LocationIsOnHold {
                __typename
                description
              }
              ... on LocationNotFound {
                __typename
                description
              }
              ... on NotEnoughStockForReduction {
                __typename
                batch {
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
              ... on StockLineAlreadyExistsInInvoice {
                __typename
                description
              }
              ... on StockLineIsOnHold {
                __typename
                description
              }
            }
          }
        }
      }
      updatePrescriptions {
        id
        response {
          ... on UpdatePrescriptionError {
            __typename
            error {
              __typename
              description
            }
          }
          ... on NodeError {
            __typename
            error {
              description
            }
          }
        }
      }
      setPrescribedQuantity {
        id
        response {
          ... on SetPrescribedQuantityError {
            __typename
            error {
              description
              ... on ForeignKeyError {
                __typename
                description
                key
              }
            }
          }
        }
      }
    }
  }
`;
export const DeletePrescriptionsDocument = gql`
  mutation deletePrescriptions(
    $storeId: String!
    $deletePrescriptions: [String!]!
  ) {
    batchPrescription(
      storeId: $storeId
      input: { deletePrescriptions: $deletePrescriptions }
    ) {
      __typename
      deletePrescriptions {
        id
        response {
          ... on DeletePrescriptionError {
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
            id
          }
        }
      }
    }
  }
`;
export const DeletePrescriptionLinesDocument = gql`
  mutation deletePrescriptionLines(
    $storeId: String!
    $deletePrescriptionLines: [DeletePrescriptionLineInput!]!
  ) {
    batchPrescription(
      storeId: $storeId
      input: { deletePrescriptionLines: $deletePrescriptionLines }
    ) {
      deletePrescriptionLines {
        id
        response {
          ... on DeletePrescriptionLineError {
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
            id
          }
        }
      }
    }
  }
`;
export const DiagnosesActiveDocument = gql`
  query diagnosesActive {
    diagnosesActive {
      ...diagnosis
    }
  }
  ${DiagnosisFragmentDoc}
`;
export const AbbreviationsDocument = gql`
  query abbreviations($filter: AbbreviationFilterInput) {
    abbreviations(filter: $filter) {
      ... on AbbreviationNode {
        ...Abbreviation
      }
    }
  }
  ${AbbreviationFragmentDoc}
`;
export const LabelPrinterSettingsDocument = gql`
  query labelPrinterSettings {
    labelPrinterSettings {
      __typename
      address
      labelHeight
      labelWidth
      port
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
    prescriptions(
      variables: PrescriptionsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<PrescriptionsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PrescriptionsQuery>(PrescriptionsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'prescriptions',
        'query',
        variables
      );
    },
    prescriptionByNumber(
      variables: PrescriptionByNumberQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<PrescriptionByNumberQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PrescriptionByNumberQuery>(
            PrescriptionByNumberDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'prescriptionByNumber',
        'query',
        variables
      );
    },
    prescriptionById(
      variables: PrescriptionByIdQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<PrescriptionByIdQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<PrescriptionByIdQuery>(
            PrescriptionByIdDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'prescriptionById',
        'query',
        variables
      );
    },
    insertPrescription(
      variables: InsertPrescriptionMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<InsertPrescriptionMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertPrescriptionMutation>(
            InsertPrescriptionDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertPrescription',
        'mutation',
        variables
      );
    },
    upsertPrescription(
      variables: UpsertPrescriptionMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<UpsertPrescriptionMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpsertPrescriptionMutation>(
            UpsertPrescriptionDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'upsertPrescription',
        'mutation',
        variables
      );
    },
    deletePrescriptions(
      variables: DeletePrescriptionsMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<DeletePrescriptionsMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeletePrescriptionsMutation>(
            DeletePrescriptionsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deletePrescriptions',
        'mutation',
        variables
      );
    },
    deletePrescriptionLines(
      variables: DeletePrescriptionLinesMutationVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<DeletePrescriptionLinesMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeletePrescriptionLinesMutation>(
            DeletePrescriptionLinesDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deletePrescriptionLines',
        'mutation',
        variables
      );
    },
    diagnosesActive(
      variables?: DiagnosesActiveQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<DiagnosesActiveQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DiagnosesActiveQuery>(
            DiagnosesActiveDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'diagnosesActive',
        'query',
        variables
      );
    },
    abbreviations(
      variables?: AbbreviationsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<AbbreviationsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<AbbreviationsQuery>(AbbreviationsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'abbreviations',
        'query',
        variables
      );
    },
    labelPrinterSettings(
      variables?: LabelPrinterSettingsQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders
    ): Promise<LabelPrinterSettingsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<LabelPrinterSettingsQuery>(
            LabelPrinterSettingsDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'labelPrinterSettings',
        'query',
        variables
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
