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

## Custom Error Codes

```TypeScript
enum CustomErrorCodes {
  // General
  NoDatabaseConnection = "NO_DATABASE_CONNECTION",
  // Pagination
  OffsetBelowZero = "OFFSET_BELOW_ZERO",
  FirstNotInRange = "FIRST_NOT_IN_RANGE",
  // Singular query
  RecordNotFound = "RECORD_NOT_FOUND",
  // Customer Invoice
  OtherPartyIdNotFound = "OTHER_PARTY_ID_NOT_FOUND",
  OtherPartyNotACustomerOfThisStore = "OTHER_PARTY_NOT_A_CUSTOMER_OF_THIS_STORE",
  OtherPartyCannotBeThisStore = "OTHER_PARTY_CANNOT_BE_THIS_STORE",
  DatabaseTransactionValidationError = "DATABASE_TRANSACTION_VALIDATION_ERROR",
  OtherPartyIdMissing = "OTHER_PARTY_ID_MISSING",
  IdPresentInInsertInvoiceLine = "ID_PRESENT_IN_INSERT_INVOICE_LINE",
  FinalisedInvoiceIsNotEditable = "FINALISED_INVOICE_IS_NOT_EDITABLE",
  CannotChangeStatusBackToDraft = "CANNOT_CHANGE_STATUS_BACK_TO_DRAFT",
  NumberOfPacksCannotBeNegative = "NUMBER_OF_PACKS_CANNOT_BE_NEGATIVE",
  NumberOfPacksMissingInInvoiceLine = "NUMBER_OF_PACKS_MISSING_IN_INVOICE_LINE",
  BatchReductionBelowZero = "BATCH_REDUCTION_BELOW_ZERO",
  ItemIdMissingInInvoiceLine = "ITEM_ID_MISSING_IN_INVOICE_LINE",
  StockLineIdMissingInInvoiceLine =  "STOCK_LINE_ID_MISSING_IN_INVOICE_LINE"
}
```

## General
```TypeScript
interface DatabaseConnectionError extends CustomError {
  code: CustomErrorCodes.NoDatabaseConnection,
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

## [CUSTOMER INVOICE](/docs/api/mutations/#customer-invoice)

#### Customer Invoice Common 

```TypeScript
interface OtherPartyIdNotFound extends CustomError {
  code: CustomErrorCodes.OtherPartyIdNotFound,
  otherPartyId: string,
}
```

```TypeScript
interface OtherPartyNotACustomerOfThisStore extends CustomError {
  code: CustomErrorCodes.OtherPartyNotACustomerOfThisStore,
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
interface DatabaseTransactionValidationError extends CustomError {
  code: CustomErrorCodes.DatabaseTransactionValidationError,
  databaseMessage: string,
}
```

### Customer Invoice Insert 

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

### Customer Invoice Update 

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


## [CUSTOMER INVOICE LINES](/docs/api/mutations/#customer-invoice)

#### Customer Invoice Line Common

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
}
```

#### Customer Invoice Line Insert

```TypeScript
interface ItemIdMissingInInvoiceLine extends CustomError {
  code: CustomErrorCodes.ItemIdMissingInInvoiceLine,
  invoiceLineId: string
}
```

```TypeScript
interface StockLineIdMissingInInvoiceLine extends CustomError {
  code: CustomErrorCodes.StockLineIdMissingInInvoiceLine,
  invoiceLineId: string
}
```
