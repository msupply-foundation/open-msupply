// Content of this file is generate but then manually pasted here, see comment in codegen.yaml
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
      [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: string; output: string };
  JSON: { input: any; output: any };
  JSONObject: { input: any; output: any };
  NaiveDate: { input: string; output: string };
  NaiveDateTime: { input: string; output: string };
};

export enum InvoiceNodeType {
  OutboundShipment = "OUTBOUND_SHIPMENT",
  InboundShipment = "INBOUND_SHIPMENT",
  Prescription = "PRESCRIPTION",
  InventoryAddition = "INVENTORY_ADDITION",
  InventoryReduction = "INVENTORY_REDUCTION",
  CustomerReturn = "CUSTOMER_RETURN",
  SupplierReturn = "SUPPLIER_RETURN",
  Repack = "REPACK",
}
