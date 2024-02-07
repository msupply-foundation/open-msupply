---
name: Refactor Suggestion
about: Suggest a refactor
title: ""
labels: "refactor, needs triage"
assignees: ""
---

## The suggestion

<!-- Provide a clear and concise description of the suggested change E.g. "Add a new helper function to avoid the need to create service providers in test cases", "Upgrade diesel version to allow async database access", "Create a rust macro to automatically map Graphql and Service layer enums". -->

## Example use case

<!-- EXAMPLE:
We have a lot of enum mapping code that looks like this:

```rust
impl ActivityLogNodeType {
    pub fn from_domain(from: &ActivityLogType) -> ActivityLogNodeType {
        use ActivityLogNodeType as to;
        use ActivityLogType as from;

        match from {
            from::UserLoggedIn => to::UserLoggedIn,
            from::InvoiceCreated => to::InvoiceCreated,
...
            from::SensorLocationChanged => to::SensorLocationChanged,
        }
    }

```

To avoid needing to update this every time we add a new variant to the `ActivityLogType` enum, we could create a macro that automatically maps the variants of the `ActivityLogType` enum to the variants of the `ActivityLogNodeType` enum. This would allow us to write the above code like this:

```rust
impl ActivityLogNodeType {
    map_std_enum!(ActivityLogType, ActivityLogNodeType);
}
```
-->

### Why should we invest time in this?

<!-- Describe the benefits of this change.
Examples:
"This makes it faster and less annoying to add new activity log types, which is a common activity, I estimate that this will save us 1 hour per month."
"This change makes the code easier to test, reducing the risk of introducing bugs in the future."
"This change will make it easier for new developers to understand the codebase, reducing the time it takes to onboard new developers."
"Code will run faster, reducing the time it takes to run our test suite."
-->

### Are there any risks associated with this change?

<!-- highlight any risks the code changes might introduce
Examples:
"The change would involve rewriting our login infrastructure, we'll need extra testing around the login process, and review all our permission mappings"
"This change is low risk, as we expect it's functionality to be covered by existing tests and these tests don't need to change"
"This change might impact frontend code that won't be covered by our existing tests, we'll need to do a full regression test with QA team"
"Introducing async database access might uncover new race conditions or bugs that our test cases don't currently cover"
-->

### How much effort is required?

<!-- Estimate the amount of effort required to implement this change -->
<!--
Examples:
"This change is trivial, it will take less than 1 hour to implement."
"This change is a lot of work potentially weeks of effort, however it will reduce the overall time needed to implement our current task, and will make future tasks easier."
"This change is a lot of work potentially weeks of effort, however once the pattern is established, we can do the refactor piece by piece as we have time available."
-->

### Agreed Solution

<!-- Describe how you expect to do the refactor, this might be updated as the team discusses the approach more fully -->
