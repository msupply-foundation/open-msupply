+++
title = "Custom Errors"
description = "Full List of Errors"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 5
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++

[Error pattern section](/docs/api/patterns/#errors) describe the full shape of a custom error, errors listed here are all possible extensions of `CustomError`

_{TODO can we export custom error shapes in GraphQL schema ?}_

## Custom Error Codes

```TypeScript
enum CustomErrorCodes {
  // General
  NoDatabaseConnection = "NO_DATABASE_CONNECTION",
  // General Mutations
  DatabaseTransactionValidationError = "DATABASE_TRANSACTION_VALIDATION_ERROR",
  // Pagination
  OffsetBelowZero = "OFFSET_BELOW_ZERO",
  FirstNotInRange = "FIRST_NOT_IN_RANGE",
  // Singular query
  RecordNotFound = "RECORD_NOT_FOUND",
  // Customer and Supplier Invoice Mutation
  OtherPartyIdNotFound = "OTHER_PARTY_ID_NOT_FOUND",
  OtherPartyCannotBeThisStore = "OTHER_PARTY_CANNOT_BE_THIS_STORE",
  OtherPartyIdMissing = "OTHER_PARTY_ID_MISSING",
  IdPresentInInsertInvoiceLine = "ID_PRESENT_IN_INSERT_INVOICE_LINE",
  FinalisedInvoiceIsNotEditable = "FINALISED_INVOICE_IS_NOT_EDITABLE",
  CannotChangeStatusBackToDraft = "CANNOT_CHANGE_STATUS_BACK_TO_DRAFT",
  CanOnlyEditInvoicesInLoggedInStore = "CAN_ONLY_EDIT_INVOICE_IN_LOGGED_IN_STORE",
  // Customer Invoice Mutation
  OtherPartyNotACustomerOfThisStore = "OTHER_PARTY_NOT_A_CUSTOMER_OF_THIS_STORE",
  // Supplier Invoice Mutation
  OtherPartyNotASupplierOfThisStore = "OTHER_PARTY_NOT_A_SUPPLIER_OF_THIS_STORE",
  // Customer Invoice and Supplier Invoice Line Mutation
  NumberOfPacksCannotBeNegative = "NUMBER_OF_PACKS_CANNOT_BE_NEGATIVE",
  NumberOfPacksMissingInInvoiceLine = "NUMBER_OF_PACKS_MISSING_IN_INVOICE_LINE",
  ItemIdMissingInInvoiceLine = "ITEM_ID_MISSING_IN_INVOICE_LINE",
  // Customer Invoice Line Mutation
  ItemIdDoesNotMatchStockLineId = "ITEM_ID_DOES_NOT_MATCH_STOCK_LINE_ID",
  StockLineIdMissingInInvoiceLine =  "STOCK_LINE_ID_MISSING_IN_INVOICE_LINE"
  BatchReductionBelowZero = "BATCH_REDUCTION_BELOW_ZERO",
  // Supplier Invoice Line Mutation
  CannotDeleteReservedBatch = "CANNOT_DELETE_RESERVED_BATCH",
  PriceFieldCannotBeNegative = "PRICE_FIELD_CANNOT_BE_NEGATIVE",
  PackSizeMustBeAboveZero = "PACK_SIZE_MUST_BE_ABOVE_ZERO",
  ReservedSupplierInvoiceLineIsNotEditable = "RESERVED_SUPPLIER_INVOICE_LINE_IS_NOT_EDITABLE",
}
```

## General
```TypeScript
interface DatabaseConnectionError extends CustomError {
  code: CustomErrorCodes.NoDatabaseConnection,
}
```

## General Mutations

```TypeScript
interface DatabaseTransactionValidationError extends CustomError {
  code: CustomErrorCodes.DatabaseTransactionValidationError,
  databaseMessage: string,
}
```

## Pagination

```TypeScript
interface OffsetError extends CustomError {
  code: CustomErrorCodes.OffsetBelowZero,
  // Offset in sort argument
  first: number
}
```
```TypeScript
interface FirstError extends CustomError {
  code: CustomErrorCodes.FirstNotInRange,
  // First in sort argument
  first: number
  min: 1
  // MAX_PAGE_SIZE for list query
  max: number
}
```

## Singular Query

```TypeScript
interface RecordNotFoundError extends CustomError {
  code: CustomErrorCodes.RecordNotFound,
  specifiedField: string,
}
```

## [Customer And Supplier Invoice Mutation](/docs/api/mutations/#mutations)

#### Insert And Update {#customer-and-supplier-invoice-insert-and-update}

```TypeScript
interface OtherPartyIdNotFound extends CustomError {
  code: CustomErrorCodes.OtherPartyIdNotFound,
  otherPartyId: string,
}
```

```TypeScript
interface OtherPartyCannotBeThisStore extends CustomError {
  code: CustomErrorCodes.OtherPartyCannotBeThisStore,
  otherPartyId: string,
}
```

```TypeScript
interface CanOnlyEditInvoicesInLoggedInStore extends CustomError {
  code: CustomErrorCodes.CanOnlyEditInvoicesInLoggedInStore,
  invoiceStoreId: string,
  sessionStoreId: string
}
```

#### Insert {#customer-and-supplier-invoice-insert}

```TypeScript
interface OtherPartyIdMissing extends CustomError {
  code: CustomErrorCodes.OtherPartyIdMissing,
}
```

```TypeScript
interface IdPresentInInsertInvoiceLine  extends CustomError {
  code: CustomErrorCodes.IdPresentInInsertInvoiceLine,
  invoiceLineId: string,
}
```

#### Update

```TypeScript
interface FinalisedInvoiceIsNotEditable extends CustomError {
  code: CustomErrorCodes.FinalisedInvoiceIsNotEditable
}
```

```TypeScript
interface CannotChangeStatusBackToDraft extends CustomError {
  code: CustomErrorCodes.CannotChangeStatusBackToDraft
}
```

## [Customer Invoice Mutation](/docs/api/mutations/#customer-invoice)

#### Insert and Update

```TypeScript
interface OtherPartyNotACustomerOfThisStore extends CustomError {
  code: CustomErrorCodes.OtherPartyNotACustomerOfThisStore,
  otherPartyId: string,
}
```

## [Supplier Invoice Mutation](/docs/api/mutations/#SUPPLIER-invoice)

Also see [CannotDeleteReservedBatch](/docs/api/custom-errors/#supplier-invoice-line-delete)

#### Insert And Update

```TypeScript
interface OtherPartyNotASupplierOfThisStore extends CustomError {
  code: CustomErrorCodes.OtherPartyNotASupplierOfThisStore,
  otherPartyId: string,
}
```

## [Customer And Supplier Invoice Line Mutation](/docs/api/mutations/#mutation)

#### Insert and Update

```TypeScript
interface NumberOfPacksCannotBeNegative extends CustomError {
  code: CustomErrorCodes.NumberOfPacksCannotBeNegative,
  invoiceLineId: string
}
// {TODO can this be delegated to async-graphql?}
```

```TypeScript
interface NumberOfPacksMissingInInvoiceLine extends CustomError {
  code: CustomErrorCodes.NumberOfPacksMissingInInvoiceLine,
  invoiceLineId: string
}
```

#### Insert

```TypeScript
interface ItemIdMissingInInvoiceLine extends CustomError {
  code: CustomErrorCodes.ItemIdMissingInInvoiceLine,
  invoiceLineId: string
}
```

## [Customer Invoice Mutation](/docs/api/mutations/#customer-invoice-line)

#### Insert and Update

```TypeScript
interface ItemIdDoesNotMatchStockLineId extends CustomError {
  code: CustomErrorCodes.ItemIdDoesNotMatchStockLineId,
  stockLineId: string
  stockLineItemId: string
  itemId: string
}
```

#### Insert

```TypeScript
interface StockLineIdMissingInInvoiceLine extends CustomError {
  code: CustomErrorCodes.StockLineIdMissingInInvoiceLine,
  invoiceLineId: string
}
```

#### Update

```TypeScript
interface BatchReductionBelowZero  extends CustomError {
  code: CustomErrorCodes.BatchReductionBelowZero,
  invoiceLineId: string,
  stockLineId: string,
  // As specified in mutation
  currentNumberOfPacks: number,
  // stockLine.availableNumberOfPacks (A)
  availableNumberOfPacks: number,
  // before mutation invoiceLine.numberOfPacks (B)
  previousReductionNumberOfPacks: number,
  // B + A
  maxAllowableNumberOfPacks: number
  // TOD add references to invoices/lines the stock is reserved in
}
```

## [Supplier Invoice Line Mutation](/docs/api/mutations/#supplier-invoice-line)

#### Delete {#supplier-invoice-line-delete}

```TypeScript
interface CannotDeleteReservedBatch  extends CustomError {
  code: CustomErrorCodes.CannotDeleteReservedBatch,
  invoiceLineId: string,
  stockLineId: string,
  // TODO add references to invoices/lines the stock is reserved in
}
```

#### Insert and Update

```TypeScript
interface PriceFieldCannotBeNegative extends CustomError {
  code: CustomErrorCodes.PriceFieldCannotBeNegative,
  specifiedField: 'sellPricePerPack' | 'costPricePerPack',
}
```

```TypeScript
interface PackSizeMustBeAboveZero extends CustomError {
  code: CustomErrorCodes.PackSizeMustBeAboveZero,
  otherPartyId: string,
}
```

#### Update

```TypeScript
interface ReservedSupplierInvoiceLineIsNotEditable  extends CustomError {
  code: CustomErrorCodes.ReservedSupplierInvoiceLineIsNotEditable,
  invoiceLineId: string,
  stockLineId: string,
  // TODO add references to invoices/lines the stock is reserved in
}
```

When batch is already used, no changes are allowed to the invoice line 

_{TODO remember for delete: CannotDeleteSupplierWithReservedBatch}_
