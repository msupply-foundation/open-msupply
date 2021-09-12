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
  RecordNotFound = "RECORD_NOT_FOUND"
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