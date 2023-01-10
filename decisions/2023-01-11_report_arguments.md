# Report arguments

- _Date_: 2023-01-1
- _Deciders_:
- _Status_:
- _Outcome_:

## Context

Currently, a report has the following parameters (See `fetch_data` in `graphql/reports/src/printing.rs`):

- `store_id`
- `entity_id` e.g. stocktake id, invoice id or patient id.

In general, reports can have additional parameters such as:

- Date or Date range
- Filter parameters
- ...

There is currently no way to capture these parameters in the UI and then pass them on to the report generation.

## Options

### Option 1 - Customizable arguments captured through a UI schema

In this option reports arguments are retrieved by the FE through a fully customizable UI schema.
The UI schema (e.g. JSONForms) will return a data object with the report arguments.
This data object is directly passed on to the report query.

The UI schema can be stored in the existing `form_schema` table.
The `report` table would need a new `arguments_schema_id` column to refer to the UI schema.
If an `argument_schema_id` is specified for a report the FE has to display the UI for this schema and pass the so obtained arguments to the report generation.

_Pros:_

- no need to predefined arguments like Date or Date range
- no need to define an argument config
- allows us to have very specific arguments for very specific use-cases

_Cons:_

- Defining UI schema is more involved. (Common UI schema for common argument could be reused though?)
