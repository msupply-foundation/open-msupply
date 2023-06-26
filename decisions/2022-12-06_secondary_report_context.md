# Secondary report context

- _Date_: 2022-12-06
- _Deciders_: Andrei, Clemens
- _Status_: Decided
- _Outcome_: Option 2

## Context

For the program modules a single report context is not sufficient.
For example, for all patient program reports the report context would currently be "Patient".
As a result, there would be report entries for all kind of patient program reports in the patient report dropdown list.
This would be confusing if a patient is not enrolled in all available programs.
Furthermore, a print button on a specific program page would include report options that are not applicable for the current program.

Example of the problem, print menu in the patient's HIV program details view would look like:

- `HIV Patient report`
- `TB Patient report` (should not show)
- `Other program Patient report` (should not show)

## Options

### Option 1 - Single context (leave as it is)

_Cons:_

- Reports need to handle cases of missing data, e.g. a HIV report can't assume that there is HIV program data available.
  This would make writing the Tera template much harder since clunky Tera `if` statements are needed.
  (or the print would just fail when selecting the wrong report)

### Option 2 - Secondary dynamic context

Add a `context2` column to the report table.
This new context column would need to be a custom string and not a predefined enum (e.g. programs are user definable)

_Pros:_

- Be able to be more accurate to suggest applicable reports in the UI

_Cons:_

- Would need 4D update, e.g. sync and UI to enter the context2 value

### Option 3 - Use different existing column to store this info?

## Decision

Option 2

However, there is an ongoing discussion about whether or the secondary context should refer to a programs table rather than using a simple string identifier.

_Pros:_

- would provide strong typing on how context2 is used

_Cons:_

- context2 can only be used for programs, other use-cases would require a new column

Another alternative is to have a special programs_report table.

This decision has been deferred till there is a program table implemented.
